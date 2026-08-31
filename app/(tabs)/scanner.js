import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
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
    corFundo: "#F1E9FB",
    corIcone: "#8B5CF6",
  },
  {
    id: "2",
    titulo: "Lista de Exercícios",
    turma: "8º Ano B",
    icone: "format-list-bulleted",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
  {
    id: "3",
    titulo: "Trabalho de Geometria",
    turma: "9º Ano A",
    icone: "shape-outline",
    corFundo: "#FEF0E4",
    corIcone: "#F5A623",
  },
  {
    id: "4",
    titulo: "Prova Bimestral",
    turma: "7º Ano B",
    icone: "school-outline",
    corFundo: "#FCE7F3",
    corIcone: "#DB2777",
  },
  {
    id: "5",
    titulo: "Exercícios de Frações",
    turma: "6º Ano A",
    icone: "fraction-one-half",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
];

const ACOES_SCANNER = {
  foto: { titulo: "Tirar Foto", icone: "camera-outline" },
  imagem: { titulo: "Enviar Imagem", icone: "image-outline" },
  pdf: { titulo: "Enviar PDF", icone: "document-outline" },
};

const DICAS = [
  { icone: "sunny-outline", texto: "Boa iluminação" },
  { icone: "scan-outline", texto: "Folha inteira visível" },
  { icone: "sparkles-outline", texto: "Imagem nítida" },
];

const RECURSOS = [
  {
    icone: "eye-outline",
    titulo: "Reconhecimento Automático",
    descricao: "Identifica respostas e questões sozinho",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
  {
    icone: "shield-checkmark-outline",
    titulo: "Alta Precisão",
    descricao: "Correção confiável com IA treinada",
    corFundo: "#E7F8EF",
    corIcone: "#22C55E",
  },
  {
    icone: "layers-outline",
    titulo: "Lote de Folhas",
    descricao: "Envie várias folhas de uma vez",
    corFundo: "#F1E9FB",
    corIcone: "#8B5CF6",
  },
];

const UPLOADS_RECENTES = [
  {
    id: "1",
    nome: "Prova_Algebra_Turma8A.pdf",
    detalhe: "12 páginas · Hoje, 09:42",
    icone: "document-text-outline",
    corFundo: "#FCE7E7",
    corIcone: "#EF4444",
  },
  {
    id: "2",
    nome: "Lista_Exercicios_09.jpg",
    detalhe: "1 página · Ontem, 16:10",
    icone: "image-outline",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
  {
    id: "3",
    nome: "Trabalho_Geometria.pdf",
    detalhe: "6 páginas · Há 2 dias",
    icone: "document-text-outline",
    corFundo: "#FCE7E7",
    corIcone: "#EF4444",
  },
  {
    id: "4",
    nome: "Redacao_Turma7B.jpg",
    detalhe: "1 página · Há 3 dias",
    icone: "image-outline",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
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
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
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
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>Scanner</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Card azul de destaque */}
          <View style={[styles.cardScanner, ehDesktop && styles.cardScannerDesktop]}>
            <View style={[styles.viewfinder, ehDesktop && styles.viewfinderDesktop]}>
              {/* Os cantinhos de "visor de câmera" só fazem sentido no
                  tamanho grande do mobile — no desktop o quadrado é
                  pequeno e eles ficariam apertados/estranhos */}
              {!ehDesktop && (
                <>
                  <View style={[styles.cantoViewfinder, styles.cantoTopoEsquerdo]} />
                  <View style={[styles.cantoViewfinder, styles.cantoTopoDireito]} />
                  <View style={[styles.cantoViewfinder, styles.cantoBaixoEsquerdo]} />
                  <View style={[styles.cantoViewfinder, styles.cantoBaixoDireito]} />
                </>
              )}
              <Ionicons name="camera-outline" size={ehDesktop ? 26 : 32} color="#FFFFFF" />
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
                <Ionicons name="camera" size={17} color="#3B82F6" />
                <Text style={styles.botaoPrincipalTexto}>Tirar Foto</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botaoSecundario, ehDesktop && { flex: 1 }]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("imagem")}
              >
                <Ionicons name="image-outline" size={17} color="#FFFFFF" />
                <Text style={styles.botaoSecundarioTexto}>Enviar Imagem</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botaoSecundario, ehDesktop && { flex: 1 }]}
                activeOpacity={0.85}
                onPress={() => abrirEscolhaDeAtividade("pdf")}
              >
                <Ionicons name="document-outline" size={17} color="#FFFFFF" />
                <Text style={styles.botaoSecundarioTexto}>Enviar PDF</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dicasLinha}>
              {/* Chip diferente dos outros (fundo mais forte, texto em
                  negrito) só pra sinalizar "isso aqui é um rótulo", não
                  mais uma dica igual às outras */}
              <View style={styles.dicaRotuloChip}>
                <Ionicons name="bulb-outline" size={11} color="#FFFFFF" />
                <Text style={styles.dicaRotuloTexto}>Dicas para melhores resultados</Text>
              </View>

              {DICAS.map((dica) => (
                <View key={dica.texto} style={styles.dicaChip}>
                  <Ionicons name={dica.icone} size={11} color="#BFDBFE" />
                  <Text style={styles.dicaTexto}>{dica.texto}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Cards de recursos */}
          <View
            style={[
              styles.recursosGrade,
              ehDesktop ? styles.recursosGradeDesktop : styles.recursosGradeMobile,
            ]}
          >
            {RECURSOS.map((recurso) => (
              <View
                key={recurso.titulo}
                style={[
                  styles.recursoCard,
                  ehDesktop ? styles.recursoCardDesktop : styles.recursoCardMobile,
                  { backgroundColor: recurso.corFundo },
                ]}
              >
                <View style={[styles.recursoIconeCirculo, { backgroundColor: "rgba(255,255,255,0.65)" }]}>
                  <Ionicons name={recurso.icone} size={14} color={recurso.corIcone} />
                </View>
                <Text style={[styles.recursoTitulo, { color: recurso.corIcone }]}>
                  {recurso.titulo}
                </Text>
                <Text style={styles.recursoDescricao}>{recurso.descricao}</Text>
              </View>
            ))}
          </View>

          {/* Uploads recentes */}
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
                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modal: escolher pra qual atividade cadastrada vai a captura */}
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
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {ATIVIDADES_CADASTRADAS.length === 0 ? (
              // Sem atividade cadastrada: mostra o aviso em vez da busca.
              <View style={styles.modalPreRequisito}>
                <Ionicons name="alert-circle-outline" size={28} color="#F5A623" />
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
                  <Ionicons name="people-outline" size={16} color="#FFFFFF" />
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
                  <Ionicons name="document-text-outline" size={16} color="#3B82F6" />
                  <Text style={styles.modalPreRequisitoBotaoSecundarioTexto}>
                    2. Criar atividade
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.modalBuscaBox}>
                  <Ionicons name="search" size={16} color="#94A3B8" />
                  <TextInput
                    value={busca}
                    onChangeText={setBusca}
                    placeholder="Buscar atividade..."
                    placeholderTextColor="#94A3B8"
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
                      <Ionicons name="chevron-forward" size={18} color="#CBD5E1" />
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
                    <Ionicons name="add-circle-outline" size={18} color="#3B82F6" />
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
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

  // Estilos do cabeçalho (no mobile quem desenha é o CabecalhoMobile).
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

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
  tituloPaginaDesktop: { fontSize: 20, fontWeight: "700", color: "#0B1E3D" },
  toolbarDesktop: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarPequenoClaro: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPequenoClaroTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  usuarioNomeClaro: { fontSize: 13, fontWeight: "600", color: "#0B1E3D" },

  // ----- card do scanner -----
  cardScanner: {
    width: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 18,
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
  // No desktop o visor da câmera fica menor.
  viewfinderDesktop: { width: 56, height: 56, borderRadius: 14, marginBottom: 12 },
  cantoViewfinder: {
    position: "absolute",
    width: 18,
    height: 18,
    borderColor: "#FFFFFF",
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
  cardScannerTitulo: { fontSize: 17, fontWeight: "700", color: "#FFFFFF", marginBottom: 6 },
  cardScannerSubtitulo: {
    fontSize: 12.5,
    color: "#BFDBFE",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoPrincipalTexto: { fontSize: 13.5, fontWeight: "700", color: "#3B82F6" },
  botaoSecundario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingVertical: 13,
  },
  botaoSecundarioTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },

  dicasLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "center",
    marginTop: 2,
  },
  // Rótulo em destaque.
  dicaRotuloChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dicaRotuloTexto: { fontSize: 9, color: "#FFFFFF", fontWeight: "700" },
  // Cada dica é um chip pequeno.
  dicaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dicaTexto: { fontSize: 9, color: "#BFDBFE", fontWeight: "600" },

  // ----- recursos -----
  recursosGrade: { width: "100%", gap: 8, marginBottom: 16 },
  recursosGradeMobile: { flexDirection: "column" },
  recursosGradeDesktop: { flexDirection: "row", marginBottom: 18 },
  recursoCard: {
    borderRadius: 12,
    padding: 10,
  },
  recursoCardMobile: { width: "100%" },
  recursoCardDesktop: { flex: 1 },
  recursoIconeCirculo: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  recursoTitulo: { fontSize: 11.5, fontWeight: "700", marginBottom: 1 },
  recursoDescricao: { fontSize: 10, color: "#5C7096" },

  // ----- uploads recentes -----
  secaoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 18,
    marginBottom: 16,
  },
  secaoCardDesktop: { padding: 24, marginBottom: 22 },
  secaoTitulo: { fontSize: 14, fontWeight: "700", color: "#0B1E3D", marginBottom: 14 },
  secaoTituloDesktop: { fontSize: 16 },

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
  uploadNome: { fontSize: 13, fontWeight: "600", color: "#0B1E3D" },
  uploadDetalhe: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  uploadSeta: { flexShrink: 0, padding: 2 },

  // ----- modal de escolha de atividade -----
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    justifyContent: "flex-end",
  },
  modalFolha: {
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#E2E8F0",
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
  modalTitulo: { fontSize: 16, fontWeight: "700", color: "#0B1E3D" },
  modalSubtitulo: { fontSize: 12, color: "#64748B", marginTop: 2 },
  modalFechar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  modalBuscaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F4F6FA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalBuscaInput: { flex: 1, fontSize: 13, color: "#0B1E3D", padding: 0 },

  modalLista: { flexGrow: 0 },
  modalAtividadeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F4F6FA",
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
  modalAtividadeTitulo: { fontSize: 13, fontWeight: "600", color: "#0B1E3D" },
  modalAtividadeTurma: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  modalVazioTexto: {
    fontSize: 12.5,
    color: "#94A3B8",
    textAlign: "center",
    paddingVertical: 20,
  },

  // ----- aviso de pré-requisito (sem turma/atividade cadastrada) -----
  modalPreRequisito: {
    alignItems: "center",
    paddingVertical: 12,
    paddingBottom: 20,
    gap: 6,
  },
  modalPreRequisitoTitulo: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0B1E3D",
    textAlign: "center",
    marginTop: 4,
  },
  modalPreRequisitoTexto: {
    fontSize: 12.5,
    color: "#64748B",
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
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 13,
    marginTop: 6,
  },
  modalPreRequisitoBotaoTexto: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },
  modalPreRequisitoBotaoSecundario: {
    backgroundColor: "#F7FAFF",
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  modalPreRequisitoBotaoSecundarioTexto: { fontSize: 13, fontWeight: "700", color: "#3B82F6" },

  modalNovaAtividade: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8F0FE",
    backgroundColor: "#F7FAFF",
  },
  modalNovaAtividadeTexto: { fontSize: 13, fontWeight: "700", color: "#3B82F6" },
});