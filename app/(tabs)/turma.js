import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE } from "../../components/estilo";
import {
  atualizarTurma,
  buscarTurma,
  criarAluno,
  excluirAluno,
  excluirTurma as excluirTurmaApi,
  importarAlunos,
  lerListaDeChamada,
  listarAlunos,
} from "../../constants/api";

function iniciais(nome) {
  const texto = String(nome ?? "").trim();
  const numero = (texto.match(/\d+/) || [""])[0];
  const letra = (texto.match(/([A-Za-zÀ-ÿ])\s*$/) || ["", ""])[1].toUpperCase();
  if (numero && letra) return numero + letra;

  const palavras = texto.split(/\s+/).filter(Boolean);
  return (
    palavras
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

function chamada(numero) {
  // Sem o guarda, um aluno sem número de chamada saía como "0–": o padStart
  // completava o travessão com um zero.
  if (numero === null || numero === undefined || numero === "") return "–";
  return String(numero).padStart(2, "0");
}

// A coluna `matricula` é VARCHAR(50) e tem índice único. Quando o professor
// não digita uma, o sistema inventa uma que caiba: base 36 encurta o tempo de
// 13 dígitos para 8, e as seis letras de sorteio evitam colisão.
function matriculaProvisoria() {
  const tempo = Date.now().toString(36);
  const sorteio = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `M${tempo}${sorteio}`.slice(0, 50);
}

// Ignora acento, caixa e espaço sobrando ao comparar nomes.
function mesmoNome(a, b) {
  const limpar = (texto) =>
    String(texto ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const limpo = limpar(a);
  return !!limpo && limpo === limpar(b);
}

// Os tipos que a importação aceita. O Android às vezes não identifica o tipo
// de um arquivo vindo do Drive e manda application/octet-stream — por isso o
// servidor também olha a extensão.
const TIPOS_DA_LISTA = [
  "application/pdf",
  "image/*",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  // Sem este, o arquivo que o Android não soube identificar aparece cinza no
  // seletor e o professor não consegue escolher. O servidor olha a extensão,
  // então deixar passar aqui é mais seguro que travar na frente.
  "application/octet-stream",
];

export default function TurmaDetalhe() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const params = useLocalSearchParams();

  const id_turma = Number(params.id || 0);

  const [turma, setTurma] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState("");

  // formulário de adicionar aluno
  const [novoNome, setNovoNome] = useState("");
  const [novaMatricula, setNovaMatricula] = useState("");

  // importação da lista de chamada
  const [listaLida, setListaLida] = useState(null);
  const [marcados, setMarcados] = useState({});

  // modais
  const [editando, setEditando] = useState(null);
  const [alunoParaExcluir, setAlunoParaExcluir] = useState(null);
  const [confirmandoExclusaoTurma, setConfirmandoExclusaoTurma] =
    useState(false);

  const carregar = useCallback(async () => {
    if (!id_turma) {
      setErro("Nenhuma turma foi indicada.");
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const dados = await buscarTurma(id_turma);
      setTurma(dados);

      // O buscarTurma já traz os alunos, mas nem toda versão da API devolve
      // essa lista. Se não vier, busca em separado em vez de mostrar a turma
      // vazia como se não tivesse ninguém.
      const lista = dados.aluno ?? (await listarAlunos(id_turma));
      setAlunos(
        [...lista].sort(
          (a, b) =>
            Number(a.numero_chamada ?? 0) - Number(b.numero_chamada ?? 0),
        ),
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [id_turma]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const proximaChamada =
    alunos.reduce(
      (maior, aluno) => Math.max(maior, Number(aluno.numero_chamada ?? 0)),
      0,
    ) + 1;

  async function adicionarAluno() {
    const nome = novoNome.trim();
    if (!nome || ocupado) return;

    // Antes de criar: esse nome já é de alguém da turma? Dois cadastros da
    // mesma pessoa espalham as notas dela em dois lugares, e isso só aparece
    // no fechamento do bimestre.
    if (alunos.some((aluno) => mesmoNome(aluno.nome, nome))) {
      setErro(`"${nome}" já está nesta turma.`);
      return;
    }

    setOcupado("adicionar");
    setErro("");
    setAviso("");

    try {
      await criarAluno(
        nome,
        novaMatricula.trim() || matriculaProvisoria(),
        proximaChamada,
        id_turma,
      );

      setNovoNome("");
      setNovaMatricula("");
      setAviso(`${nome} entrou na turma.`);
      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  // -------------------------------------------------------------------------
  // IMPORTAR A LISTA DE CHAMADA — primeiro tempo: ler
  //
  // O arquivo vai para o servidor, que devolve os alunos encontrados. Nada é
  // gravado aqui: o que volta é uma proposta, e quem decide é o professor na
  // tela de conferência.
  // -------------------------------------------------------------------------
  async function escolherLista() {
    if (ocupado) return;

    setErro("");
    setAviso("");

    let arquivo;

    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: TIPOS_DA_LISTA,
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) return;

      const escolhido = resultado.assets?.[0];
      if (!escolhido?.uri) {
        setErro("Não consegui ler esse arquivo. Tente outro.");
        return;
      }

      arquivo = {
        uri: escolhido.uri,
        nome: escolhido.name || "chamada",
        mime: escolhido.mimeType || "application/octet-stream",
        objetoWeb: escolhido.file ?? null,
      };
    } catch (e) {
      setErro("Não consegui abrir o seletor de arquivos: " + (e.message || e));
      return;
    }

    setOcupado("lendoLista");

    try {
      const dados = await lerListaDeChamada(id_turma, arquivo);

      // Quem já está na turma vem desmarcado. O professor ainda vê o nome na
      // lista — some-lo seria deixá-lo na dúvida se o arquivo foi lido errado.
      const marcasIniciais = {};
      (dados.alunos || []).forEach((aluno, i) => {
        marcasIniciais[i] = !aluno.ja_existe;
      });

      setMarcados(marcasIniciais);
      setListaLida(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  // Segundo tempo: o professor conferiu e confirmou.
  async function confirmarImportacao() {
    if (!listaLida || ocupado) return;

    const escolhidos = (listaLida.alunos || []).filter((_, i) => marcados[i]);

    if (escolhidos.length === 0) {
      setListaLida(null);
      return;
    }

    setOcupado("importando");
    setErro("");

    try {
      const resultado = await importarAlunos(
        id_turma,
        escolhidos.map((a) => ({
          nome: a.nome,
          matricula: a.matricula,
          numero_chamada: a.numero_chamada,
        })),
      );

      setListaLida(null);

      // O resumo conta as três coisas que o professor precisa saber: quantos
      // entraram, quantos já estavam, e se alguém ficou de fora por erro.
      const partes = [];

      if (resultado.criados > 0) {
        partes.push(
          `${resultado.criados} ${resultado.criados === 1 ? "aluno entrou" : "alunos entraram"} na turma`,
        );
      }

      const jaEstavam = (resultado.ignorados || []).filter(
        (i) => i.motivo === "já está na turma",
      ).length;

      if (jaEstavam > 0) {
        partes.push(`${jaEstavam} já ${jaEstavam === 1 ? "estava" : "estavam"}`);
      }

      const comProblema = (resultado.ignorados || []).filter(
        (i) => i.motivo !== "já está na turma",
      );

      setAviso(partes.join(" · ") || "Nenhum aluno novo.");

      if (comProblema.length > 0) {
        setErro(
          "Não entraram: " +
            comProblema.map((i) => `${i.nome} (${i.motivo})`).join(", "),
        );
      }

      await carregar();
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  function alternarMarcado(indice) {
    setMarcados((atual) => ({ ...atual, [indice]: !atual[indice] }));
  }

  function marcarTodos(valor) {
    const novos = {};
    (listaLida?.alunos || []).forEach((aluno, i) => {
      // Quem já está na turma continua desmarcado mesmo no "marcar todos" —
      // marcar não faria nada (o servidor ignora) e daria a impressão errada
      // de que vai duplicar.
      novos[i] = valor && !aluno.ja_existe;
    });
    setMarcados(novos);
  }

  const totalMarcados = Object.values(marcados).filter(Boolean).length;

  async function removerAluno() {
    if (!alunoParaExcluir || ocupado) return;

    setOcupado("excluirAluno");
    setErro("");
    setAviso("");

    try {
      await excluirAluno(alunoParaExcluir.id_aluno);
      setAlunoParaExcluir(null);
      setAviso(`${alunoParaExcluir.nome} saiu da turma.`);
      await carregar();
    } catch (e) {
      setAlunoParaExcluir(null);
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  async function salvarTurma() {
    if (!editando?.nome.trim() || ocupado) return;

    setOcupado("salvarTurma");
    setErro("");

    try {
      await atualizarTurma(
        id_turma,
        editando.nome.trim(),
        editando.escola.trim(),
      );
      setEditando(null);
      await carregar();
    } catch (e) {
      setEditando(null);
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  async function removerTurma() {
    if (ocupado) return;

    setOcupado("excluirTurma");
    setErro("");

    try {
      await excluirTurmaApi(id_turma);
      setConfirmandoExclusaoTurma(false);
      router.replace("/turmas");
    } catch (e) {
      setConfirmandoExclusaoTurma(false);
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  if (carregando && !turma) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <ActivityIndicator color={COR.marcador} />
          <Text style={styles.textoApoio}>Abrindo a turma...</Text>
        </View>
      </View>
    );
  }

  if (!turma) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <Ionicons
            name="alert-circle-outline"
            size={36}
            color={COR.avisoTexto}
          />
          <Text style={styles.textoApoio}>
            {erro || "Turma não encontrada."}
          </Text>
          <TouchableOpacity
            style={styles.botaoEscuro}
            onPress={() => router.replace("/turmas")}
          >
            <Text style={styles.botaoEscuroTexto}>Ver turmas</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 100 },
        ]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          <TouchableOpacity
            style={styles.voltarLinha}
            activeOpacity={0.7}
            onPress={() => router.replace("/turmas")}
          >
            <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
            <Text
              style={[
                styles.tituloPagina,
                ehDesktop && styles.tituloPaginaDesktop,
              ]}
            >
              Turma
            </Text>
          </TouchableOpacity>

          {/* ------------------------------------------------------- topo */}
          <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
            <View style={styles.topoLinha}>
              <View style={[styles.sigla, ehDesktop && styles.siglaDesktop]}>
                <Text
                  style={[
                    styles.siglaTexto,
                    ehDesktop && styles.siglaTextoDesktop,
                  ]}
                >
                  {iniciais(turma.nome)}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={[
                    styles.nomeTurma,
                    ehDesktop && styles.nomeTurmaDesktop,
                  ]}
                  numberOfLines={1}
                >
                  {turma.nome}
                </Text>
                {!!turma.escola && (
                  <Text
                    style={[
                      styles.subtitulo,
                      ehDesktop && styles.subtituloDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    {turma.escola}
                  </Text>
                )}
                <Text style={[styles.meta, ehDesktop && styles.metaDesktop]}>
                  <Text style={styles.metaForte}>{alunos.length}</Text>{" "}
                  {alunos.length === 1 ? "aluno" : "alunos"} ·{" "}
                  <Text style={styles.metaForte}>{turma.atividades ?? 0}</Text>{" "}
                  {(turma.atividades ?? 0) === 1 ? "atividade" : "atividades"}
                </Text>
              </View>
            </View>

            <View style={styles.acoes}>
              <TouchableOpacity
                style={[styles.botaoAcao, ehDesktop && styles.botaoAcaoDesktop]}
                activeOpacity={0.85}
                onPress={() =>
                  setEditando({
                    nome: turma.nome ?? "",
                    escola: turma.escola ?? "",
                  })
                }
              >
                <Ionicons
                  name="create-outline"
                  size={ehDesktop ? 19 : 17}
                  color={COR.marcador}
                />
                <Text
                  style={[
                    styles.botaoAcaoTexto,
                    ehDesktop && styles.botaoAcaoTextoDesktop,
                  ]}
                >
                  Editar turma
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoAcao,
                  ehDesktop && styles.botaoAcaoDesktop,
                  styles.botaoPerigo,
                ]}
                activeOpacity={0.85}
                onPress={() => setConfirmandoExclusaoTurma(true)}
              >
                <Ionicons
                  name="trash-outline"
                  size={ehDesktop ? 18 : 16}
                  color={COR.perigo}
                />
                <Text
                  style={[
                    styles.botaoAcaoTexto,
                    ehDesktop && styles.botaoAcaoTextoDesktop,
                    { color: COR.perigo },
                  ]}
                >
                  Excluir turma
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {!!erro && <Text style={styles.erroFaixa}>{erro}</Text>}
          {!!aviso && <Text style={styles.avisoFaixa}>{aviso}</Text>}

          {/* -------------------------------------------- adicionar aluno */}
          <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
            <Text
              style={[
                styles.cartaoTitulo,
                ehDesktop && styles.cartaoTituloDesktop,
              ]}
            >
              Adicionar aluno
            </Text>

            {/* A importação vem antes do formulário de propósito: numa turma
                vazia, mandar a lista de chamada resolve tudo de uma vez, e
                digitar 30 nomes um a um é o caminho longo. */}
            <TouchableOpacity
              style={[
                styles.botaoImportar,
                ehDesktop && styles.botaoImportarDesktop,
                !!ocupado && styles.desativado,
              ]}
              activeOpacity={0.85}
              disabled={!!ocupado}
              onPress={escolherLista}
            >
              {ocupado === "lendoLista" ? (
                <ActivityIndicator size="small" color={COR.marcador} />
              ) : (
                <Ionicons
                  name="document-attach-outline"
                  size={ehDesktop ? 19 : 17}
                  color={COR.marcador}
                />
              )}
              <Text
                style={[
                  styles.botaoImportarTexto,
                  ehDesktop && styles.botaoImportarTextoDesktop,
                ]}
              >
                {ocupado === "lendoLista"
                  ? "Lendo a lista..."
                  : "Importar lista de chamada"}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.dica, ehDesktop && styles.dicaDesktop]}>
              PDF, foto, Excel ou CSV. Você confere os nomes antes de salvar.
            </Text>

            <View style={styles.separador}>
              <View style={styles.separadorLinha} />
              <Text style={styles.separadorTexto}>ou um por um</Text>
              <View style={styles.separadorLinha} />
            </View>

            <TextInput
              value={novoNome}
              onChangeText={setNovoNome}
              placeholder="Nome completo"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campo, ehDesktop && styles.campoDesktop]}
              autoCapitalize="words"
              onSubmitEditing={adicionarAluno}
            />

            <TextInput
              value={novaMatricula}
              onChangeText={setNovaMatricula}
              placeholder="Matrícula (opcional)"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campo, ehDesktop && styles.campoDesktop]}
              maxLength={50}
              onSubmitEditing={adicionarAluno}
            />

            <Text style={[styles.dica, ehDesktop && styles.dicaDesktop]}>
              Sem matrícula, o sistema gera uma provisória. O número de chamada
              será {chamada(proximaChamada)}.
            </Text>

            <TouchableOpacity
              style={[
                styles.botaoEscuroLargo,
                ehDesktop && styles.botaoEscuroLargoDesktop,
                (!novoNome.trim() || !!ocupado) && styles.desativado,
              ]}
              activeOpacity={0.85}
              disabled={!novoNome.trim() || !!ocupado}
              onPress={adicionarAluno}
            >
              <Ionicons
                name="person-add-outline"
                size={ehDesktop ? 18 : 16}
                color={COR.branco}
              />
              <Text
                style={[
                  styles.botaoEscuroTexto,
                  ehDesktop && styles.botaoEscuroTextoDesktop,
                ]}
              >
                {ocupado === "adicionar" ? "Adicionando..." : "Adicionar"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ------------------------------------------------------ alunos */}
          <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
            <Text
              style={[
                styles.cartaoTitulo,
                ehDesktop && styles.cartaoTituloDesktop,
              ]}
            >
              {alunos.length === 1 ? "1 aluno" : `${alunos.length} alunos`}
            </Text>

            {alunos.length === 0 && (
              <Text style={styles.textoApoio}>
                Nenhum aluno cadastrado nesta turma ainda.
              </Text>
            )}

            {alunos.map((aluno) => (
              <View
                key={aluno.id_aluno}
                style={[
                  styles.alunoLinha,
                  ehDesktop && styles.alunoLinhaDesktop,
                ]}
              >
                <Text
                  style={[
                    styles.alunoChamada,
                    ehDesktop && styles.alunoChamadaDesktop,
                  ]}
                >
                  {chamada(aluno.numero_chamada)}
                </Text>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={[
                      styles.alunoNome,
                      ehDesktop && styles.alunoNomeDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    {aluno.nome}
                  </Text>
                  {!!aluno.matricula && (
                    <Text
                      style={[
                        styles.alunoMatricula,
                        ehDesktop && styles.alunoMatriculaDesktop,
                      ]}
                      numberOfLines={1}
                    >
                      {aluno.matricula}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[
                    styles.botaoLixeira,
                    ehDesktop && styles.botaoLixeiraDesktop,
                  ]}
                  activeOpacity={0.7}
                  hitSlop={8}
                  disabled={!!ocupado}
                  onPress={() => setAlunoParaExcluir(aluno)}
                >
                  <Ionicons
                    name="trash-outline"
                    size={ehDesktop ? 18 : 16}
                    color={COR.perigo}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ------------------------------ conferir a lista antes de importar */}
      <Modal
        visible={!!listaLida}
        transparent
        animationType="slide"
        onRequestClose={() => setListaLida(null)}
      >
        <View
          style={[styles.modalFundo, !ehDesktop && styles.modalFundoMobile]}
        >
          <View
            style={[
              styles.modalCard,
              ehDesktop && styles.modalListaDesktop,
              !ehDesktop && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalCabecalho}>
              <Text
                style={[
                  styles.modalTitulo,
                  ehDesktop && styles.modalTituloDesktop,
                ]}
              >
                Confira a lista
              </Text>
              <TouchableOpacity onPress={() => setListaLida(null)}>
                <Ionicons name="close" size={22} color={COR.tintaMedia} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalTextoEsquerda}>
              Encontrei{" "}
              <Text style={styles.metaForte}>{listaLida?.total_lidos ?? 0}</Text>{" "}
              {(listaLida?.total_lidos ?? 0) === 1 ? "nome" : "nomes"} no
              arquivo.
              {(listaLida?.ja_na_turma ?? 0) > 0
                ? ` ${listaLida.ja_na_turma} já ${listaLida.ja_na_turma === 1 ? "está" : "estão"} na turma e ${listaLida.ja_na_turma === 1 ? "veio desmarcado" : "vieram desmarcados"}.`
                : ""}{" "}
              Desmarque quem não deve entrar — aluno transferido costuma
              aparecer na lista.
            </Text>

            <View style={styles.marcarLinha}>
              <TouchableOpacity onPress={() => marcarTodos(true)} hitSlop={6}>
                <Text style={styles.marcarTexto}>Marcar todos</Text>
              </TouchableOpacity>
              <Text style={styles.marcarSeparador}>·</Text>
              <TouchableOpacity onPress={() => marcarTodos(false)} hitSlop={6}>
                <Text style={styles.marcarTexto}>Desmarcar todos</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.listaConferencia}>
              {(listaLida?.alunos || []).map((aluno, i) => {
                const marcado = !!marcados[i];

                return (
                  <TouchableOpacity
                    key={`${aluno.nome}-${i}`}
                    style={styles.conferenciaLinha}
                    activeOpacity={0.7}
                    onPress={() => alternarMarcado(i)}
                  >
                    <View
                      style={[
                        styles.caixa,
                        marcado && styles.caixaMarcada,
                        aluno.ja_existe && styles.caixaRepetida,
                      ]}
                    >
                      {marcado && (
                        <Ionicons
                          name="checkmark"
                          size={13}
                          color={COR.branco}
                        />
                      )}
                    </View>

                    <Text style={styles.conferenciaChamada}>
                      {chamada(aluno.numero_chamada)}
                    </Text>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[
                          styles.conferenciaNome,
                          aluno.ja_existe && styles.conferenciaNomeRepetido,
                        ]}
                        numberOfLines={1}
                      >
                        {aluno.nome}
                      </Text>
                      {aluno.ja_existe ? (
                        <Text style={styles.conferenciaMarca}>
                          já está na turma
                        </Text>
                      ) : (
                        !!aluno.matricula && (
                          <Text style={styles.conferenciaMatricula}>
                            {aluno.matricula}
                          </Text>
                        )
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalCancelar}
                onPress={() => setListaLida(null)}
              >
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSalvar,
                  (totalMarcados === 0 || !!ocupado) && styles.desativado,
                ]}
                disabled={totalMarcados === 0 || !!ocupado}
                onPress={confirmarImportacao}
              >
                <Text style={styles.modalSalvarTexto}>
                  {ocupado === "importando"
                    ? "Adicionando..."
                    : totalMarcados === 0
                      ? "Nenhum marcado"
                      : `Adicionar ${totalMarcados}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------- editar a turma */}
      <Modal
        visible={!!editando}
        transparent
        animationType="slide"
        onRequestClose={() => setEditando(null)}
      >
        <View
          style={[styles.modalFundo, !ehDesktop && styles.modalFundoMobile]}
        >
          <View
            style={[
              styles.modalCard,
              ehDesktop && styles.modalCardDesktop,
              !ehDesktop && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalCabecalho}>
              <Text
                style={[
                  styles.modalTitulo,
                  ehDesktop && styles.modalTituloDesktop,
                ]}
              >
                Editar turma
              </Text>
              <TouchableOpacity onPress={() => setEditando(null)}>
                <Ionicons name="close" size={22} color={COR.tintaMedia} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.rotulo, ehDesktop && styles.rotuloDesktop]}>
              Nome da turma <Text style={{ color: COR.perigo }}>*</Text>
            </Text>
            <TextInput
              value={editando?.nome ?? ""}
              onChangeText={(v) =>
                setEditando((atual) => ({ ...atual, nome: v }))
              }
              placeholder="Ex: 9º Ano A"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campo, ehDesktop && styles.campoDesktop]}
            />

            <Text style={[styles.rotulo, ehDesktop && styles.rotuloDesktop]}>
              Escola
            </Text>
            <TextInput
              value={editando?.escola ?? ""}
              onChangeText={(v) =>
                setEditando((atual) => ({ ...atual, escola: v }))
              }
              placeholder="Ex: E.E. Marechal Rondon"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campo, ehDesktop && styles.campoDesktop]}
            />

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalCancelar}
                onPress={() => setEditando(null)}
              >
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSalvar}
                disabled={!!ocupado}
                onPress={salvarTurma}
              >
                <Text style={styles.modalSalvarTexto}>
                  {ocupado === "salvarTurma" ? "Salvando..." : "Salvar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------- excluir aluno */}
      <Modal
        visible={!!alunoParaExcluir}
        transparent
        animationType="fade"
        onRequestClose={() => setAlunoParaExcluir(null)}
      >
        <View style={styles.modalFundoCentro}>
          <View
            style={[
              styles.modalConfirma,
              ehDesktop && styles.modalConfirmaDesktop,
            ]}
          >
            <View style={styles.modalIcone}>
              <Ionicons name="trash-outline" size={22} color={COR.perigo} />
            </View>
            <Text
              style={[
                styles.modalTituloCentro,
                ehDesktop && styles.modalTituloCentroDesktop,
              ]}
            >
              Tirar {alunoParaExcluir?.nome} da turma?
            </Text>
            <Text
              style={[styles.modalTexto, ehDesktop && styles.modalTextoDesktop]}
            >
              Se este aluno já tiver correções lançadas, o servidor vai recusar
              — apagar levaria as notas dele junto.
            </Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalCancelar}
                onPress={() => setAlunoParaExcluir(null)}
              >
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalExcluir}
                disabled={!!ocupado}
                onPress={removerAluno}
              >
                <Text style={styles.modalExcluirTexto}>
                  {ocupado === "excluirAluno" ? "Removendo..." : "Remover"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ------------------------------------------------- excluir turma */}
      <Modal
        visible={confirmandoExclusaoTurma}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmandoExclusaoTurma(false)}
      >
        <View style={styles.modalFundoCentro}>
          <View
            style={[
              styles.modalConfirma,
              ehDesktop && styles.modalConfirmaDesktop,
            ]}
          >
            <View style={styles.modalIcone}>
              <Ionicons name="trash-outline" size={22} color={COR.perigo} />
            </View>
            <Text
              style={[
                styles.modalTituloCentro,
                ehDesktop && styles.modalTituloCentroDesktop,
              ]}
            >
              Excluir esta turma?
            </Text>
            <Text
              style={[styles.modalTexto, ehDesktop && styles.modalTextoDesktop]}
            >
              {alunos.length > 0 || (turma.atividades ?? 0) > 0
                ? "Ela tem gente e conteúdo dentro. O servidor vai recusar para não apagar as notas junto."
                : "A turma está vazia, então dá para apagar. Não tem como desfazer."}
            </Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalCancelar}
                onPress={() => setConfirmandoExclusaoTurma(false)}
              >
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalExcluir}
                disabled={!!ocupado}
                onPress={removerTurma}
              >
                <Text style={styles.modalExcluirTexto}>
                  {ocupado === "excluirTurma" ? "Excluindo..." : "Excluir"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 30,
  },

  conteudo: { flex: 1 },
  conteudoInterno: {
    padding: 16,
    paddingBottom: 50,
    alignItems: "center",
    gap: 12,
  },
  miolo: { width: "94%", maxWidth: 820, gap: 14 },

  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  tituloPagina: { fontFamily: FONTE.bold, fontSize: 18, color: COR.tintaForte },

  cartao: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    gap: 10,
  },
  cartaoTitulo: { fontFamily: FONTE.bold, fontSize: 14, color: COR.tintaForte },

  topoLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  sigla: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COR.marcador,
    alignItems: "center",
    justifyContent: "center",
  },
  siglaTexto: { fontFamily: FONTE.bold, fontSize: 16, color: COR.branco },
  nomeTurma: { fontFamily: FONTE.bold, fontSize: 17, color: COR.tintaForte },
  subtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 2,
  },
  meta: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 5,
  },
  metaForte: {
    fontFamily: FONTE.semi,
    fontWeight: "600",
    color: COR.tintaMedia,
  },

  // -------------------------------------------------------------------------
  // Tamanhos só do computador.
  //
  // Esta tela desenha o mesmo JSX nas duas larguras, então cada estilo daqui
  // entra empilhado por cima do compartilhado:
  // [styles.alunoNome, ehDesktop && styles.alunoNomeDesktop].
  // O primeiro define, o segundo corrige, e o celular não passa por aqui.
  //
  // Mesmo arranjo do AUMENTO_DESKTOP da Home. Para ajustar o web, é só este
  // bloco.
  // -------------------------------------------------------------------------
  tituloPaginaDesktop: { fontSize: 24 },
  cartaoDesktop: { padding: 22, borderRadius: 18, gap: 12 },
  cartaoTituloDesktop: { fontSize: 16.5 },
  siglaDesktop: { width: 58, height: 58, borderRadius: 17 },
  siglaTextoDesktop: { fontSize: 19 },
  nomeTurmaDesktop: { fontSize: 21 },
  subtituloDesktop: { fontSize: 13.5, marginTop: 3 },
  metaDesktop: { fontSize: 13.5, marginTop: 6 },
  botaoAcaoDesktop: { paddingVertical: 14, borderRadius: 13 },
  botaoAcaoTextoDesktop: { fontSize: 14.5 },
  botaoImportarDesktop: { paddingVertical: 15, borderRadius: 13 },
  botaoImportarTextoDesktop: { fontSize: 14.5 },
  campoDesktop: { fontSize: 14.5, paddingVertical: 13, borderRadius: 11 },
  dicaDesktop: { fontSize: 12.5, lineHeight: 18 },
  botaoEscuroLargoDesktop: { paddingVertical: 16, borderRadius: 13 },
  botaoEscuroTextoDesktop: { fontSize: 15 },
  alunoLinhaDesktop: { paddingVertical: 14, gap: 14 },
  alunoChamadaDesktop: { fontSize: 13, minWidth: 26 },
  alunoNomeDesktop: { fontSize: 15 },
  alunoMatriculaDesktop: { fontSize: 12, marginTop: 2 },
  botaoLixeiraDesktop: { width: 36, height: 36, borderRadius: 10 },
  modalCardDesktop: { maxWidth: 480, padding: 26 },
  modalListaDesktop: { maxWidth: 560, padding: 26 },
  modalConfirmaDesktop: { maxWidth: 440, padding: 26 },
  modalTituloDesktop: { fontSize: 19 },
  modalTituloCentroDesktop: { fontSize: 17 },
  modalTextoDesktop: { fontSize: 14, lineHeight: 20 },
  rotuloDesktop: { fontSize: 13.5, marginTop: 16 },

  acoes: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
    paddingTop: 12,
  },
  botaoAcao: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COR.branco,
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderRadius: 12,
    paddingVertical: 11,
  },
  botaoPerigo: { borderColor: COR.perigoFundo },
  botaoAcaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.marcador,
  },

  // O botão de importar é tracejado como o de adicionar questão do
  // criar-atividade: nos dois, o tracejado quer dizer "isto é opcional, e
  // entra uma coisa nova aqui se você quiser".
  botaoImportar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoImportarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.marcador,
  },

  separador: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 2,
  },
  separadorLinha: { flex: 1, height: 1, backgroundColor: COR.linhaSuave },
  separadorTexto: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },

  erroFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: 10,
    padding: 12,
    lineHeight: 17,
  },
  avisoFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.ok,
    backgroundColor: COR.okFundo,
    borderRadius: 10,
    padding: 12,
  },

  campo: {
    width: "100%",
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    backgroundColor: COR.branco,
  },
  dica: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    lineHeight: 15,
  },

  botaoEscuro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.marinho,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoEscuroLargo: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COR.marinho,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoEscuroTexto: { color: COR.branco, fontFamily: FONTE.bold, fontSize: 13 },
  desativado: { opacity: 0.45 },

  alunoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
  },
  alunoChamada: {
    fontFamily: FONTE.semi,
    fontSize: 11.5,
    color: COR.tintaFraca,
    minWidth: 22,
  },
  alunoNome: { fontFamily: FONTE.media, fontSize: 13, color: COR.tintaForte },
  alunoMatricula: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
    marginTop: 1,
  },
  botaoLixeira: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COR.perigoFundo,
  },

  textoApoio: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 18,
  },

  // ----------------------------------------------- conferência da lista
  modalTextoEsquerda: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    lineHeight: 18,
  },
  marcarLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  marcarTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: COR.marcador,
  },
  marcarSeparador: { color: COR.tintaFraca, fontSize: 12 },

  // Altura máxima, e não fixa: uma lista de 3 nomes não precisa de um painel
  // de 380 de altura com o fundo vazio embaixo.
  listaConferencia: {
    maxHeight: 340,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
    marginTop: 4,
  },
  conferenciaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  caixa: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COR.linha,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  caixaMarcada: { backgroundColor: COR.marcador, borderColor: COR.marcador },
  caixaRepetida: { borderStyle: "dashed" },
  conferenciaChamada: {
    fontFamily: FONTE.semi,
    fontSize: 11,
    color: COR.tintaFraca,
    minWidth: 20,
  },
  conferenciaNome: {
    fontFamily: FONTE.media,
    fontSize: 13,
    color: COR.tintaForte,
  },
  conferenciaNomeRepetido: { color: COR.tintaFraca },
  conferenciaMatricula: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
    marginTop: 1,
  },
  conferenciaMarca: {
    fontFamily: FONTE.semi,
    fontSize: 10,
    color: COR.avisoTexto,
    marginTop: 1,
  },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalFundoMobile: { justifyContent: "flex-end", padding: 0 },
  modalFundoCentro: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COR.branco,
    borderRadius: 18,
    padding: 22,
  },
  modalCardMobile: {
    maxWidth: "100%",
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalConfirma: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COR.branco,
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 10,
  },
  modalIcone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitulo: { fontFamily: FONTE.bold, fontSize: 17, color: COR.tintaForte },
  modalTituloCentro: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    color: COR.tintaForte,
    textAlign: "center",
  },
  modalTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 18,
  },
  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    color: COR.tintaMedia,
    marginTop: 14,
    marginBottom: 6,
  },
  modalBotoes: { flexDirection: "row", gap: 10, width: "100%", marginTop: 16 },
  modalCancelar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: COR.linha,
  },
  modalCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.tintaMedia,
  },
  modalSalvar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: COR.marinho,
  },
  modalSalvarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.branco,
  },
  modalExcluir: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 11,
    backgroundColor: COR.perigo,
  },
  modalExcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.branco,
  },
});