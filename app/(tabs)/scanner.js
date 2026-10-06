import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  listarAtividades,
  listarCorrecoes,
  listarTurmas,
} from "../../constants/api";
import { guardarArquivo } from "../../constants/arquivoSelecionado";

// ---------------------------------------------------------------------------
// O amarelo do botão principal. É o mesmo do "Revisar" da Home (home.js).
//
// A regra é uma só no app: amarelo marca a ação principal de cada tela, sempre
// sobre o bloco azul-marinho, sempre com a letra em marinho. Aqui a ação
// principal é tirar a foto da folha.
//
// A letra é marinho e não branca de propósito: branco sobre este amarelo dá
// contraste 1,9 e some no projetor; marinho dá 8,6.
// ---------------------------------------------------------------------------
const AMARELO = "#EAB308";

// ---------------------------------------------------------------------------
// Mesma regra da tela de Atividades: o banco não guarda ícone, então ele sai
// da disciplina. Assim a mesma atividade aparece igual nas duas telas.
// ---------------------------------------------------------------------------
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

  const achou = POR_DISCIPLINA.find((grupo) =>
    grupo.termos.some((termo) => nome.includes(termo)),
  );

  return achou
    ? { icone: achou.icone, corFundo: achou.corFundo, corIcone: achou.corIcone }
    : VISUAL_PADRAO;
}

// Título do botão que abriu o modal, só para o subtítulo dele fazer sentido.
function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

const TITULO_DA_ACAO = {
  foto: "Tirar Foto",
  imagem: "Enviar Imagem",
  pdf: "Enviar PDF",
};

