import { Ionicons } from "@expo/vector-icons";
import { Link, router, Stack } from "expo-router";
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
import { registrar } from "../constants/api";

const LARGURA_DESKTOP = 900;

const IMAGEM_FUNDO = null;
const COR_SOBREPOSICAO = "rgba(11, 30, 61, 0.72)";

const Fundo = IMAGEM_FUNDO ? ImageBackground : View;
const propsFundo = IMAGEM_FUNDO
  ? { source: IMAGEM_FUNDO, resizeMode: "cover" }
  : {};

const AZUL = "#2F6FED";

// Tira o contorno padrão do navegador nos campos. Em celular é null.
const SEM_CONTORNO_WEB = Platform.OS === "web" ? { outlineStyle: "none" } : null;

// ---------------------------------------------------------------------------
// Mesma injeção que existe no login: esconde o olho de "mostrar senha" que o
// Chrome e o Edge desenham sozinhos dentro de todo input de senha (era ele o
// segundo olhinho) e a borda preta de foco do navegador.
//
// O id evita repetir quando as duas telas carregam na mesma sessão.
// ---------------------------------------------------------------------------
if (
  Platform.OS === "web" &&
  typeof document !== "undefined" &&
  !document.getElementById("edusync-ajustes-web")
) {
  const folha = document.createElement("style");
  folha.id = "edusync-ajustes-web";
  folha.textContent = `
    input::-ms-reveal,
    input::-ms-clear { display: none; }
    input:focus,
    input:focus-visible,
    textarea:focus { outline: none; box-shadow: none; }
  `;
  document.head.appendChild(folha);
}

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

