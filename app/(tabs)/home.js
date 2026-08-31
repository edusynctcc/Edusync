// A fonte do título é a Baloo 2: instale com
// npx expo install expo-font @expo-google-fonts/baloo-2 e carregue no app/_layout.tsx.
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from "react-native";

// Lista que a busca do Home percorre.
//
// ---------------------------------------------------------------------------
// API — GET /turmas  +  GET /atividades
// Esses títulos são fixos e espelham os mocks de turmas.js e atividades.js.
// Pra virem do back-end, troque a constante por estado e busque os dois:
//
//   const [indiceBusca, setIndiceBusca] = useState([]);
//
//   useEffect(() => {
//     async function carregar() {
//       const cabecalho = { Authorization: `Bearer ${token}` };
//       const [turmas, atividades] = await Promise.all([
//         fetch("http://localhost:3000/turmas", { headers: cabecalho }).then((r) => r.json()),
//         fetch("http://localhost:3000/atividades", { headers: cabecalho }).then((r) => r.json()),
//       ]);
//
//       setIndiceBusca([
//         ...turmas.map((t) => ({ tipo: "turma", titulo: t.nome, subtitulo: t.escola })),
//         ...atividades.map((a) => ({ tipo: "atividade", titulo: a.nome, subtitulo: a.descricao })),
//       ]);
//     }
//     carregar();
//   }, []);
// ---------------------------------------------------------------------------
const INDICE_BUSCA = [
  { tipo: "turma", titulo: "9º Ano A", subtitulo: "E.E. Marechal Rondon" },
  { tipo: "turma", titulo: "1ª Série B", subtitulo: "E.E. Marechal Rondon" },
  { tipo: "turma", titulo: "7º Ano C", subtitulo: "Colégio Santa Clara" },
  { tipo: "atividade", titulo: "Prova de Álgebra", subtitulo: "Prova sobre equações e funções" },
  { tipo: "atividade", titulo: "Lista de Exercícios", subtitulo: "Exercícios de sistemas lineares" },
  { tipo: "atividade", titulo: "Trabalho de Geometria", subtitulo: "Figuras planas e espaciais" },
  { tipo: "atividade", titulo: "Prova Bimestral", subtitulo: "Conteúdos do 1º bimestre" },
  { tipo: "atividade", titulo: "Exercícios de Frações", subtitulo: "Operações com frações" },
  { tipo: "atividade", titulo: "Projeto de Estatística", subtitulo: "Pesquisa e análise de dados" },
];

// Nome que aparece na saudação e as iniciais do avatar.
//
// API — GET /auth/me
// Devolve os dados do professor logado a partir do token:
//
//   const [professor, setProfessor] = useState(null);
//
//   useEffect(() => {
//     fetch("http://localhost:3000/auth/me", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then(setProfessor);
//   }, []);
//
// As iniciais dá pra montar do próprio nome, sem campo novo no banco:
//   const iniciais = professor.nome.split(" ").map((p) => p[0]).slice(0, 2).join("");
const NOME_PROFESSOR = "Ana";
const INICIAIS_PROFESSOR = "AS";

const ATALHOS = [
  {
    chave: "turmas",
    titulo: "Minhas turmas",
    descricao: "Gerencie suas turmas e veja os alunos.",
    icone: "people-outline",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
    biblioteca: "ion",
    rota: "/turmas",
  },
  {
    chave: "atividades",
    titulo: "Atividades",
    descricao: "Visualize e edite suas atividades criadas.",
    icone: "clipboard-outline",
    corFundo: "#E7F8EF",
    corIcone: "#22C55E",
    biblioteca: "ion",
    rota: "/atividades",
  },
  {
    chave: "scanner",
    titulo: "Scanner",
    descricao: "Escaneie ou envie atividades para correção.",
    icone: "camera-outline",
    corFundo: "#F1E9FB",
    corIcone: "#8B5CF6",
    biblioteca: "ion",
    rota: "/scanner",
  },
  {
    chave: "correcoes",
    titulo: "Correções",
    descricao: "Acompanhe o progresso das correções da IA.",
    icone: "create-outline",
    corFundo: "#FEF0E4",
    corIcone: "#F5A623",
    biblioteca: "ion",
    rota: "/correcoes",
  },
  // Atalhos do "Acesso rápido".
];

