
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from "react-native";


const NOME_PROFESSOR = "Ana";
const INICIAIS_PROFESSOR = "AS";

const ATALHOS = [
  {
    chave: "turmas",
    titulo: "Minhas turmas",
    descricao: "Gerencie suas turmas e veja os alunos.",
    icone: "people",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
    biblioteca: "ion",
  },
  {
    chave: "atividades",
    titulo: "Atividades",
    descricao: "Visualize e edite suas atividades criadas.",
    icone: "clipboard",
    corFundo: "#E7F8EF",
    corIcone: "#22C55E",
    biblioteca: "ion",
    rota: "/atividades",
  },
  {
    chave: "scanner",
    titulo: "Scanner",
    descricao: "Escaneie ou envie atividades para correção.",
    icone: "camera",
    corFundo: "#F1E9FB",
    corIcone: "#8B5CF6",
    biblioteca: "ion",
  },
  {
    chave: "correcoes",
    titulo: "Correções",
    descricao: "Acompanhe o progresso das correções da IA.",
    icone: "create",
    corFundo: "#FEF0E4",
    corIcone: "#F5A623",
    biblioteca: "ion",
  },
  {
    chave: "notas",
    titulo: "Notas",
    descricao: "Veja as notas e o desempenho dos seus alunos.",
    icone: "star",
    corFundo: "#FDF6DC",
    corIcone: "#D4A017",
    biblioteca: "ion",
  },
  {
    chave: "relatorios",
    titulo: "Relatórios",
    descricao: "Gere relatórios e exporte resultados.",
    icone: "file-document-outline",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
    biblioteca: "mci",
  },
];


export default function Home() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const ehMobilePequeno = width < 360;
  const colunasGrade = ehDesktop ? 3 : ehMobilePequeno ? 1 : 2;
  const larguraCardGrade =
    colunasGrade === 1 ? "100%" : colunasGrade === 2 ? "48%" : "31.5%";
  const [dicaVisivel, setDicaVisivel] = useState(true);
  const router = useRouter();

  return (
    <View style={[styles.tela, ehDesktop && { paddingLeft: 300 }]}>
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

              <TouchableOpacity
                style={styles.toolbarDesktop}
                activeOpacity={0.8}
                onPress={() => router.push("/perfil")}
              >
                <View style={styles.avatarPequenoClaro}>
                  <Text style={styles.avatarPequenoClaroTexto}>{INICIAIS_PROFESSOR}</Text>
                </View>
                <View style={styles.usuarioNomeLinha}>
                  <Text style={styles.usuarioNomeClaro}>Ana Silva</Text>
                  <Ionicons name="chevron-down" size={14} color="#0B1E3D" />
                </View>
              </TouchableOpacity>
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
              <Ionicons name="star" size={18} color="#7C3AED" style={{ marginTop: 1 }} />
              <View style={styles.dicaTextos}>
                <Text style={styles.dicaTitulo}>Dica rápida</Text>
                <Text style={styles.dicaDescricao}>
                  Você pode configurar critérios de correção personalizados para cada tipo de
                  questão.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setDicaVisivel(false)}>
                <Ionicons name="close" size={18} color="#7C3AED" />
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
  saudacaoDesktop: { fontSize: 18, fontWeight: "700", color: "#0B1E3D" },
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

  saudacao: { fontSize: 18, fontWeight: "700", color: "#0B1E3D", textAlign: "center" },
  subtitulo: { fontSize: 13, color: "#64748B", marginTop: 4, marginBottom: 20, textAlign: "center" },

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
    backgroundColor: "#F1E9FB",
    borderRadius: 12,
    padding: 14,
  },
  dicaTextos: { flex: 1 },
  dicaTitulo: { fontSize: 12.5, fontWeight: "700", color: "#5B21B6" },
  dicaDescricao: { fontSize: 11, color: "#6D4FA0", marginTop: 2, lineHeight: 15 },
});