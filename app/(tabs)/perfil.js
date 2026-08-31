import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

// Números do topo da tela (turmas, atividades, alunos, taxa de correção).
//
// ---------------------------------------------------------------------------
// API — GET /auth/me
// Traz os dados do professor logado. Esses totais são contagens que o
// back-end calcula (COUNT nas tabelas turma, atividade, aluno e correcao) —
// combine com quem fizer o back-end pra virem junto nessa mesma resposta,
// em vez de o app fazer quatro chamadas só pra montar quatro números.
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
// ---------------------------------------------------------------------------
const RESUMO_CONTA = [
  { valor: "12", rotulo: "Turmas", icone: "people-outline", corFundo: "#E8F0FE", corIcone: "#3B82F6" },
  { valor: "48", rotulo: "Atividades", icone: "document-text-outline", corFundo: "#E7F8EF", corIcone: "#22C55E" },
  { valor: "256", rotulo: "Alunos", icone: "school-outline", corFundo: "#F1E9FB", corIcone: "#8B5CF6" },
  { valor: "87%", rotulo: "Taxa média de correção", icone: "checkmark-circle-outline", corFundo: "#FEF0E4", corIcone: "#F5A623" },
];

const CONTA_SEGURANCA = [
  {
    chave: "dados",
    titulo: "Dados pessoais",
    descricao: "Nome, email, telefone e endereço",
    icone: "person-outline",
  },
  {
    chave: "senha",
    titulo: "Alterar senha",
    descricao: "Atualize sua senha de acesso",
    icone: "lock-closed-outline",
  },
  {
    chave: "seguranca",
    titulo: "Segurança da conta",
    descricao: "Autenticação em duas etapas",
    icone: "shield-checkmark-outline",
  },
  {
    chave: "notificacoes",
    titulo: "Notificações",
    descricao: "Gerencie como deve ser avisado",
    icone: "notifications-outline",
  },
];

const PREFERENCIAS = [
  {
    chave: "correcao",
    titulo: "Preferências de correção",
    descricao: "Critérios, padrões e configurações",
    icone: "options-outline",
  },
  {
    chave: "aparencia",
    titulo: "Aparência",
    descricao: "Tema claro, escuro ou automático",
    icone: "contrast-outline",
  },
  {
    chave: "idioma",
    titulo: "Idioma",
    descricao: "Português (Brasil)",
    icone: "language-outline",
  },
];

function ItemLista({ item, ultimo }) {
  return (
    <TouchableOpacity
      style={[styles.itemLista, !ultimo && styles.itemListaBorda]}
      activeOpacity={0.7}
    >
      <View style={styles.itemIconeCirculo}>
        <Ionicons name={item.icone} size={17} color="#5C7096" />
      </View>
      <View style={styles.itemTextos}>
        <Text style={styles.itemTitulo}>{item.titulo}</Text>
        <Text style={styles.itemDescricao}>{item.descricao}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color="#CBD5E1" />
    </TouchableOpacity>
  );
}