export default function Scanner() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();

  const [acaoSelecionada, setAcaoSelecionada] = useState(null);
  const [busca, setBusca] = useState("");

  const [atividades, setAtividades] = useState([]);
  const [recentes, setRecentes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Recarrega toda vez que a tela ganha foco: assim uma atividade criada
  // agora já aparece aqui, sem precisar fechar o app.
  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        setErro("");
        try {
          // A atividade guarda id_turma, não o nome da turma. Buscamos as duas
          // listas e juntamos aqui, em vez de mexer no back-end.
          // As últimas correções vêm junto. Se essa parte falhar, o Scanner
          // continua funcionando — histórico é informação, não é o trabalho.
          const [listaAtividades, listaTurmas, ultimas] = await Promise.all([
            listarAtividades(),
            listarTurmas(),
            listarCorrecoes({ limite: 5 }).catch(() => []),
          ]);

          setRecentes(ultimas);

          const nomeDaTurma = new Map(
            listaTurmas.map((t) => [t.id_turma, t.nome]),
          );

          setAtividades(
            listaAtividades.map((a) => ({
              id: a.id_atividade,
              id_turma: a.id_turma,
              titulo: a.nome,
              turma: nomeDaTurma.get(a.id_turma) ?? "Sem turma",
              ...visualDaDisciplina(a.disciplina),
            })),
          );
        } catch (e) {
          setErro(e.message);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, []),
  );

  function abrirEscolhaDeAtividade(acao) {
    setBusca("");
    setAcaoSelecionada(acao);
  }

  // -------------------------------------------------------------------------
  // Escolheu a atividade -> abre a câmera, a galeria ou os arquivos, conforme
  // o botão que trouxe a professora até aqui.
  //
  // A captura acontece AQUI, não na tela seguinte, porque assim cancelar
  // deixa ela no Scanner em vez de numa tela de conferência vazia.
  // -------------------------------------------------------------------------
  async function escolherAtividade(atividade) {
    const acao = acaoSelecionada;
    setAcaoSelecionada(null);
    setErro("");

    try {
      const arquivo = await capturarArquivo(acao);

      // Desistiu ou deu algum aviso: não navega.
      if (!arquivo) return;

      // O arquivo vai pela memória, não pela URL. Só os dados curtos da
      // atividade viajam como params.
      guardarArquivo(arquivo);

      router.push({
        pathname: "/processando",
        params: {
          id_atividade: atividade.id,
          id_turma: atividade.id_turma,
          atividadeTitulo: atividade.titulo,
          atividadeTurma: atividade.turma,
        },
      });
    } catch (e) {
      setErro(e.message || "Não consegui abrir o seletor de arquivos.");
    }
  }

  // Devolve { uri, tipo, nome, mime } ou null quando a professora desiste.
  async function capturarArquivo(acao) {
    if (acao === "pdf") {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (resultado.canceled) return null;

      const doc = resultado.assets?.[0];
      if (!doc?.uri) {
        setErro("Não consegui ler esse arquivo. Tente outro.");
        return null;
      }

      return {
        uri: doc.uri,
        tipo: "pdf",
        nome: doc.name || "folha.pdf",
        mime: doc.mimeType || "application/pdf",
        // Só existe no navegador. É o arquivo de verdade, que o FormData
        // precisa na hora de enviar — e que também serve pra pré-visualizar.
        objetoWeb: doc.file ?? null,
      };
    }

    // No navegador não existe câmera nativa: cai no seletor de arquivo.
    const usarCamera = acao === "foto" && Platform.OS !== "web";

    if (usarCamera) {
      const permissao = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissao.granted) {
        setErro("Preciso da permissão da câmera para fotografar a folha.");
        return null;
      }
    }

    const resultado = usarCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });

    if (resultado.canceled) return null;

    const foto = resultado.assets?.[0];
    if (!foto?.uri) {
      setErro("Não consegui ler essa imagem. Tente outra.");
      return null;
    }

    return {
      uri: foto.uri,
      tipo: "imagem",
      nome: foto.fileName || "folha.jpg",
      mime: foto.mimeType || "image/jpeg",
      objetoWeb: foto.file ?? null,
    };
  }

  const atividadesFiltradas = atividades.filter((atividade) =>
    atividade.titulo.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <View style={[styles.tela]}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 40 },
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View
          style={[
            ehDesktop ? styles.miolo : { width: "100%" },
            ehTelaLarga && { maxWidth: 1100 },
          ]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Scanner</Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[styles.cardScanner, ehDesktop && styles.cardScannerDesktop]}
          >
            <View
              style={[styles.viewfinder, ehDesktop && styles.viewfinderDesktop]}
            >
              {!ehDesktop && (
                <>
                  <View
                    style={[styles.cantoViewfinder, styles.cantoTopoEsquerdo]}
                  />
                  <View
                    style={[styles.cantoViewfinder, styles.cantoTopoDireito]}
                  />
                  <View
                    style={[styles.cantoViewfinder, styles.cantoBaixoEsquerdo]}
                  />
                  <View
                    style={[styles.cantoViewfinder, styles.cantoBaixoDireito]}
                  />
                </>
              )}
              <Ionicons
                name="camera-outline"
                size={ehDesktop ? 32 : 32}
                color={COR.branco}
              />
            </View>

            <Text
              style={[
                styles.cardScannerTitulo,
                ehDesktop && styles.cardScannerTituloDesktop,
              ]}
            >
              Scanner de Atividades
            </Text>
            <Text
              style={[
                styles.cardScannerSubtitulo,
                ehDesktop && styles.cardScannerSubtituloDesktop,
              ]}
            >
              Fotografe ou envie a folha de respostas para corrigir
              automaticamente
            </Text>

            <View
              style={[
                styles.botoesLinha,
                ehDesktop
                  ? styles.botoesLinhaDesktop
                  : styles.botoesLinhaMobile,
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.botaoPrincipal,
                  ehDesktop && styles.botaoAcaoDesktop,
                  ehDesktop && { flex: 1 },
                ]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("foto")}
              >
                <Ionicons
                  name="camera"
                  size={ehDesktop ? 19 : 17}
                  color={COR.marinho}
                />
                <Text
                  style={[
                    styles.botaoPrincipalTexto,
                    ehDesktop && styles.botaoAcaoTextoDesktop,
                  ]}
                >
                  Tirar Foto
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoSecundario,
                  ehDesktop && styles.botaoAcaoDesktop,
                  ehDesktop && { flex: 1 },
                ]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("imagem")}
              >
                <Ionicons
                  name="image-outline"
                  size={ehDesktop ? 19 : 17}
                  color={COR.branco}
                />
                <Text
                  style={[
                    styles.botaoSecundarioTexto,
                    ehDesktop && styles.botaoAcaoTextoDesktop,
                  ]}
                >
                  Enviar Imagem
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.botaoSecundario,
                  ehDesktop && styles.botaoAcaoDesktop,
                  ehDesktop && { flex: 1 },
                ]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("pdf")}
              >
                <Ionicons
                  name="document-outline"
                  size={ehDesktop ? 19 : 17}
                  color={COR.branco}
                />
                <Text
                  style={[
                    styles.botaoSecundarioTexto,
                    ehDesktop && styles.botaoAcaoTextoDesktop,
                  ]}
                >
                  Enviar PDF
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {erro ? <Text style={styles.erroTexto}>{erro}</Text> : null}

          {recentes.length > 0 && (
            <View
              style={[styles.historico, ehDesktop && styles.historicoDesktop]}
            >
              <Text
                style={[
                  styles.historicoTitulo,
                  ehDesktop && styles.historicoTituloDesktop,
                ]}
              >
                Últimas folhas corrigidas
              </Text>

              {recentes.map((c) => (
                <TouchableOpacity
                  key={c.id_correcao}
                  style={[
                    styles.historicoLinha,
                    ehDesktop && styles.historicoLinhaDesktop,
                  ]}
                  activeOpacity={0.7}
                  onPress={() =>
                    router.push({
                      pathname: "/revisar",
                      params: { id_correcao: c.id_correcao },
                    })
                  }
                >
                  <View
                    style={[
                      styles.historicoSelo,
                      ehDesktop && styles.historicoSeloDesktop,
                      c.status === "concluida" && styles.historicoSeloOk,
                    ]}
                  >
                    <Ionicons
                      name={
                        c.status === "concluida"
                          ? "checkmark-done"
                          : "time-outline"
                      }
                      size={ehDesktop ? 16 : 14}
                      color={c.status === "concluida" ? COR.ok : COR.marcador}
                    />
                  </View>

                  <View style={styles.historicoTextos}>
                    <Text
                      style={[
                        styles.historicoAluno,
                        ehDesktop && styles.historicoAlunoDesktop,
                      ]}
                      numberOfLines={1}
                    >
                      {c.aluno?.nome || "Aluno"}
                    </Text>
                    <Text
                      style={[
                        styles.historicoAtividade,
                        ehDesktop && styles.historicoAtividadeDesktop,
                      ]}
                      numberOfLines={1}
                    >
                      {c.atividade?.nome}
                      {c.atividade?.turma ? ` · ${c.atividade.turma}` : ""}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.historicoNota,
                      ehDesktop && styles.historicoNotaDesktop,
                    ]}
                  >
                    {formatarNota(c.nota)}
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={ehDesktop ? 17 : 15}
                    color={COR.chevron}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!acaoSelecionada}
        transparent
        animationType={ehDesktop ? "fade" : "slide"}
        onRequestClose={() => setAcaoSelecionada(null)}
      >
        <Pressable
          style={[styles.modalFundo, ehDesktop && styles.modalFundoDesktop]}
          onPress={() => setAcaoSelecionada(null)}
        >
          <Pressable
            style={[styles.modalFolha, ehDesktop && styles.modalFolhaDesktop]}
            onPress={() => {}}
          >
            {!ehDesktop && <View style={styles.modalAlca} />}

            <View style={styles.modalCabecalho}>
              <View style={styles.modalCabecalhoTextos}>
                <Text
                  style={[
                    styles.modalTitulo,
                    ehDesktop && styles.modalTituloDesktop,
                  ]}
                >
                  Selecionar atividade
                </Text>
                <Text
                  style={[
                    styles.modalSubtitulo,
                    ehDesktop && styles.modalSubtituloDesktop,
                  ]}
                >
                  {acaoSelecionada
                    ? `${TITULO_DA_ACAO[acaoSelecionada]} para qual atividade?`
                    : ""}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setAcaoSelecionada(null)}
                style={styles.modalFechar}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={COR.tintaMedia} />
              </TouchableOpacity>
            </View>

            {carregando ? (
              <Text style={styles.modalVazioTexto}>
                Carregando atividades...
              </Text>
            ) : atividades.length === 0 ? (
              <View style={styles.modalPreRequisito}>
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color={COR.avisoTexto}
                />
                <Text style={styles.modalPreRequisitoTitulo}>
                  Você ainda não tem nenhuma atividade cadastrada
                </Text>
                <Text style={styles.modalPreRequisitoTexto}>
                  Pra usar o scanner, primeiro crie uma turma e depois uma
                  atividade anexada a ela — só assim dá pra saber pra onde
                  mandar a correção.
                </Text>

                <TouchableOpacity
                  style={styles.modalPreRequisitoBotao}
                  activeOpacity={0.85}
                  onPress={() => {
                    setAcaoSelecionada(null);
                    router.push("/turmas");
                  }}
                >
                  <Ionicons
                    name="people-outline"
                    size={16}
                    color={COR.branco}
                  />
                  <Text style={styles.modalPreRequisitoBotaoTexto}>
                    1. Criar turma
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalPreRequisitoBotao,
                    styles.modalPreRequisitoBotaoSecundario,
                  ]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setAcaoSelecionada(null);
                    router.push("/criar-atividade");
                  }}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={16}
                    color={COR.marcador}
                  />
                  <Text style={styles.modalPreRequisitoBotaoSecundarioTexto}>
                    2. Criar atividade
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View
                  style={[
                    styles.modalBuscaBox,
                    ehDesktop && styles.modalBuscaBoxDesktop,
                  ]}
                >
                  <Ionicons name="search" size={16} color={COR.tintaFraca} />
                  <TextInput
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar atividade..."
                    placeholderTextColor={COR.tintaFraca}
                    style={[
                      styles.modalBuscaInput,
                      ehDesktop && styles.modalBuscaInputDesktop,
                    ]}
                  />
                </View>

                <ScrollView
                  style={styles.modalLista}
                  contentContainerStyle={{ paddingBottom: 8 }}
                >
                  {atividadesFiltradas.map((atividade) => (
                    <TouchableOpacity
                      key={atividade.id}
                      style={[
                        styles.modalAtividadeItem,
                        ehDesktop && styles.modalAtividadeItemDesktop,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => escolherAtividade(atividade)}
                    >
                      <View
                        style={[
                          styles.modalAtividadeIcone,
                          ehDesktop && styles.modalAtividadeIconeDesktop,
                          { backgroundColor: atividade.corFundo },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={atividade.icone}
                          size={ehDesktop ? 22 : 19}
                          color={atividade.corIcone}
                        />
                      </View>
                      <View style={styles.modalAtividadeTextos}>
                        <Text
                          style={[
                            styles.modalAtividadeTitulo,
                            ehDesktop && styles.modalAtividadeTituloDesktop,
                          ]}
                          numberOfLines={1}
                        >
                          {atividade.titulo}
                        </Text>
                        <Text
                          style={[
                            styles.modalAtividadeTurma,
                            ehDesktop && styles.modalAtividadeTurmaDesktop,
                          ]}
                          numberOfLines={1}
                        >
                          {atividade.turma}
                        </Text>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={COR.chevron}
                      />
                    </TouchableOpacity>
                  ))}

                  {atividadesFiltradas.length === 0 && (
                    <Text style={styles.modalVazioTexto}>
                      Nenhuma atividade encontrada.
                    </Text>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.modalNovaAtividade,
                      ehDesktop && styles.modalNovaAtividadeDesktop,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      setAcaoSelecionada(null);
                      router.push("/criar-atividade");
                    }}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={COR.marcador}
                    />
                    <Text
                      style={[
                        styles.modalNovaAtividadeTexto,
                        ehDesktop && styles.modalNovaAtividadeTextoDesktop,
                      ]}
                    >
                      Criar nova atividade
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 40, alignItems: "center" },
  conteudoInternoDesktop: { alignItems: "center" },
  miolo: { width: "92%", maxWidth: 1100 },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 56,
    marginBottom: 22,
  },
  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 24,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  cardScanner: {
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.superficie,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },
  cardScannerDesktop: { padding: 38, marginBottom: 24, alignItems: "center" },

  // -------------------------------------------------------------------------
  // Tamanhos só do computador.
  //
  // Esta tela usa o mesmo JSX nas duas larguras, então os estilos de baixo
  // entram empilhados por cima dos compartilhados:
  // [styles.historicoAluno, ehDesktop && styles.historicoAlunoDesktop].
  // O primeiro define, o segundo corrige, e o celular não passa por aqui.
  //
  // É o mesmo arranjo do AUMENTO_DESKTOP da Home. Para ajustar o tamanho do
  // web, é só este bloco.
  // -------------------------------------------------------------------------
  cardScannerTituloDesktop: { fontSize: 21, marginBottom: 8 },
  cardScannerSubtituloDesktop: {
    fontSize: 14.5,
    lineHeight: 21,
    maxWidth: 430,
    marginBottom: 24,
  },

  botaoAcaoDesktop: { paddingVertical: 16 },
  botaoAcaoTextoDesktop: { fontSize: 15 },

  historicoDesktop: {
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 6,
    marginTop: 20,
  },
  historicoTituloDesktop: { fontSize: 15, marginBottom: 8 },
  historicoLinhaDesktop: { paddingVertical: 15, gap: 13 },
  historicoSeloDesktop: { width: 34, height: 34, borderRadius: 17 },
  historicoAlunoDesktop: { fontSize: 15 },
  historicoAtividadeDesktop: { fontSize: 12.5 },
  historicoNotaDesktop: { fontSize: 16.5 },
  viewfinder: {
    width: 96,
    height: 96,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    position: "relative",
  },
  viewfinderDesktop: {
    width: 68,
    height: 68,
    borderRadius: RAIO.superficie,
    marginBottom: 12,
  },
  cantoViewfinder: {
    position: "absolute",
    width: 18,
    height: 18,
    borderColor: COR.branco,
  },
  cantoTopoEsquerdo: {
    top: 6,
    left: 6,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderTopLeftRadius: 6,
  },
  cantoTopoDireito: {
    top: 6,
    right: 6,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderTopRightRadius: 6,
  },
  cantoBaixoEsquerdo: {
    bottom: 6,
    left: 6,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderBottomLeftRadius: 6,
  },
  cantoBaixoDireito: {
    bottom: 6,
    right: 6,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderBottomRightRadius: 6,
  },
  cardScannerTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 17,
    fontWeight: "700",
    color: COR.branco,
    marginBottom: 6,
  },
  cardScannerSubtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.emAndamentoFundo,
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 320,
  },

  botoesLinha: { width: "100%", gap: 10, marginBottom: 18 },
  botoesLinhaMobile: { flexDirection: "column" },
  botoesLinhaDesktop: { flexDirection: "row" },

  // O botão da ação principal da tela. Amarelo sobre o bloco azul-marinho,
  // letra marinho — igual ao "Revisar" da Home.
  botaoPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: AMARELO,
    borderRadius: RAIO.superficie,
    paddingVertical: 13,
  },
  botaoPrincipalTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.marinho,
  },
  botaoSecundario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingVertical: 13,
  },
  botaoSecundarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.branco,
  },

  erroTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.perigo,
    width: "100%",
    textAlign: "center",
  },

  // No celular a folha sobe pela borda de baixo, perto do polegar. No
  // computador ninguém alcança o rodapé com o mouse mais rápido que o centro
  // da tela — e uma caixa colada embaixo parece que escorregou.
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    justifyContent: "flex-end",
  },
  modalFundoDesktop: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalFolha: {
    backgroundColor: COR.branco,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: "78%",
  },
  // A caixa de escolher a atividade cresceu junto com a tela. Ela estava com
  // 440 de largura e letra de celular, o que a deixava parecendo um aviso
  // pequeno em cima de uma tela grande.
  modalFolhaDesktop: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 560,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 24,
    maxHeight: "82%",
  },
  modalTituloDesktop: { fontSize: 19 },
  modalSubtituloDesktop: { fontSize: 13.5, marginTop: 3 },
  modalBuscaBoxDesktop: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 14,
  },
  modalBuscaInputDesktop: { fontSize: 14.5 },
  modalAtividadeItemDesktop: { paddingVertical: 14, gap: 14 },
  modalAtividadeIconeDesktop: { width: 44, height: 44, borderRadius: 13 },
  modalAtividadeTituloDesktop: { fontSize: 15 },
  modalAtividadeTurmaDesktop: { fontSize: 12.5, marginTop: 3 },
  modalNovaAtividadeDesktop: { paddingVertical: 15, marginTop: 16 },
  modalNovaAtividadeTextoDesktop: { fontSize: 14.5 },
  historico: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
    marginTop: 16,
  },
  historicoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.tintaForte,
    marginBottom: 6,
  },
  historicoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
  },
  historicoSelo: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  historicoSeloOk: { backgroundColor: COR.okFundo },
  historicoTextos: { flex: 1, gap: 1 },
  historicoAluno: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.tintaForte,
  },
  historicoAtividade: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },
  historicoNota: { fontFamily: FONTE.bold, fontSize: 14, color: COR.marinho },

  modalAlca: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COR.linha,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalCabecalhoTextos: { flex: 1, minWidth: 0, paddingRight: 10 },
  modalTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  modalSubtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    marginTop: 2,
  },
  modalFechar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COR.fundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  modalBuscaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COR.fundo,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalBuscaInput: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    padding: 0,
  },

  modalLista: { flexGrow: 0 },
  modalAtividadeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COR.fundo,
  },
  modalAtividadeIcone: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  modalAtividadeTextos: { flex: 1, minWidth: 0 },
  modalAtividadeTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    fontWeight: "600",
    color: COR.tintaForte,
  },
  modalAtividadeTurma: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 2,
  },
  modalVazioTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
    textAlign: "center",
    paddingVertical: 20,
  },

  modalPreRequisito: {
    alignItems: "center",
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 6,
  },
  modalPreRequisitoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "700",
    color: COR.tintaForte,
    textAlign: "center",
    marginTop: 4,
  },
  modalPreRequisitoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 12,
  },
  modalPreRequisitoBotao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
    marginTop: 6,
  },
  modalPreRequisitoBotaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.branco,
  },
  modalPreRequisitoBotaoSecundario: {
    backgroundColor: COR.fundo,
    borderWidth: 1,
    borderColor: COR.emAndamentoFundo,
  },
  modalPreRequisitoBotaoSecundarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.marcador,
  },

  modalNovaAtividade: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.emAndamentoFundo,
    backgroundColor: COR.fundo,
  },
  modalNovaAtividadeTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.marcador,
  },
});