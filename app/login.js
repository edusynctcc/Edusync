import { Ionicons } from "@expo/vector-icons";
import { Link, router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { COR, FONTE } from "../components/estilo";
import { login } from "../constants/api";

const LARGURA_DESKTOP = 900;

const IMAGEM_FUNDO = null;
const COR_SOBREPOSICAO = "rgba(11, 30, 61, 0.72)";

const Fundo = IMAGEM_FUNDO ? ImageBackground : View;
const propsFundo = IMAGEM_FUNDO
  ? { source: IMAGEM_FUNDO, resizeMode: "cover" }
  : {};

const RECURSOS = [
  {
    icone: "camera-outline",
    titulo: "Correção automática por imagem",
    texto:
      "Envie atividades e receba correções e sugestões de forma automática com IA.",
  },
  {
    icone: "stats-chart-outline",
    titulo: "Organização inteligente de notas",
    texto:
      "Acompanhe o desempenho da turma com relatórios completos e organizados.",
  },
  {
    icone: "time-outline",
    titulo: "Economia de tempo",
    texto:
      "Reduza o tempo gasto com correções e tenha mais tempo para o que realmente transforma.",
  },
];

function lerErroDoLogin(e) {
  const status = e?.status ?? e?.response?.status ?? e?.codigo;
  const texto = String(e?.message || "").toLowerCase();

  const contaNaoExiste =
    status === 404 ||
    texto.includes("não encontr") ||
    texto.includes("nao encontr") ||
    texto.includes("not found") ||
    texto.includes("não existe") ||
    texto.includes("nao existe") ||
    texto.includes("não cadastrad") ||
    texto.includes("nao cadastrad");

  if (contaNaoExiste) {
    return {
      mensagem: "Não encontramos uma conta com esse e-mail.",
      convite: "Você precisa se cadastrar primeiro.",
      levaPara: "/cadastro",
      textoDoLink: "Criar conta",
    };
  }

  const senhaErrada =
    status === 401 ||
    status === 403 ||
    texto.includes("senha") ||
    texto.includes("credenc") ||
    texto.includes("invalid") ||
    texto.includes("unauthorized");

  if (senhaErrada) {
    return {
      mensagem: "E-mail ou senha incorretos.",
      convite: "",
      levaPara: null,
    };
  }

  const semRede =
    texto.includes("network") ||
    texto.includes("failed to fetch") ||
    texto.includes("timeout") ||
    texto.includes("econnrefused");

  if (semRede) {
    return {
      mensagem: "Não consegui falar com o servidor.",
      convite: "Confira se o back-end está rodando.",
      levaPara: null,
    };
  }

  return {
    mensagem: e?.message || "Não foi possível entrar. Tente de novo.",
    convite: "",
    levaPara: null,
  };
}

export default function Login() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= LARGURA_DESKTOP;
  const { email: emailVindoDoCadastro } = useLocalSearchParams();

  const [email, setEmail] = useState(
    emailVindoDoCadastro ? String(emailVindoDoCadastro) : "",
  );
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function handleLogin() {
    setErro(null);

    const emailLimpo = email.trim().toLowerCase();

    if (!emailLimpo || !senha) {
      setErro({
        mensagem: "Preencha e-mail e senha.",
        convite: "",
        levaPara: null,
      });
      return;
    }

    setCarregando(true);
    try {
      await login(emailLimpo, senha);
      router.replace("/home");
    } catch (e) {
      setErro(lerErroDoLogin(e));
    } finally {
      setCarregando(false);
    }
  }

  const caixaDeErro = erro ? (
    <View style={styles.avisoErro}>
      <Ionicons
        name="alert-circle-outline"
        size={16}
        color="#DC2626"
        style={{ marginTop: 1 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.textoErro}>{erro.mensagem}</Text>
        {erro.convite ? (
          <Text style={styles.textoErroApoio}>{erro.convite}</Text>
        ) : null}
        {erro.levaPara ? (
          <Link href={erro.levaPara} style={styles.erroLink}>
            {erro.textoDoLink}
          </Link>
        ) : null}
      </View>
    </View>
  ) : null;

  const conteudoFormulario = (
    <>
      <Image
        source={require("../assets/images/logoTexto.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.titulo}>Bem-vindo de volta</Text>
      <Text style={styles.subtitulo}>Entre com sua conta de professor</Text>

      <Text style={styles.rotulo}>E-mail</Text>
      <View style={styles.campoLinha}>
        <Ionicons
          name="mail-outline"
          size={18}
          color="#8A93A6"
          style={styles.campoIcone}
        />
        <TextInput
          style={styles.campoTexto}
          placeholder="Digite seu email"
          placeholderTextColor="#9AA3B2"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>

      <Text style={styles.rotulo}>Senha</Text>
      <View style={styles.campoLinha}>
        <Ionicons
          name="lock-closed-outline"
          size={18}
          color="#8A93A6"
          style={styles.campoIcone}
        />
        <TextInput
          style={styles.campoTexto}
          placeholder="Digite sua senha"
          placeholderTextColor="#9AA3B2"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry={!mostrarSenha}
          onSubmitEditing={handleLogin}
        />
        <TouchableOpacity
          onPress={() => setMostrarSenha((v) => !v)}
          hitSlop={8}
        >
          <Ionicons
            name={mostrarSenha ? "eye-outline" : "eye-off-outline"}
            size={18}
            color="#8A93A6"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.linhaOpcoes}>
        <Text style={styles.linkPequeno}>Lembrar senha</Text>
        <Text style={styles.linkPequenoDestaque}>Esqueceu sua senha?</Text>
      </View>

      {caixaDeErro}

      <TouchableOpacity
        style={[styles.botao, carregando && styles.botaoDesabilitado]}
        onPress={handleLogin}
        disabled={carregando}
        activeOpacity={0.85}
      >
        <Text style={styles.textoBotao}>
          {carregando ? "Entrando..." : "Entrar na Plataforma"}
        </Text>
        {!carregando && (
          <Ionicons name="arrow-forward" size={18} color={COR.branco} />
        )}
      </TouchableOpacity>

      <View style={styles.rodape}>
        <Text style={styles.rodapeTexto}>Ainda não tem uma conta? </Text>
        <Link href="/cadastro" style={styles.rodapeLink}>
          Cadastre-se e conheça agora
        </Link>
      </View>
    </>
  );

  if (isDesktop) {
    return (
      <Fundo {...propsFundo} style={styles.telaDesktop}>
        <Stack.Screen options={{ headerShown: false }} />

        {IMAGEM_FUNDO && <View style={styles.sobreposicao} />}

        <View style={styles.cartaoGrande}>
          <View style={styles.colunaForm}>{conteudoFormulario}</View>

          <View style={styles.divisorVertical} />

          <View style={styles.colunaPromo}>
            <Text style={styles.promoTitulo}>
              Mais tempo para ensinar,{"\n"}
              <Text style={styles.promoTituloDestaque}>
                menos tempo para corrigir.
              </Text>
            </Text>

            <Text style={styles.promoTexto}>
              O Edusync automatiza a correção de atividades e organiza suas
              notas de forma inteligente, para que você foque no que realmente
              importa: <Text style={styles.promoLink}>seus alunos</Text>.
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
                <Ionicons name="school" size={16} color={COR.branco} />
              </View>
              <Text style={styles.promoCtaTexto}>
                Quer saber mais sobre o nosso projeto?
              </Text>
              <TouchableOpacity style={styles.promoCtaBotao}>
                <Text style={styles.promoCtaBotaoTexto}>Acessar site</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Fundo>
    );
  }

  return (
    <Fundo {...propsFundo} style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />

      {IMAGEM_FUNDO && <View style={styles.sobreposicao} />}

      <KeyboardAvoidingView
        style={styles.areaTeclado}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          style={styles.scrollTransparente}
        >
          <View style={styles.cartao}>{conteudoFormulario}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Fundo>
  );
}

const styles = StyleSheet.create({
  sobreposicao: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COR_SOBREPOSICAO,
  },

  tela: { flex: 1, backgroundColor: COR.marinho },
  areaTeclado: { flex: 1 },
  scrollTransparente: { backgroundColor: "transparent" },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  telaDesktop: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: COR.marinho,
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
    backgroundColor: COR.branco,
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
  divisorVertical: { width: 1, backgroundColor: "#E9ECF2" },
  colunaPromo: { flex: 1.15, padding: 48, justifyContent: "center" },
  promoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 24,
    fontWeight: "700",
    color: COR.tintaForte,
    lineHeight: 32,
    marginBottom: 12,
  },
  promoTituloDestaque: { color: COR.destaque },
  promoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: "#5B6472",
    lineHeight: 20,
    marginBottom: 18,
  },
  promoLink: { color: "#2F6FED", fontWeight: "600" },
  promoDivisor: { height: 1, backgroundColor: "#E9ECF2", marginBottom: 18 },
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
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  promoItemTexto: { flex: 1 },
  promoItemTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.tintaForte,
    marginBottom: 2,
  },
  promoItemDescricao: {
    fontFamily: FONTE.regular,
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
    fontFamily: FONTE.semi,
    fontSize: 11.5,
    fontWeight: "600",
    color: COR.tintaMedia,
  },
  promoCtaBotao: {
    backgroundColor: "#2F6FED",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  promoCtaBotaoTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    fontWeight: "700",
  },

  cartao: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COR.branco,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  logo: { width: 120, height: 80, marginBottom: 8 },
  titulo: {
    fontFamily: FONTE.bold,
    fontSize: 20,
    fontWeight: "700",
    color: COR.tintaForte,
    marginTop: 4,
  },
  subtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    marginBottom: 22,
    marginTop: 2,
  },
  rotulo: {
    alignSelf: "flex-start",
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginBottom: 6,
    marginTop: 12,
    letterSpacing: 0.2,
  },
  campoLinha: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: COR.fundo,
  },
  campoIcone: { marginRight: 8 },
  campoTexto: {
    flex: 1,
    paddingVertical: 13,
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaForte,
  },
  linhaOpcoes: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    marginBottom: 6,
  },
  linkPequeno: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
  },
  linkPequenoDestaque: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: "#2F6FED",
    fontWeight: "600",
  },

  avisoErro: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 10,
    alignSelf: "stretch",
  },
  textoErro: {
    color: "#DC2626",
    fontFamily: FONTE.semi,
    fontWeight: "600",
    fontSize: 12.5,
  },
  textoErroApoio: {
    color: "#B24A45",
    fontFamily: FONTE.regular,
    fontSize: 12,
    marginTop: 2,
  },
  erroLink: {
    color: "#2F6FED",
    fontFamily: FONTE.bold,
    fontWeight: "700",
    fontSize: 12.5,
    marginTop: 6,
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
  botaoDesabilitado: { opacity: 0.7 },
  textoBotao: {
    color: COR.branco,
    fontWeight: "700",
    fontFamily: FONTE.bold,
    fontSize: 14.5,
  },
  rodape: {
    flexDirection: "row",
    marginTop: 20,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rodapeTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
  },
  rodapeLink: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.destaque,
    fontWeight: "700",
  },
});