export default function Perfil() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();

  // Sai da conta e volta pro login.
  //
  // API — não precisa de endpoint: com JWT o logout é local, basta apagar o
  // token guardado no aparelho.
  //
  //   await AsyncStorage.removeItem("token");
  //   router.replace("/login");
  function sair() {
    router.replace("/login");
  }

  return (
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
      {!ehDesktop && <CabecalhoMobile comSino linkPerfil={false} />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 100 },
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View
          style={[ehDesktop ? styles.miolo : { width: "100%" }, ehTelaLarga && { maxWidth: 900 }]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>Perfil</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Card do professor */}
          <View style={[styles.perfilCard, ehDesktop && styles.perfilCardDesktop]}>
            <View style={styles.avatarGrande}>
              <Text style={styles.avatarGrandeTexto}>{INICIAIS_PROFESSOR}</Text>
              <View style={styles.avatarSelo}>
                <MaterialCommunityIcons name="camera" size={12} color="#FFFFFF" />
              </View>
            </View>

            <View style={styles.perfilTextos}>
              <Text style={styles.perfilNome}>Ana Silva Nunes</Text>
              <Text style={styles.perfilCargo}>Professor(a)</Text>

              <View style={styles.perfilContatoLinha}>
                <Ionicons name="mail-outline" size={13} color="#94A3B8" />
                <Text style={styles.perfilContatoTexto}>ana.silva@escola.edu.br</Text>
              </View>
              <View style={styles.perfilContatoLinha}>
                <Ionicons name="call-outline" size={13} color="#94A3B8" />
                <Text style={styles.perfilContatoTexto}>(11) 98765-4321</Text>
              </View>
              <View style={styles.perfilContatoLinha}>
                <Ionicons name="location-outline" size={13} color="#94A3B8" />
                <Text style={styles.perfilContatoTexto}>Santarém do Parnaíba, SP</Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#CBD5E1" style={styles.perfilSeta} />

            <TouchableOpacity style={styles.mascoteFlutuante} activeOpacity={0.85}>
              <Ionicons name="help" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Resumo da conta */}
          <Text style={styles.secaoTitulo}>Resumo da conta</Text>
          <View
            style={[
              styles.resumoCard,
              ehDesktop ? styles.resumoCardDesktop : styles.resumoCardMobile,
            ]}
          >
            {RESUMO_CONTA.map((item) => (
              <View key={item.rotulo} style={styles.resumoItem}>
                <View style={[styles.resumoIconeCirculo, { backgroundColor: item.corFundo }]}>
                  <Ionicons name={item.icone} size={17} color={item.corIcone} />
                </View>
                <Text style={styles.resumoValor}>{item.valor}</Text>
                <Text style={styles.resumoRotulo}>{item.rotulo}</Text>
              </View>
            ))}
          </View>

          {/* Conta e segurança */}
          <Text style={styles.secaoTitulo}>Conta e segurança</Text>
          <View style={styles.listaCard}>
            {CONTA_SEGURANCA.map((item, indice) => (
              <ItemLista
                key={item.chave}
                item={item}
                ultimo={indice === CONTA_SEGURANCA.length - 1}
              />
            ))}
          </View>

          {/* Preferências */}
          <Text style={styles.secaoTitulo}>Preferências</Text>
          <View style={styles.listaCard}>
            {PREFERENCIAS.map((item, indice) => (
              <ItemLista
                key={item.chave}
                item={item}
                ultimo={indice === PREFERENCIAS.length - 1}
              />
            ))}
          </View>

          <TouchableOpacity style={styles.botaoSair} activeOpacity={0.8} onPress={sair}>
            <Text style={styles.botaoSairTexto}>Sair da conta</Text>
          </TouchableOpacity>
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
  miolo: { width: "92%", maxWidth: 900 },

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

  // ----- card do professor -----
  perfilCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 16,
    marginBottom: 20,
    position: "relative",
  },
  perfilCardDesktop: { padding: 22 },
  avatarGrande: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    position: "relative",
  },
  avatarGrandeTexto: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  avatarSelo: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#3B82F6",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  perfilTextos: { flex: 1, minWidth: 0 },
  perfilNome: { fontSize: 15.5, fontWeight: "700", color: "#0B1E3D" },
  perfilCargo: { fontSize: 12, color: "#3B82F6", fontWeight: "600", marginBottom: 8 },
  perfilContatoLinha: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 3 },
  perfilContatoTexto: { fontSize: 11.5, color: "#64748B" },
  perfilSeta: { flexShrink: 0 },

  mascoteFlutuante: {
    position: "absolute",
    top: -12,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
  },

  secaoTitulo: {
    width: "100%",
    fontSize: 14,
    fontWeight: "700",
    color: "#0B1E3D",
    marginBottom: 10,
  },

  // ----- resumo da conta -----
  resumoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 16,
    marginBottom: 20,
  },
  resumoCardMobile: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
  resumoCardDesktop: { flexDirection: "row" },
  resumoItem: { width: "25%", alignItems: "center" },
  resumoIconeCirculo: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resumoValor: { fontSize: 16, fontWeight: "700", color: "#0B1E3D" },
  resumoRotulo: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
    paddingHorizontal: 2,
  },

  // ----- listas -----
  listaCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  itemLista: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 13 },
  itemListaBorda: { borderBottomWidth: 1, borderBottomColor: "#F4F6FA" },
  itemIconeCirculo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemTextos: { flex: 1, minWidth: 0 },
  itemTitulo: { fontSize: 13, fontWeight: "600", color: "#0B1E3D" },
  itemDescricao: { fontSize: 11, color: "#94A3B8", marginTop: 2 },

  botaoSair: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    paddingVertical: 14,
    alignItems: "center",
  },
  botaoSairTexto: { fontSize: 13.5, fontWeight: "700", color: "#3B82F6" },
});