// Campo com estado de foco próprio: a borda e o ícone ficam azuis enquanto a
// pessoa está digitando ali. É o que substitui a borda preta do navegador.
function Campo({ icone, olho, olhoAberto, aoAlternarOlho, ...props }) {
  const [focado, setFocado] = useState(false);

  return (
    <View style={[styles.campoLinha, focado && styles.campoLinhaFocado]}>
      <Ionicons
        name={icone}
        size={18}
        color={focado ? AZUL : "#8A93A6"}
        style={styles.campoIcone}
      />
      <TextInput
        {...props}
        style={[styles.campoTexto, SEM_CONTORNO_WEB]}
        placeholderTextColor="#9AA3B2"
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
      />
      {olho && (
        <TouchableOpacity onPress={aoAlternarOlho} hitSlop={8}>
          <Ionicons
            name={olhoAberto ? "eye-outline" : "eye-off-outline"}
            size={18}
            color={focado ? AZUL : "#8A93A6"}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

function lerErroDoCadastro(e) {
  const status = e?.status ?? e?.response?.status ?? e?.codigo;
  const texto = String(e?.message || "").toLowerCase();

  const jaExiste =
    status === 409 ||
    texto.includes("já existe") ||
    texto.includes("ja existe") ||
    texto.includes("já cadastrad") ||
    texto.includes("ja cadastrad") ||
    texto.includes("already exists") ||
    texto.includes("duplicate") ||
    texto.includes("unique") ||
    texto.includes("er_dup_entry") ||
    texto.includes("em uso");

  if (jaExiste) {
    return {
      mensagem: "Esse e-mail já tem uma conta.",
      convite: "Entre com ele ou use outro e-mail.",
      levaPara: "/login",
      textoDoLink: "Ir para o login",
    };
  }

  const dadoInvalido =
    status === 400 ||
    status === 422 ||
    texto.includes("inválid") ||
    texto.includes("invalid");
  if (dadoInvalido) {
    return {
      mensagem: e?.message || "Confira os dados e tente de novo.",
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
    mensagem: e?.message || "Não foi possível criar a conta. Tente de novo.",
    convite: "",
    levaPara: null,
  };
}

export default function Cadastro() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= LARGURA_DESKTOP;

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState(null);

  async function handleCadastro() {
    setErro(null);

    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();

    if (!nomeLimpo || !emailLimpo || !senha || !confirmarSenha) {
      setErro({
        mensagem: "Preencha todos os campos.",
        convite: "",
        levaPara: null,
      });
      return;
    }
    if (!emailLimpo.includes("@") || !emailLimpo.includes(".")) {
      setErro({
        mensagem: "Esse e-mail não parece válido.",
        convite: "",
        levaPara: null,
      });
      return;
    }
    if (senha.length < 6) {
      setErro({
        mensagem: "A senha precisa ter pelo menos 6 caracteres.",
        convite: "",
        levaPara: null,
      });
      return;
    }
    if (senha !== confirmarSenha) {
      setErro({
        mensagem: "As senhas não coincidem.",
        convite: "",
        levaPara: null,
      });
      return;
    }

    setCarregando(true);
    try {
      await registrar(nomeLimpo, emailLimpo, senha);
      router.replace({ pathname: "/login", params: { email: emailLimpo } });
    } catch (e) {
      setErro(lerErroDoCadastro(e));
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
      <Text style={styles.titulo}>Criar conta</Text>
      <Text style={styles.subtitulo}>
        Cadastre-se como professor no Edusync
      </Text>

      <Text style={styles.rotulo}>Nome</Text>
      <Campo
        icone="person-outline"
        placeholder="Digite seu nome"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.rotulo}>E-mail</Text>
      <Campo
        icone="mail-outline"
        placeholder="Digite seu email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />

      <Text style={styles.rotulo}>Senha</Text>
      <Campo
        icone="lock-closed-outline"
        placeholder="Mínimo de 6 caracteres"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry={!mostrarSenha}
        olho
        olhoAberto={mostrarSenha}
        aoAlternarOlho={() => setMostrarSenha((v) => !v)}
      />

      <Text style={styles.rotulo}>Confirmar senha</Text>
      <Campo
        icone="lock-closed-outline"
        placeholder="Digite a senha novamente"
        value={confirmarSenha}
        onChangeText={setConfirmarSenha}
        secureTextEntry={!mostrarSenha}
        onSubmitEditing={handleCadastro}
      />

      {caixaDeErro}

      <TouchableOpacity
        style={[styles.botao, carregando && styles.botaoDesabilitado]}
        onPress={handleCadastro}
        disabled={carregando}
        activeOpacity={0.85}
      >
        <Text style={styles.textoBotao}>
          {carregando ? "Criando conta..." : "Criar Conta"}
        </Text>
        {!carregando && (
          <Ionicons name="arrow-forward" size={18} color={COR.branco} />
        )}
      </TouchableOpacity>

      <View style={styles.rodape}>
        <Text style={styles.rodapeTexto}>Já tem uma conta? </Text>
        <Link href="/login" style={styles.rodapeLink}>
          Entrar
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
                  <Ionicons name={r.icone} size={18} color={AZUL} />
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
  promoLink: { color: AZUL, fontWeight: "600" },
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
    backgroundColor: AZUL,
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
    backgroundColor: AZUL,
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
  // Maior que antes (era 100x66), mas um pouco menor que a do login: esta tela
  // tem quatro campos e precisa sobrar altura.
  logo: { width: 150, height: 99, marginBottom: 6 },
  titulo: {
    fontFamily: FONTE.bold,
    fontSize: 21,
    fontWeight: "700",
    color: COR.tintaForte,
    marginTop: 2,
  },
  subtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    marginBottom: 14,
    marginTop: 3,
    textAlign: "center",
  },
  rotulo: {
    alignSelf: "flex-start",
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginBottom: 5,
    marginTop: 8,
    letterSpacing: 0.2,
  },
  campoLinha: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: COR.fundo,
  },
  // Borda e fundo mudam no foco. Sem mexer na espessura, senão o campo
  // "pula" um pixel toda vez que você clica nele.
  campoLinhaFocado: {
    borderColor: AZUL,
    backgroundColor: COR.branco,
  },
  campoIcone: { marginRight: 8 },
  campoTexto: {
    flex: 1,
    paddingVertical: 9,
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaForte,
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
    color: AZUL,
    fontFamily: FONTE.bold,
    fontWeight: "700",
    fontSize: 12.5,
    marginTop: 6,
  },

  botao: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    backgroundColor: AZUL,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
    shadowColor: AZUL,
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
    marginTop: 18,
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