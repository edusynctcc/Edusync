import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  ajustarResposta,
  buscarCorrecao,
  concluirAtividade,
  listarCorrecoes,
} from "../../constants/api";

const ABAS = [
  { chave: "resumo", rotulo: "Resumo", icone: "stats-chart" },
  { chave: "individual", rotulo: "Individual", icone: "person-outline" },
];

// Mesma regra de ícone do Scanner e das Correções: sai da disciplina.
const VISUAL_PADRAO = {
  icone: "file-document-outline",
  corFundo: "#EEF2F4",
  corIcone: "#55646F",
};

const POR_DISCIPLINA = [
  {
    termos: ["matematica", "algebra", "geometria", "calculo", "aritmetica"],
    icone: "function-variant",
    corFundo: "#E7EFF7",
    corIcone: "#2E6FB0",
  },
  {
    termos: ["historia"],
    icone: "book-open-page-variant",
    corFundo: "#FBF1E0",
    corIcone: "#8A4A12",
  },
  {
    termos: ["geografia"],
    icone: "earth",
    corFundo: "#F3EDE6",
    corIcone: "#A85A3C",
  },
  {
    termos: ["ciencias", "biologia", "quimica", "fisica"],
    icone: "flask-outline",
    corFundo: "#E6F2EC",
    corIcone: "#2F7D5C",
  },
  {
    termos: ["portugues", "literatura", "redacao", "gramatica"],
    icone: "format-quote-close",
    corFundo: "#EFEAF7",
    corIcone: "#6B4E9B",
  },
  {
    termos: ["ingles", "espanhol", "frances", "idioma"],
    icone: "translate",
    corFundo: "#E9EEF0",
    corIcone: "#55646F",
  },
  {
    termos: ["arte", "artes", "musica", "educacao fisica"],
    icone: "palette-outline",
    corFundo: "#FBEAE8",
    corIcone: "#B4443A",
  },
];

function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function visualDaDisciplina(disciplina) {
  const nome = semAcento(disciplina);
  if (!nome) return VISUAL_PADRAO;
  const achou = POR_DISCIPLINA.find((g) =>
    g.termos.some((t) => nome.includes(t)),
  );
  return achou
    ? { icone: achou.icone, corFundo: achou.corFundo, corIcone: achou.corIcone }
    : VISUAL_PADRAO;
}

function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function formatarPeso(valor) {
  return Number(valor ?? 0)
    .toFixed(2)
    .replace(".", ",");
}

// Verde a partir de 7, amarelo de 5 a 7, vermelho abaixo. É a régua que a
// maioria das escolas usa para média.
function corDaNota(nota, peso) {
  const proporcao = peso ? nota / peso : 0;
  if (proporcao >= 0.7) return COR.ok;
  if (proporcao >= 0.5) return COR.avisoTexto;
  return COR.perigo;
}