export default function Home() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const ehMobilePequeno = width < 360;
  // 2 colunas (1 só em celular pequeno).
  const colunasGrade = ehMobilePequeno ? 1 : 2;
  const larguraCardGrade = colunasGrade === 1 ? "100%" : "48%";
  const [dicaVisivel, setDicaVisivel] = useState(true);
  const [buscaHome, setBuscaHome] = useState("");
  const router = useRouter();

  const buscaNormalizada = buscaHome.trim().toLowerCase();
  const resultadosBusca = buscaNormalizada
    ? INDICE_BUSCA.filter((item) => item.titulo.toLowerCase().includes(buscaNormalizada))
    : [];

  function abrirResultado(item) {
    setBuscaHome("");
    if (item.tipo === "turma") {
      router.push({ pathname: "/turmas", params: { turmaBusca: item.titulo } });
    } else {
      router.push({ pathname: "/atividades", params: { atividadeTitulo: item.titulo } });
    }
  }

  return (
    // paddingTop reserva o espaço da navbar do topo.
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
      {!ehDesktop && <CabecalhoMobile ehMobilePequeno={ehMobilePequeno} />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View
          style={[
            ehDesktop ? styles.miolo : { width: "100%" },
            ehTelaLarga && { maxWidth: 1300 },
          ]}
        >
          {ehDesktop ? (
            // O avatar fica na navbar, não aqui.
            <View style={styles.cabecalhoDesktopLinha}>
              <View style={styles.avatarSaudacaoLinha}>
                <View style={styles.avatarGrandeDesktop}>
                  <Text style={styles.avatarGrandeTexto}>{INICIAIS_PROFESSOR}</Text>
                </View>
                <View>
                  <Text style={styles.saudacaoDesktop}>
                    Olá, Prof. {NOME_PROFESSOR}!
                  </Text>
                  <Text style={styles.subtituloDesktop}>
                    O que você deseja fazer hoje?
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.avatarGrandeWrap}>
                <View style={styles.avatarGrande}>
                  <Text style={styles.avatarGrandeTexto}>{INICIAIS_PROFESSOR}</Text>
                </View>
              </View>

              <Text style={styles.saudacao}>Olá, Prof. {NOME_PROFESSOR}!</Text>
              <Text style={styles.subtitulo}>O que você deseja fazer hoje?</Text>
            </>
          )}

          {/* Busca — no desktop já tem a busca da navbar (lupinha lá em
              cima), então essa caixa aqui só aparece no mobile, que não
              tem navbar com lupinha. */}
          {!ehDesktop && (
            <>
              <View style={styles.buscaHomeBox}>
                <Ionicons name="search" size={16} color="#94A3B8" />
                <TextInput
                  value={buscaHome}
                  onChangeText={setBuscaHome}
                  placeholder="Buscar turma ou atividade..."
                  placeholderTextColor="#94A3B8"
                  style={styles.buscaHomeInput}
                />
                {buscaHome.length > 0 && (
                  <TouchableOpacity onPress={() => setBuscaHome("")} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                )}
              </View>

              {buscaNormalizada.length > 0 && (
                <View style={styles.resultadosBuscaBox}>
                  {resultadosBusca.length === 0 ? (
                    <Text style={styles.resultadoVazioTexto}>
                      Nada encontrado para "{buscaHome}"
                    </Text>
                  ) : (
                    resultadosBusca.map((item) => (
                      <TouchableOpacity
                        key={`${item.tipo}-${item.titulo}`}
                        style={styles.resultadoItem}
                        activeOpacity={0.7}
                        onPress={() => abrirResultado(item)}
                      >
                        <View
                          style={[
                            styles.resultadoIconeCirculo,
                            {
                              backgroundColor: item.tipo === "turma" ? "#E8F0FE" : "#E7F8EF",
                            },
                          ]}
                        >
                          <Ionicons
                            name={item.tipo === "turma" ? "people-outline" : "document-text-outline"}
                            size={16}
                            color={item.tipo === "turma" ? "#3B82F6" : "#22C55E"}
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.resultadoTitulo} numberOfLines={1}>
                            {item.titulo}
                          </Text>
                          <Text style={styles.resultadoSubtitulo} numberOfLines={1}>
                            {item.tipo === "turma" ? "Turma" : "Atividade"} · {item.subtitulo}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </>
          )}

          <TouchableOpacity
            style={styles.cardNovaAtividade}
            activeOpacity={0.9}
            onPress={() => router.push("/criar-atividade")}
          >
            <View style={styles.cardNovaAtividadeIcone}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.cardNovaAtividadeTextos}>
              <Text style={styles.cardNovaAtividadeTitulo}>Nova atividade</Text>
              <Text style={styles.cardNovaAtividadeDescricao}>
                Criar e configurar uma nova atividade para uma turma.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.secaoTitulo}>Acesso rápido</Text>

          <View style={styles.grade}>
            {ATALHOS.map((item) => (
              <TouchableOpacity
                key={item.chave}
                style={[
                  styles.atalhoCard,
                  { width: larguraCardGrade },
                  ehDesktop && styles.atalhoCardDesktop,
                ]}
                activeOpacity={0.85}
                onPress={() => item.rota && router.push(item.rota)}
              >
                <View
                  style={[
                    styles.atalhoIconeCirculo,
                    { backgroundColor: item.corFundo },
                    ehDesktop && styles.atalhoIconeCirculoDesktop,
                  ]}
                >
                  {item.biblioteca === "mci" ? (
                    <MaterialCommunityIcons
                      name={item.icone}
                      size={ehDesktop ? 22 : 18}
                      color={item.corIcone}
                    />
                  ) : (
                    <Ionicons
                      name={item.icone}
                      size={ehDesktop ? 22 : 18}
                      color={item.corIcone}
                    />
                  )}
                </View>
                <View style={styles.atalhoTextos}>
                  <Text style={[styles.atalhoTitulo, ehDesktop && styles.atalhoTituloDesktop]}>
                    {item.titulo}
                  </Text>
                  <Text
                    style={[styles.atalhoDescricao, ehDesktop && styles.atalhoDescricaoDesktop]}
                  >
                    {item.descricao}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={ehDesktop ? 18 : 16} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>

          {dicaVisivel && (
            <View style={styles.dicaBox}>
              <Ionicons name="star" size={18} color="#3B82F6" style={{ marginTop: 1 }} />
              <View style={styles.dicaTextos}>
                <Text style={styles.dicaTitulo}>Dica rápida</Text>
                <Text style={styles.dicaDescricao}>
                  Você pode configurar critérios de correção personalizados para cada tipo de
                  questão.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDicaVisivel(false)}>
                <Ionicons name="close" size={18} color="#3B82F6" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
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
    marginTop: 16,
    marginBottom: 24,
  },
  avatarSaudacaoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarGrandeDesktop: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
  },
  // Fonte Baloo 2 (carregada no app/_layout.tsx).
  saudacaoDesktop: {
    fontSize: 20,
    fontFamily: Platform.OS === "web" ? "Baloo2_800ExtraBold, sans-serif" : "Baloo2_800ExtraBold",
    color: "#0B1E3D",
  },
  subtituloDesktop: { fontSize: 13, color: "#64748B", marginTop: 2 },

  toolbarDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
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
  sinoClaro: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EBF3",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

  avatarGrandeWrap: { alignSelf: "center", marginTop: 8, marginBottom: 16 },
  avatarGrande: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGrandeTexto: { color: "#FFFFFF", fontSize: 22, fontWeight: "700" },

  saudacao: {
    fontSize: 20,
    fontFamily: Platform.OS === "web" ? "Baloo2_800ExtraBold, sans-serif" : "Baloo2_800ExtraBold",
    color: "#0B1E3D",
    textAlign: "center",
  },
  subtitulo: { fontSize: 13, color: "#64748B", marginTop: 4, marginBottom: 20, textAlign: "center" },

  buscaHomeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7EBF3",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  buscaHomeInput: { flex: 1, fontSize: 13.5, color: "#0B1E3D", padding: 0 },

  resultadosBuscaBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E7EBF3",
    padding: 8,
    marginBottom: 16,
    gap: 2,
  },
  resultadoVazioTexto: {
    fontSize: 12.5,
    color: "#94A3B8",
    padding: 10,
    textAlign: "center",
  },
  resultadoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 10,
  },
  resultadoIconeCirculo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resultadoTitulo: { fontSize: 13, fontWeight: "700", color: "#0B1E3D" },
  resultadoSubtitulo: { fontSize: 10.5, color: "#94A3B8", marginTop: 1 },

  cardNovaAtividade: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#2F6FE4",
    borderRadius: 16,
    padding: 16,
    marginBottom: 26,
    width: "100%",
  },
  cardNovaAtividadeIcone: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardNovaAtividadeTextos: { flex: 1 },
  cardNovaAtividadeTitulo: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  cardNovaAtividadeDescricao: { color: "#D9E6FB", fontSize: 11, marginTop: 2 },

  secaoTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1E3D",
    marginBottom: 12,
    width: "100%",
  },

  grade: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 20 },
  atalhoCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 12,
  },
  atalhoCardDesktop: {
    gap: 14,
    padding: 18,
    borderRadius: 16,
    minHeight: 92,
  },
  atalhoIconeCirculo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  atalhoIconeCirculoDesktop: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  atalhoTextos: { flex: 1 },
  atalhoTitulo: { fontSize: 12.5, fontWeight: "700", color: "#0B1E3D" },
  atalhoTituloDesktop: { fontSize: 14.5, marginBottom: 2 },
  atalhoDescricao: { fontSize: 10.5, color: "#94A3B8", marginTop: 2 },
  atalhoDescricaoDesktop: { fontSize: 12, lineHeight: 16 },

  dicaBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    backgroundColor: "#E8F0FE",
    borderRadius: 12,
    padding: 14,
  },
  dicaTextos: { flex: 1 },
  dicaTitulo: { fontSize: 12.5, fontWeight: "700", color: "#1D4ED8" },
  dicaDescricao: { fontSize: 11, color: "#3B5A8A", marginTop: 2, lineHeight: 15 },
});