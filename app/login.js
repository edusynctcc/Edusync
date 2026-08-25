import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  useWindowDimensions,
} from "react-native";
import { Link, router, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const LARGURA_DESKTOP = 900;

const RECURSOS = [
  {
    icone: "camera-outline",
    titulo: "Correção automática por imagem",
    texto: "Envie atividades e receba correções e sugestões de forma automática com IA.",
  },
  {
    icone: "stats-chart-outline",
    titulo: "Organização inteligente de notas",
    texto: "Acompanhe o desempenho da turma com relatórios completos e organizados.",
  },
  {
    icone: "time-outline",
    titulo: "Economia de tempo",
    texto: "Reduza o tempo gasto com correções e tenha mais tempo para o que realmente transforma.",
  },
];

export default function Login() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= LARGURA_DESKTOP;

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  // Backend ainda não está pronto: por enquanto o login só valida os campos
  // e já navega pra home. Quando a API estiver no ar, troque o corpo desta
  // função pelo bloco comentado logo abaixo.
  async function handleLogin() {
    setErro("");

    if (!email || !senha) {
      setErro("Preencha email e senha.");
      return;
    }

    router.replace("/dashboard");

    /* ---- versão com API real (descomente quando o backend estiver pronto) ----
    setCarregando(true);
    try {
      const resposta = await fetch("http://localhost:3000/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível entrar.");
        return;
      }

      router.replace("/dashboard");
    } catch (e) {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
    ---------------------------------------------------------------------------- */
  }

  // conteúdo do formulário — igual em mobile e desktop, só muda o "embrulho" ao redor
  const conteudoFormulario = (
    <>
      <Image source={require("../assets/images/logoTexto.png")} style={styles.logo} resizeMode="contain" />
      <Text style={styles.titulo}>Bem-vindo de volta</Text>
      <Text style={styles.subtitulo}>Entre com sua conta de professor</Text>

      <Text style={styles.rotulo}>E-mail</Text>
      <View style={styles.campoLinha}>
        <Ionicons name="mail-outline" size={18} color="#8A93A6" style={styles.campoIcone} />
        <TextInput
          style={styles.campoTexto}
          placeholder="Digite seu email"
          placeholderTextColor="#9AA3B2"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>

      <Text style={styles.rotulo}>Senha</Text>
      <View style={styles.campoLinha}>
        <Ionicons name="lock-closed-outline" size={18} color="#8A93A6" style={styles.campoIcone} />
        <TextInput
          style={styles.campoTexto}
          placeholder="Digite sua senha"
          placeholderTextColor="#9AA3B2"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
        />
        <TouchableOpacity onPress={() => setMostrarSenha((v) => !v)} hitSlop={8}>
          <Ionicons name={mostrarSenha ? "eye-outline" : "eye-off-outline"} size={18} color="#8A93A6" />
        </TouchableOpacity>
      </View>

      <View style={styles.linhaOpcoes}>
        <Text style={styles.linkPequeno}>Lembrar senha</Text>
        <Text style={styles.linkPequenoDestaque}>Esqueceu sua senha?</Text>
      </View>

      {erro ? (
        <View style={styles.avisoErro}>
          <Ionicons name="alert-circle-outline" size={16} color="#DC2626" />
          <Text style={styles.textoErro}>{erro}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.botao, carregando && styles.botaoDesabilitado]}
        onPress={handleLogin}
        disabled={carregando}
        activeOpacity={0.85}
      >
        <Text style={styles.textoBotao}>{carregando ? "Entrando..." : "Entrar na Plataforma"}</Text>
        {!carregando && <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />}
      </TouchableOpacity>

      <View style={styles.rodape}>
        <Text style={styles.rodapeTexto}>Ainda não tem uma conta? </Text>
        <Link href="/cadastro" style={styles.rodapeLink}>
          Cadastre-se e conheça agora
        </Link>
      </View>
    </>
  );

  // ---------- versão desktop: cartão único com 2 colunas ----------
  if (isDesktop) {
    return (
      <View style={styles.telaDesktop}>
        <Stack.Screen options={{ headerShown: false }} />

        <View style={styles.cartaoGrande}>
          <View style={styles.colunaForm}>{conteudoFormulario}</View>

          <View style={styles.divisorVertical} />

          <View style={styles.colunaPromo}>
            <Text style={styles.promoTitulo}>
              Mais tempo para ensinar,{"\n"}
              <Text style={styles.promoTituloDestaque}>menos tempo para corrigir.</Text>
            </Text>

            <Text style={styles.promoTexto}>
              O Edusync automatiza a correção de atividades e organiza suas notas de forma inteligente, para você
              foque no que realmente importa: <Text style={styles.promoLink}>seus alunos</Text>.
            </Text>

            <View style={styles.promoDivisor} />

            {RECURSOS.map((r) => (
              <View style={styles.promoItem} key={r.titulo}>
                <View style={styles.promoIconeBox}>
                  <Ionicons name={r.icone} size={18} color="#2F6FED" />
                </View>
                <View style={styles.promoItemTexto}>
                  <Text style={styles.promoItemTitulo}>{r.titulo}</Text>
                  <Text style={styles.promoItemDescricao}>{r.texto}</Text>
                </View>
              </View>
            ))}

            <View style={styles.promoCta}>
              <View style={styles.promoCtaIcone}>
                <Ionicons name="school" size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.promoCtaTexto}>Quer saber mais sobre o nosso projeto?</Text>
              <TouchableOpacity style={styles.promoCtaBotao}>
                <Text style={styles.promoCtaBotaoTexto}>Acessar site</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ---------- versão mobile ----------
  return (
    <KeyboardAvoidingView style={styles.tela} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.cartao}>{conteudoFormulario}</View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  // ----- mobile -----
  tela: {
    flex: 1,
    backgroundColor: "#0B1E3D",
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  // ----- desktop -----
  telaDesktop: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    overflow: "hidden",
  },
  cartaoGrande: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 1000,
    minHeight: 600,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 12,
  },
  colunaForm: {
    flex: 1,
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  divisorVertical: {
    width: 1,
    backgroundColor: "#E9ECF2",
  },
  colunaPromo: {
    flex: 1.15,
    padding: 48,
    justifyContent: "center",
  },
  promoTitulo: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0B1E3D",
    lineHeight: 32,
    marginBottom: 12,
  },
  promoTituloDestaque: {
    color: "#F5811F",
  },
  promoTexto: {
    fontSize: 13.5,
    color: "#5B6472",
    lineHeight: 20,
    marginBottom: 18,
  },
  promoLink: {
    color: "#2F6FED",
    fontWeight: "600",
  },
  promoDivisor: {
    height: 1,
    backgroundColor: "#E9ECF2",
    marginBottom: 18,
  },
  promoItem: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
    alignItems: "flex-start",
  },
  promoIconeBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#EAF1FE",
    alignItems: "center",
    justifyContent: "center",
  },
  promoItemTexto: {
    flex: 1,
  },
  promoItemTitulo: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0B1E3D",
    marginBottom: 2,
  },
  promoItemDescricao: {
    fontSize: 12,
    color: "#7A8393",
    lineHeight: 17,
  },
  promoCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF5FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 6,
  },
  promoCtaIcone: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2F6FED",
    alignItems: "center",
    justifyContent: "center",
  },
  promoCtaTexto: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  promoCtaBotao: {
    backgroundColor: "#2F6FED",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  promoCtaBotaoTexto: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  // ----- compartilhado (formulário) -----
  cartao: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 80,
    marginBottom: 8,
  },
  titulo: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B1E3D",
    marginTop: 4,
  },
  subtitulo: {
    fontSize: 13,
    color: "#64748B",
    marginBottom: 22,
    marginTop: 2,
  },
  rotulo: {
    alignSelf: "flex-start",
    fontSize: 12.5,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  campoLinha: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: "#F8FAFC",
  },
  campoIcone: {
    marginRight: 8,
  },
  campoTexto: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 14,
    color: "#0B1E3D",
  },
  linhaOpcoes: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    marginBottom: 6,
  },
  linkPequeno: {
    fontSize: 12,
    color: "#64748B",
  },
  linkPequenoDestaque: {
    fontSize: 12,
    color: "#2F6FED",
    fontWeight: "600",
  },
  avisoErro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: "stretch",
  },
  textoErro: {
    color: "#DC2626",
    fontSize: 12.5,
  },
  botao: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    backgroundColor: "#2F6FED",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    shadowColor: "#2F6FED",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  botaoDesabilitado: {
    opacity: 0.7,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14.5,
  },
  rodape: {
    flexDirection: "row",
    marginTop: 20,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rodapeTexto: {
    fontSize: 12.5,
    color: "#475569",
  },
  rodapeLink: {
    fontSize: 12.5,
    color: "#F5A623",
    fontWeight: "700",
  },
});