function palavrasDoGabarito(texto) {
  return String(texto || "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Os botões de nota saem da própria questão. Numa dissertativa de 5
// palavras-chave o servidor só produz 0/5, 1/5 ... 5/5 — uma régua fixa de
// 0/25/50/75/100% deixaria quase toda nota "fora da régua".
//
// Esta lógica é a mesma do revisar.js. Está repetida de propósito: são duas
// telas independentes e o servidor valida a nota de qualquer jeito, então
// preferi duas cópias legíveis a um arquivo a mais para colocar no lugar.
// ---------------------------------------------------------------------------
function opcoesDeNota(resposta) {
  if (resposta.tipo === "alternativa") {
    return [
      { fracao: 0, rotulo: "Errou" },
      { fracao: 1, rotulo: "Acertou" },
    ];
  }

  if (resposta.tipo === "calculo") {
    return [
      { fracao: 0, rotulo: "Errou" },
      { fracao: 0.5, rotulo: "Meio certo" },
      { fracao: 1, rotulo: "Certo" },
    ];
  }

  const total = palavrasDoGabarito(resposta.resposta_correta);

  if (total < 2 || total > 8) {
    return [0, 0.25, 0.5, 0.75, 1].map((fracao) => ({
      fracao,
      rotulo: `${Math.round(fracao * 100)}%`,
    }));
  }

  return Array.from({ length: total + 1 }, (_, i) => ({
    fracao: i / total,
    rotulo: `${i} de ${total}`,
  }));
}

function fracaoAtual(nota, peso, opcoes) {
  if (!peso) return null;
  const bruta = nota / peso;
  const perto = opcoes.find((o) => Math.abs(o.fracao - bruta) < 0.005);
  return perto ? perto.fracao : null;
}

export default function Editar() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const params = useLocalSearchParams();

  const id_atividade = params.id_atividade;

  const [correcoes, setCorrecoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [abaAtiva, setAbaAtiva] = useState("resumo");
  const [selecionada, setSelecionada] = useState(null); // id_correcao
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [salvandoId, setSalvandoId] = useState(null);
  const [fechando, setFechando] = useState(false);

  async function carregarLista() {
    setErro("");
    try {
      const lista = await listarCorrecoes({ id_atividade });
      setCorrecoes(lista);
      return lista;
    } catch (e) {
      setErro(e.message);
      return [];
    }
  }

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        if (!id_atividade) {
          setErro("Nenhuma atividade foi indicada.");
          setCarregando(false);
          return;
        }

        setCarregando(true);
        await carregarLista();
        if (ativo) setCarregando(false);
      }

      carregar();
      return () => {
        ativo = false;
      };
    }, [id_atividade]),
  );

  const atividade = correcoes[0]?.atividade ?? null;
  const pesoTotal = correcoes[0]?.peso_total ?? 10;
  const revisadas = correcoes.filter((c) => c.status === "concluida").length;
  const media = correcoes.length
    ? correcoes.reduce((s, c) => s + Number(c.nota ?? 0), 0) / correcoes.length
    : 0;
  const tudoConcluido = correcoes.length > 0 && revisadas === correcoes.length;

  const alunos = [...correcoes].sort(
    (a, b) =>
      (a.aluno?.numero_chamada ?? 999) - (b.aluno?.numero_chamada ?? 999),
  );

  async function abrirAluno(c) {
    setSelecionada(c.id_correcao);
    setAbaAtiva("individual");
    setCarregandoDetalhe(true);
    setErro("");

    try {
      setDetalhe(await buscarCorrecao(c.id_correcao));
    } catch (e) {
      setErro(e.message);
      setDetalhe(null);
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  // A nota nova não é somada aqui: mandamos o valor e usamos o total que o
  // servidor devolve. Se a tela somasse sozinha, o número dela e o do banco
  // poderiam divergir sem ninguém perceber.
  async function mudarNota(resposta, fracao) {
    if (!detalhe || detalhe.status === "concluida" || salvandoId) return;

    const novaNota = Number((resposta.peso * fracao).toFixed(2));
    if (Math.abs(novaNota - resposta.nota) < 0.001) return;

    setSalvandoId(resposta.id_resposta);
    setErro("");

    try {
      const retorno = await ajustarResposta(
        detalhe.id_correcao,
        resposta.id_resposta,
        novaNota,
      );

      setDetalhe((atual) => ({
        ...atual,
        nota: retorno.nota_total,
        respostas: atual.respostas.map((r) =>
          r.id_resposta === resposta.id_resposta
            ? { ...r, nota: retorno.nota, ajustado_manualmente: true }
            : r,
        ),
      }));

      // A lista lateral mostra a nota do aluno: precisa acompanhar.
      setCorrecoes((atual) =>
        atual.map((c) =>
          c.id_correcao === detalhe.id_correcao
            ? { ...c, nota: retorno.nota_total }
            : c,
        ),
      );
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvandoId(null);
    }
  }

  async function fecharAtividade(reabrir) {
    if (fechando) return;
    setFechando(true);
    setErro("");

    try {
      await concluirAtividade(id_atividade, { reabrir });
      await carregarLista();
      if (detalhe) setDetalhe(await buscarCorrecao(detalhe.id_correcao));
    } catch (e) {
      setErro(e.message);
    } finally {
      setFechando(false);
    }
  }

  // -------------------------------------------------------------------------
  if (carregando) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <ActivityIndicator color={COR.marcador} />
          <Text style={styles.textoApoio}>Abrindo a atividade...</Text>
        </View>
      </View>
    );
  }

  if (!atividade) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <Ionicons
            name="document-text-outline"
            size={36}
            color={COR.tintaFraca}
          />
          <Text style={styles.textoApoio}>
            {erro || "Esta atividade ainda não tem nenhuma folha corrigida."}
          </Text>
          <TouchableOpacity
            style={styles.botaoEscuro}
            onPress={() => router.replace("/scanner")}
          >
            <Ionicons name="camera-outline" size={16} color={COR.branco} />
            <Text style={styles.botaoEscuroTexto}>Ir para o Scanner</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const visual = visualDaDisciplina(atividade.disciplina);

  function listaDeAlunos(compacta) {
    return (
      <View style={styles.cartao}>
        <Text style={styles.cartaoTitulo}>
          {compacta ? "Selecione um aluno" : "Notas dos alunos"}
        </Text>
        <Text style={styles.cartaoSubtitulo}>
          {compacta
            ? "Toque em um nome para ver as respostas"
            : `${alunos.length} ${alunos.length === 1 ? "folha corrigida" : "folhas corrigidas"}`}
        </Text>

        <View style={styles.listaAlunos}>
          {alunos.map((c) => {
            const ativa = selecionada === c.id_correcao;

            return (
              <TouchableOpacity
                key={c.id_correcao}
                style={[styles.linhaAluno, ativa && styles.linhaAlunoAtiva]}
                activeOpacity={0.7}
                onPress={() => abrirAluno(c)}
              >
                <View style={styles.chamadaCirculo}>
                  <Text style={styles.chamadaTexto}>
                    {String(c.aluno?.numero_chamada ?? "–").padStart(2, "0")}
                  </Text>
                </View>

                <View style={styles.alunoTextos}>
                  <Text style={styles.alunoNome} numberOfLines={1}>
                    {c.aluno?.nome || "Aluno"}
                  </Text>
                  <Text style={styles.alunoStatus}>
                    {c.status === "concluida"
                      ? "revisada"
                      : "aguardando revisão"}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.alunoNota,
                    { color: corDaNota(c.nota, c.peso_total) },
                  ]}
                >
                  {formatarNota(c.nota)}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={COR.chevron}
                />
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  function painelDoAluno() {
    if (carregandoDetalhe) {
      return (
        <View style={[styles.cartao, styles.cartaoVazio]}>
          <ActivityIndicator color={COR.marcador} />
          <Text style={styles.textoApoio}>Abrindo as respostas...</Text>
        </View>
      );
    }

    if (!detalhe) {
      return (
        <View style={[styles.cartao, styles.cartaoVazio]}>
          <Ionicons name="hand-left-outline" size={30} color={COR.tintaFraca} />
          <Text style={styles.textoApoio}>
            Escolha um aluno na lista para ver o que a IA leu na folha dele.
          </Text>
        </View>
      );
    }

    const travada = detalhe.status === "concluida";

    return (
      <View style={styles.cartao}>
        <View style={styles.detalheTopo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.detalheNome}>
              {detalhe.aluno?.nome || "Aluno"}
            </Text>
            <Text style={styles.cartaoSubtitulo}>{atividade.turma}</Text>
          </View>
          <Text
            style={[
              styles.detalheNota,
              { color: corDaNota(detalhe.nota, detalhe.peso_total) },
            ]}
          >
            {formatarNota(detalhe.nota)}
            <Text style={styles.detalheNotaPeso}>
              {" "}
              / {formatarNota(detalhe.peso_total)}
            </Text>
          </Text>
        </View>

        {travada ? (
          <View style={styles.avisoTrancado}>
            <Ionicons name="lock-closed" size={14} color={COR.avisoTexto} />
            <Text style={styles.avisoTrancadoTexto}>
              Correção concluída — as notas estão travadas.
            </Text>
          </View>
        ) : (
          <Text style={styles.dicaAjuste}>
            Achou que a IA errou? Toque na nota que você daria.
          </Text>
        )}

        {detalhe.respostas.map((r) => {
          const opcoes = opcoesDeNota(r);
          const marcada = fracaoAtual(r.nota, r.peso, opcoes);

          return (
            <View key={r.id_resposta} style={styles.blocoQuestao}>
              <View style={styles.questaoTopo}>
                <Text style={styles.questaoNumero}>Questão {r.numero}</Text>
                <Text style={styles.questaoNota}>
                  {formatarPeso(r.nota)}
                  <Text style={styles.questaoPeso}>
                    {" "}
                    / {formatarPeso(r.peso)}
                  </Text>
                </Text>
              </View>

              <Text style={styles.questaoPergunta} numberOfLines={2}>
                {r.pergunta}
              </Text>

              <View style={styles.leitura}>
                <Text style={styles.leituraRotulo}>O que a IA leu</Text>
                <Text style={styles.leituraTexto}>
                  {r.resposta?.trim() || "— nada foi lido nesta questão —"}
                </Text>
              </View>

              {!!r.comentario && (
                <Text style={styles.comentario}>{r.comentario}</Text>
              )}

              <View style={styles.fracoesLinha}>
                {opcoes.map((o) => {
                  const ativa = marcada === o.fracao;
                  const valor = Number((r.peso * o.fracao).toFixed(2));

                  return (
                    <TouchableOpacity
                      key={o.rotulo}
                      style={[
                        styles.botaoFracao,
                        ativa && styles.botaoFracaoAtivo,
                        (travada || salvandoId === r.id_resposta) &&
                          styles.desativado,
                      ]}
                      activeOpacity={0.8}
                      disabled={travada || !!salvandoId}
                      onPress={() => mudarNota(r, o.fracao)}
                    >
                      <Text
                        style={[
                          styles.botaoFracaoTexto,
                          ativa && styles.botaoFracaoTextoAtivo,
                        ]}
                      >
                        {formatarPeso(valor)}
                      </Text>
                      <Text
                        style={[
                          styles.botaoFracaoRotulo,
                          ativa && styles.botaoFracaoTextoAtivo,
                        ]}
                      >
                        {o.rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {r.ajustado_manualmente && (
                <Text style={styles.marcaAjustada}>nota ajustada por você</Text>
              )}
            </View>
          );
        })}
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
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
            <Text style={styles.tituloPagina}>Editar correção</Text>
          </TouchableOpacity>

          {/* ------------------------------------------------- cabeçalho */}
          <View style={styles.cartao}>
            <View style={styles.atividadeLinha}>
              <View
                style={[
                  styles.atividadeIcone,
                  { backgroundColor: visual.corFundo },
                ]}
              >
                <MaterialCommunityIcons
                  name={visual.icone}
                  size={22}
                  color={visual.corIcone}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.atividadeNome}>{atividade.nome}</Text>
                <Text style={styles.cartaoSubtitulo}>{atividade.turma}</Text>
              </View>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: tudoConcluido
                      ? COR.okFundo
                      : COR.avisoFundo,
                  },
                ]}
              >
                <Ionicons
                  name={tudoConcluido ? "checkmark-done" : "time-outline"}
                  size={12}
                  color={tudoConcluido ? COR.ok : COR.avisoTexto}
                />
                <Text
                  style={[
                    styles.badgeTexto,
                    { color: tudoConcluido ? COR.ok : COR.avisoTexto },
                  ]}
                >
                  {tudoConcluido ? "Concluída" : "Em correção"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.botaoConcluir,
                tudoConcluido && styles.botaoReabrir,
              ]}
              activeOpacity={0.85}
              disabled={fechando}
              onPress={() => fecharAtividade(tudoConcluido)}
            >
              <Ionicons
                name={tudoConcluido ? "lock-open-outline" : "checkmark-done"}
                size={17}
                color={tudoConcluido ? COR.marcador : COR.branco}
              />
              <Text
                style={[
                  styles.botaoConcluirTexto,
                  tudoConcluido && { color: COR.marcador },
                ]}
              >
                {fechando
                  ? "Salvando..."
                  : tudoConcluido
                    ? "Reabrir para editar"
                    : "Concluir correção"}
              </Text>
            </TouchableOpacity>
          </View>

          {!!erro && <Text style={styles.erroFaixa}>{erro}</Text>}

          {/* ------------------------------------------------------- abas */}
          <View style={styles.abasLinha}>
            {ABAS.map((aba) => {
              const ativa = aba.chave === abaAtiva;
              return (
                <TouchableOpacity
                  key={aba.chave}
                  style={[styles.aba, ativa && styles.abaAtiva]}
                  onPress={() => setAbaAtiva(aba.chave)}
                >
                  <Ionicons
                    name={aba.icone}
                    size={15}
                    color={ativa ? COR.marcador : COR.tintaFraca}
                  />
                  <Text
                    style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}
                  >
                    {aba.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {abaAtiva === "resumo" ? (
            <>
              <View style={styles.tilesLinha}>
                <View style={styles.tile}>
                  <View
                    style={[
                      styles.tileIcone,
                      { backgroundColor: COR.emAndamentoFundo },
                    ]}
                  >
                    <Ionicons name="people" size={17} color={COR.marcador} />
                  </View>
                  <Text style={styles.tileValor}>{correcoes.length}</Text>
                  <Text style={styles.tileRotulo}>folhas corrigidas</Text>
                </View>

                <View style={styles.tile}>
                  <View
                    style={[styles.tileIcone, { backgroundColor: COR.okFundo }]}
                  >
                    <Ionicons name="trending-up" size={17} color={COR.ok} />
                  </View>
                  <Text
                    style={[
                      styles.tileValor,
                      { color: corDaNota(media, pesoTotal) },
                    ]}
                  >
                    {formatarNota(media)}
                  </Text>
                  <Text style={styles.tileRotulo}>média da turma</Text>
                </View>
              </View>

              {listaDeAlunos(false)}
            </>
          ) : ehDesktop ? (
            <View style={styles.duasColunas}>
              <View style={styles.colunaLista}>{listaDeAlunos(true)}</View>
              <View style={styles.colunaDetalhe}>{painelDoAluno()}</View>
            </View>
          ) : (
            <>
              {listaDeAlunos(true)}
              {painelDoAluno()}
            </>
          )}
        </View>
      </ScrollView>
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
  textoApoio: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 19,
  },

  conteudo: { flex: 1 },
  conteudoInterno: {
    padding: 16,
    paddingBottom: 50,
    alignItems: "center",
    gap: 12,
  },
  miolo: { width: "92%", maxWidth: 1100, gap: 12 },

  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  cartao: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    gap: 12,
  },
  cartaoVazio: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 200,
  },
  cartaoTitulo: { fontFamily: FONTE.bold, fontSize: 14, color: COR.tintaForte },
  cartaoSubtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
  },

  atividadeLinha: { flexDirection: "row", alignItems: "center", gap: 12 },
  atividadeIcone: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  atividadeNome: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RAIO.controle,
  },
  badgeTexto: { fontFamily: FONTE.bold, fontSize: 10.5 },

  botaoConcluir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COR.ok,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoReabrir: {
    backgroundColor: COR.branco,
    borderWidth: 1.5,
    borderColor: COR.marcador,
  },
  botaoConcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    color: COR.branco,
  },

  botaoEscuro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoEscuroTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 12.5,
  },

  erroFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: 10,
    padding: 12,
  },

  abasLinha: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 4,
    gap: 4,
  },
  aba: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  abaAtiva: { backgroundColor: COR.emAndamentoFundo },
  abaTexto: { fontFamily: FONTE.semi, fontSize: 12.5, color: COR.tintaFraca },
  abaTextoAtiva: { color: COR.marcador },

  tilesLinha: { flexDirection: "row", gap: 10, width: "100%" },
  tile: {
    flex: 1,
    backgroundColor: COR.branco,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  tileIcone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  tileValor: { fontFamily: FONTE.bold, fontSize: 20, color: COR.tintaForte },
  tileRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
    textAlign: "center",
  },

  listaAlunos: { borderTopWidth: 1, borderTopColor: COR.linhaSuave },
  linhaAluno: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
    borderRadius: 8,
  },
  linhaAlunoAtiva: { backgroundColor: COR.emAndamentoFundo },
  chamadaCirculo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COR.fundo,
    alignItems: "center",
    justifyContent: "center",
  },
  chamadaTexto: { fontFamily: FONTE.bold, fontSize: 11, color: COR.tintaMedia },
  alunoTextos: { flex: 1, gap: 1 },
  alunoNome: { fontFamily: FONTE.semi, fontSize: 13, color: COR.tintaForte },
  alunoStatus: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
  },
  alunoNota: { fontFamily: FONTE.bold, fontSize: 15 },

  duasColunas: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    alignItems: "flex-start",
  },
  colunaLista: { flex: 1 },
  colunaDetalhe: { flex: 1.3 },

  detalheTopo: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  detalheNome: { fontFamily: FONTE.bold, fontSize: 16, color: COR.tintaForte },
  detalheNota: { fontFamily: FONTE.bold, fontSize: 22 },
  detalheNotaPeso: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
  },

  avisoTrancado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.avisoFundo,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  avisoTrancadoTexto: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 11.5,
    color: COR.avisoTexto,
  },
  dicaAjuste: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
    lineHeight: 16,
  },

  blocoQuestao: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
    paddingTop: 12,
  },
  questaoTopo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questaoNumero: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.tintaForte,
  },
  questaoNota: { fontFamily: FONTE.bold, fontSize: 13, color: COR.tintaForte },
  questaoPeso: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
  },
  questaoPergunta: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
    lineHeight: 16,
  },

  leitura: {
    backgroundColor: COR.fundo,
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: COR.marcador,
    gap: 3,
  },
  leituraRotulo: {
    fontFamily: FONTE.semi,
    fontSize: 9.5,
    color: COR.tintaFraca,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  leituraTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaForte,
    lineHeight: 17,
  },
  comentario: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },

  fracoesLinha: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  botaoFracao: {
    minWidth: 50,
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
  },
  botaoFracaoAtivo: { borderColor: COR.marinho, backgroundColor: COR.marinho },
  botaoFracaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    color: COR.tintaForte,
  },
  botaoFracaoRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 9,
    color: COR.tintaFraca,
    marginTop: 1,
  },
  botaoFracaoTextoAtivo: { color: COR.branco },
  desativado: { opacity: 0.5 },
  marcaAjustada: {
    fontFamily: FONTE.semi,
    fontSize: 9.5,
    color: COR.avisoTexto,
  },
});
