import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  Image,
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

const INICIAIS_PROFESSOR = "AS";

// Atividades do modal "Selecionar atividade". Lista vazia = a tela mostra o
// aviso pedindo pra criar turma e atividade antes.
//
// API — GET /atividades
//
//   const [atividades, setAtividades] = useState([]);
//
//   useEffect(() => {
//     fetch("http://localhost:3000/atividades", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then(setAtividades);
//   }, []);
const ATIVIDADES_CADASTRADAS = [
  {
    id: "1",
    titulo: "Prova de Álgebra",
    turma: "9º Ano A · Turma B",
    icone: "function-variant",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
  {
    id: "2",
    titulo: "Lista de Exercícios",
    turma: "8º Ano B",
    icone: "format-list-bulleted",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
  {
    id: "3",
    titulo: "Trabalho de Geometria",
    turma: "9º Ano A",
    icone: "shape-outline",
    corFundo: COR.avisoFundo,
    corIcone: COR.avisoTexto,
  },
  {
    id: "4",
    titulo: "Prova Bimestral",
    turma: "7º Ano B",
    icone: "school-outline",
    corFundo: COR.avisoFundo,
    corIcone: COR.marcador,
  },
  {
    id: "5",
    titulo: "Exercícios de Frações",
    turma: "6º Ano A",
    icone: "fraction-one-half",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
];

const ACOES_SCANNER = {
  foto: { titulo: "Tirar Foto", icone: "camera-outline" },
  imagem: { titulo: "Enviar Imagem", icone: "image-outline" },
  pdf: { titulo: "Enviar PDF", icone: "document-outline" },
};

const UPLOADS_RECENTES = [
  {
    id: "1",
    nome: "Prova_Algebra_Turma8A.pdf",
    detalhe: "12 páginas · Hoje, 09:42",
    icone: "document-text-outline",
    corFundo: COR.perigoFundo,
    corIcone: COR.perigo,
  },
  {
    id: "2",
    nome: "Lista_Exercicios_09.jpg",
    detalhe: "1 página · Ontem, 16:10",
    icone: "image-outline",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
  {
    id: "3",
    nome: "Trabalho_Geometria.pdf",
    detalhe: "6 páginas · Há 2 dias",
    icone: "document-text-outline",
    corFundo: COR.perigoFundo,
    corIcone: COR.perigo,
  },
  {
    id: "4",
    nome: "Redacao_Turma7B.jpg",
    detalhe: "1 página · Há 3 dias",
    icone: "image-outline",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
];

export default function Scanner() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();

  const [acaoSelecionada, setAcaoSelecionada] = useState(null);
  const [busca, setBusca] = useState("");

  function abrirEscolhaDeAtividade(acao) {
    setBusca("");
    setAcaoSelecionada(acao);
  }

  // Depois de escolher a atividade, vai pro Processando (preview + envio).
  //
  // API — aqui é onde entram a câmera e o seletor de arquivo de verdade.
  // Hoje nenhuma imagem é capturada: a tela só navega. Com expo-image-picker
  // e expo-camera instalados, seria mais ou menos assim:
  //
  //   import * as ImagePicker from "expo-image-picker";
  //
  //   const resultado = await ImagePicker.launchCameraAsync({ quality: 0.8 });
  //   if (resultado.canceled) return;
  //
  //   router.push({
  //     pathname: "/processando",
  //     params: {
  //       atividadeTitulo: atividade.titulo,
  //       atividadeTurma: atividade.turma,
  //       id_atividade: atividade.id,
  //       imagemUri: resultado.assets[0].uri,   // o Processando faz o upload
  //     },
  //   });
  function escolherAtividade(atividade) {
    setAcaoSelecionada(null);
    router.push({
      pathname: "/processando",
      params: { atividadeTitulo: atividade.titulo, atividadeTurma: atividade.turma },
    });
  }

  const atividadesFiltradas = ATIVIDADES_CADASTRADAS.filter((atividade) =>
    atividade.titulo.toLowerCase().includes(busca.toLowerCase())
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
          style={[ehDesktop ? styles.miolo : { width: "100%" }, ehTelaLarga && { maxWidth: 1100 }]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Scanner</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.cardScanner, ehDesktop && styles.cardScannerDesktop]}>
            <View style={[styles.viewfinder, ehDesktop && styles.viewfinderDesktop]}>
              {!ehDesktop && (
                <>
                  <View style={[styles.cantoViewfinder, styles.cantoTopoEsquerdo]} />
                  <View style={[styles.cantoViewfinder, styles.cantoTopoDireito]} />
                  <View style={[styles.cantoViewfinder, styles.cantoBaixoEsquerdo]} />
                  <View style={[styles.cantoViewfinder, styles.cantoBaixoDireito]} />
                </>
              )}
              <Ionicons name="camera-outline" size={ehDesktop ? 26 : 32} color={COR.branco} />
            </View>

            <Text style={styles.cardScannerTitulo}>Scanner de Atividades</Text>
            <Text style={styles.cardScannerSubtitulo}>
              Fotografe ou envie a folha de respostas para corrigir automaticamente
            </Text>

            <View
              style={[
                styles.botoesLinha,
                ehDesktop ? styles.botoesLinhaDesktop : styles.botoesLinhaMobile,
              ]}
            >
              <TouchableOpacity
                style={[styles.botaoPrincipal, ehDesktop && { flex: 1 }]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("foto")}
              >
                <Ionicons name="camera" size={17} color={COR.marcador} />
                <Text style={styles.botaoPrincipalTexto}>Tirar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botaoSecundario, ehDesktop && { flex: 1 }]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("imagem")}
              >
                <Ionicons name="image-outline" size={17} color={COR.branco} />
                <Text style={styles.botaoSecundarioTexto}>Enviar Imagem</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botaoSecundario, ehDesktop && { flex: 1 }]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("pdf")}
              >
                <Ionicons name="document-outline" size={17} color={COR.branco} />
                <Text style={styles.botaoSecundarioTexto}>Enviar PDF</Text>
              </TouchableOpacity>
            </View>

          </View>

          <View style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}>
            <Text style={[styles.secaoTitulo, ehDesktop && styles.secaoTituloDesktop]}>
              Uploads recentes
            </Text>

            <View style={styles.listaUploads}>
              {UPLOADS_RECENTES.map((upload) => (
                <View key={upload.id} style={styles.uploadItem}>
                  <View style={[styles.uploadIconeCirculo, { backgroundColor: upload.corFundo }]}>
                    <Ionicons name={upload.icone} size={18} color={upload.corIcone} />
                  </View>
                  <View style={styles.uploadTextos}>
                    <Text style={styles.uploadNome} numberOfLines={1}>
                      {upload.nome}
                    </Text>
                    <Text style={styles.uploadDetalhe}>{upload.detalhe}</Text>
                  </View>
                  <TouchableOpacity style={styles.uploadSeta} activeOpacity={0.7}>
                    <Ionicons name="chevron-forward" size={18} color={COR.tintaFraca} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!acaoSelecionada}
        transparent
        animationType="slide"
        onRequestClose={() => setAcaoSelecionada(null)}
      >
        <Pressable style={styles.modalFundo} onPress={() => setAcaoSelecionada(null)}>
          <Pressable
            style={[styles.modalFolha, ehDesktop && styles.modalFolhaDesktop]}
            onPress={() => {}}
          >
            <View style={styles.modalAlca} />

            <View style={styles.modalCabecalho}>
              <View style={styles.modalCabecalhoTextos}>
                <Text style={styles.modalTitulo}>Selecionar atividade</Text>
                <Text style={styles.modalSubtitulo}>
                  {acaoSelecionada
                    ? `${ACOES_SCANNER[acaoSelecionada].titulo} para qual atividade?`
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

            {ATIVIDADES_CADASTRADAS.length === 0 ? (
              <View style={styles.modalPreRequisito}>
                <Ionicons name="alert-circle-outline" size={28} color={COR.avisoTexto} />
                <Text style={styles.modalPreRequisitoTitulo}>
                  Você ainda não tem nenhuma atividade cadastrada
                </Text>
                <Text style={styles.modalPreRequisitoTexto}>
                  Pra usar o scanner, primeiro crie uma turma e depois uma atividade anexada a
                  ela — só assim dá pra saber pra onde mandar a correção.
                </Text>

                <TouchableOpacity
                  style={styles.modalPreRequisitoBotao}
                  activeOpacity={0.85}
                  onPress={() => {
                    setAcaoSelecionada(null);
                    router.push("/turmas");
                  }}
                >
                  <Ionicons name="people-outline" size={16} color={COR.branco} />
                  <Text style={styles.modalPreRequisitoBotaoTexto}>1. Criar turma</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalPreRequisitoBotao, styles.modalPreRequisitoBotaoSecundario]}
                  activeOpacity={0.85}
                  onPress={() => {
                    setAcaoSelecionada(null);
                    router.push("/criar-atividade");
                  }}
                >
                  <Ionicons name="document-text-outline" size={16} color={COR.marcador} />
                  <Text style={styles.modalPreRequisitoBotaoSecundarioTexto}>
                    2. Criar atividade
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalBuscaBox}>
                  <Ionicons name="search" size={16} color={COR.tintaFraca} />
                  <TextInput
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar atividade..."
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.modalBuscaInput}
                  />
                </View>

                <ScrollView style={styles.modalLista} contentContainerStyle={{ paddingBottom: 8 }}>
                  {atividadesFiltradas.map((atividade) => (
                    <TouchableOpacity
                      key={atividade.id}
                      style={styles.modalAtividadeItem}
                      activeOpacity={0.7}
                      onPress={() => escolherAtividade(atividade)}
                    >
                      <View
                        style={[
                          styles.modalAtividadeIcone,
                          { backgroundColor: atividade.corFundo },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={atividade.icone}
                          size={19}
                          color={atividade.corIcone}
                        />
                      </View>
                      <View style={styles.modalAtividadeTextos}>
                        <Text style={styles.modalAtividadeTitulo} numberOfLines={1}>
                          {atividade.titulo}
                        </Text>
                        <Text style={styles.modalAtividadeTurma} numberOfLines={1}>
                          {atividade.turma}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={COR.chevron} />
                    </TouchableOpacity>
                  ))}

                  {atividadesFiltradas.length === 0 && (
                    <Text style={styles.modalVazioTexto}>Nenhuma atividade encontrada.</Text>
                  )}

                  <TouchableOpacity
                    style={styles.modalNovaAtividade}
                    activeOpacity={0.8}
                    onPress={() => {
                      setAcaoSelecionada(null);
                      router.push("/criar-atividade");
                    }}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={COR.marcador} />
                    <Text style={styles.modalNovaAtividadeTexto}>Criar nova atividade</Text>
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
  tituloPaginaDesktop: { fontFamily: FONTE.bold, fontSize: 20, fontWeight: "700", color: COR.tintaForte },

  cardScanner: {
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.superficie,
    padding: 22,
    alignItems: "center",
    marginBottom: 16,
  },
  cardScannerDesktop: { padding: 30, marginBottom: 22, alignItems: "center" },
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
  viewfinderDesktop: { width: 56, height: 56, borderRadius: RAIO.superficie, marginBottom: 12 },
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
  cardScannerTitulo: { fontFamily: FONTE.bold, fontSize: 17, fontWeight: "700", color: COR.branco, marginBottom: 6 },
  cardScannerSubtitulo: {
    fontFamily: FONTE.regular, fontSize: 12.5,
    color: COR.emAndamentoFundo,
    textAlign: "center",
    marginBottom: 20,
    maxWidth: 320,
  },

  botoesLinha: { width: "100%", gap: 10, marginBottom: 18 },
  botoesLinhaMobile: { flexDirection: "column" },
  botoesLinhaDesktop: { flexDirection: "row" },
  botaoPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    paddingVertical: 13,
  },
  botaoPrincipalTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.marcador },
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
  botaoSecundarioTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.branco },

  secaoCard: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
    marginBottom: 16,
  },
  secaoCardDesktop: { padding: 24, marginBottom: 22 },
  secaoTitulo: { fontFamily: FONTE.bold, fontSize: 14, fontWeight: "700", color: COR.tintaForte, marginBottom: 14 },
  secaoTituloDesktop: { fontFamily: FONTE.regular, fontSize: 16 },

  listaUploads: { gap: 4 },
  uploadItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  uploadIconeCirculo: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  uploadTextos: { flex: 1, minWidth: 0 },
  uploadNome: { fontFamily: FONTE.semi, fontSize: 13, fontWeight: "600", color: COR.tintaForte },
  uploadDetalhe: { fontFamily: FONTE.regular, fontSize: 11, color: COR.tintaFraca, marginTop: 2 },
  uploadSeta: { flexShrink: 0, padding: 2 },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    justifyContent: "flex-end",
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
  modalFolhaDesktop: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 440,
    borderRadius: 22,
    marginBottom: 40,
  },
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
  modalTitulo: { fontFamily: FONTE.bold, fontSize: 16, fontWeight: "700", color: COR.tintaForte },
  modalSubtitulo: { fontFamily: FONTE.regular, fontSize: 12, color: COR.tintaMedia, marginTop: 2 },
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
  modalBuscaInput: { flex: 1, fontFamily: FONTE.regular, fontSize: 13, color: COR.tintaForte, padding: 0 },

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
  modalAtividadeTitulo: { fontFamily: FONTE.semi, fontSize: 13, fontWeight: "600", color: COR.tintaForte },
  modalAtividadeTurma: { fontFamily: FONTE.regular, fontSize: 11, color: COR.tintaFraca, marginTop: 2 },
  modalVazioTexto: {
    fontFamily: FONTE.regular, fontSize: 12.5,
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
    fontFamily: FONTE.bold, fontSize: 14,
    fontWeight: "700",
    color: COR.tintaForte,
    textAlign: "center",
    marginTop: 4,
  },
  modalPreRequisitoTexto: {
    fontFamily: FONTE.regular, fontSize: 12.5,
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
  modalPreRequisitoBotaoTexto: { fontFamily: FONTE.bold, fontSize: 13, fontWeight: "700", color: COR.branco },
  modalPreRequisitoBotaoSecundario: {
    backgroundColor: COR.fundo,
    borderWidth: 1,
    borderColor: COR.emAndamentoFundo,
  },
  modalPreRequisitoBotaoSecundarioTexto: { fontFamily: FONTE.bold, fontSize: 13, fontWeight: "700", color: COR.marcador },

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
  modalNovaAtividadeTexto: { fontFamily: FONTE.bold, fontSize: 13, fontWeight: "700", color: COR.marcador },
});