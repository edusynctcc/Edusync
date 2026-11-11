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

const IMAGEM_FUNDO = require("../assets/images/img_fundo_login.png");

const MOSTRAR_VEU = false;
const COR_SOBREPOSICAO = "rgba(7, 22, 46, 0.45)";

const Fundo = IMAGEM_FUNDO ? ImageBackground : View;
const propsFundo = IMAGEM_FUNDO
  ? { source: IMAGEM_FUNDO, resizeMode: "cover" }
  : {};

// A imagem de fundo no celular.
//
// Desligada: no aparelho real ela não ficou boa. Para trazer de volta, põe
// true aqui e ajusta o tamanho no ALTURA_GRAFISMO logo abaixo.
const IMAGEM_NO_CELULAR = false;

// Proporção (largura / altura) do grafismo, para ele nunca distorcer.
const PROPORCAO_GRAFISMO = 962 / 1181;

// Quanto da ALTURA da tela o grafismo ocupa, no canto de baixo.
//
// O tamanho vem da altura, não da largura. Se viesse da largura, num celular
// alto o desenho comeria metade da tela e sobrava um vazio enorme entre o
// cartão e o laranja. Amarrado à altura, ele fica do mesmo tamanho relativo
// em qualquer aparelho.
//
// 0.32 = um terço da tela, discreto. Aumente para ele ficar mais presente.
const ALTURA_GRAFISMO = 0.32;

const AZUL = "#2E6FB0";

const AMARELO = "#EAB308";

const SEM_CONTORNO_WEB =
  Platform.OS === "web" ? { outlineStyle: "none" } : null;

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
        style={[
          styles.campoTexto,
          olho && styles.campoTextoComOlho,
          SEM_CONTORNO_WEB,
        ]}
        placeholderTextColor="#9AA3B2"
        onFocus={() => setFocado(true)}
        onBlur={() => setFocado(false)}
      />
      {olho && (
        <TouchableOpacity
          onPress={aoAlternarOlho}
          hitSlop={8}
          style={styles.botaoOlho}
        >
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
  const { width, height: alturaDaTela } = useWindowDimensions();
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
      const dados = await login(emailLimpo, senha);

      if (dados?.precisa_codigo) {
        router.push({
          pathname: "/codigo",
          params: { email: emailLimpo, modo: "login" },
        });
        return;
      }

      router.replace("/home");
    } catch (e) {
      if (e?.dados?.precisa_verificar) {
        router.push({
          pathname: "/codigo",
          params: { email: emailLimpo, modo: "cadastro" },
        });
        return;
      }
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
        placeholder="Digite sua senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry={!mostrarSenha}
        onSubmitEditing={handleLogin}
        olho
        olhoAberto={mostrarSenha}
        aoAlternarOlho={() => setMostrarSenha((v) => !v)}
      />

      <View style={styles.linhaOpcoes}>
        <Text style={styles.linkPequeno}>Lembrar senha</Text>
        <TouchableOpacity
          hitSlop={8}
          onPress={() =>
            router.push({
              pathname: "/esqueci-senha",
              params: { email: email.trim() },
            })
          }
        >
          <Text style={styles.linkPequenoDestaque}>Esqueceu sua senha?</Text>
        </TouchableOpacity>
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

        {IMAGEM_FUNDO && MOSTRAR_VEU && (
          <View style={styles.sobreposicao} pointerEvents="none" />
        )}

        <ScrollView
          contentContainerStyle={styles.scrollDesktop}
          style={styles.scrollTransparente}
        >
          <View style={styles.cartaoGrande}>
            <View style={styles.colunaForm}>{conteudoFormulario}</View>

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
                <TouchableOpacity
                  style={styles.promoCtaBotao}
                  activeOpacity={0.85}
                >
                  <Text style={styles.promoCtaBotaoTexto}>Acessar site</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </Fundo>
    );
  }

  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />

      {IMAGEM_FUNDO && IMAGEM_NO_CELULAR && (
        <Image
          source={IMAGEM_FUNDO}
          style={[
            styles.grafismoCelular,
            { height: Math.round(alturaDaTela * ALTURA_GRAFISMO) },
          ]}
          resizeMode="contain"
          pointerEvents="none"
        />
      )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  sobreposicao: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COR_SOBREPOSICAO,
  },

  tela: { flex: 1, backgroundColor: COR.marinho },

  // O grafismo do fundo, ancorado no canto de baixo à esquerda.
  //
  // Não dá para usar ImageBackground com "cover" aqui: o celular é muito mais
  // alto que largo, então o cover ampliaria a imagem até cobrir a altura e
  // sobraria só uma faixa estreita do meio dela -- a composição se perde.
  //
  // A altura vem do ALTURA_GRAFISMO lá em cima (aplicada no próprio
  // componente, porque depende do tamanho da tela) e a largura sai dela pelo
  // aspectRatio, então o desenho nunca distorce.
  grafismoCelular: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: undefined,
    aspectRatio: PROPORCAO_GRAFISMO,
  },
  areaTeclado: { flex: 1 },
  scrollTransparente: { backgroundColor: "transparent" },
  // Sem justifyContent: "center" aqui, de proposito.
  //
  // Centralizar com justifyContent dentro de uma area rolavel funciona
  // enquanto o conteudo cabe. Quando ele passa da altura disponivel -- com o
  // teclado aberto, com zoom, ou numa tela baixa -- o excedente transborda
  // para os DOIS lados, e a parte que sobe fica fora do alcance da rolagem:
  // o topo do cartao some e nao tem como chegar nele.
  //
  // O "marginVertical: auto" la no cartao centraliza do mesmo jeito quando
  // sobra espaco, e quando nao sobra, encosta no topo e deixa rolar ate o fim.
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
  },

  telaDesktop: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#07162E",
    overflow: "hidden",
  },
  // O conteudo do desktop agora mora dentro de um ScrollView. Antes, numa
  // janela baixa (projetor de sala, notebook pequeno), o cartao de 600px de
  // altura nao cabia, o topo dele era cortado e nao havia rolagem nenhuma.
  scrollDesktop: {
    flexGrow: 1,
    alignItems: "center",
    padding: 40,
  },
  cartaoGrande: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 1000,
    marginVertical: "auto",
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
  colunaPromo: { flex: 1.15, padding: 48, justifyContent: "center" },
  promoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 26,
    fontWeight: "700",
    color: COR.tintaForte,
    lineHeight: 34,
    marginBottom: 14,
  },
  promoTituloDestaque: { color: AMARELO },
  promoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: "#5B6472",
    lineHeight: 21,
    marginBottom: 20,
  },
  promoDivisor: { height: 1, backgroundColor: "#E9ECF2", marginBottom: 20 },
  promoLink: { color: AZUL, fontWeight: "600" },

  promoItem: {
    flexDirection: "row",
    gap: 13,
    marginBottom: 16,
    alignItems: "flex-start",
  },
  promoIconeBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  promoItemTexto: { flex: 1 },
  promoItemTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.tintaForte,
    marginBottom: 3,
  },
  promoItemDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: "#7A8393",
    lineHeight: 18,
  },

  promoCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#EFF5FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
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
    paddingVertical: 7,
    paddingHorizontal: 13,
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
    marginVertical: "auto",
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
  logo: { width: 176, height: 117, marginBottom: 10 },
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
    marginBottom: 22,
    marginTop: 3,
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
    // Ancora para o olhinho posicionado.
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: COR.branco,
  },
  campoLinhaFocado: {
    borderColor: AZUL,
    backgroundColor: COR.branco,
  },
  campoIcone: { marginRight: 8 },

  // O olhinho fica preso na direita da caixa, fora do fluxo.
  //
  // Antes ele era mais um item na fila do flexbox, disputando largura com o
  // campo de texto. Na web o TextInput vira um <input>, e o Safari do iPhone
  // da a esse <input> uma largura minima bem maior que a do Chrome -- com a
  // tela estreita nao sobrava espaco e o olhinho era empurrado para fora da
  // borda. Posicionado, nao existe largura que o expulse.
  botaoOlho: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  campoTexto: {
    flex: 1,
    // Na web o TextInput vira um <input>, e todo <input> tem uma largura
    // minima propria que o flexbox respeita. Sem este minWidth: 0 o campo se
    // recusa a encolher quando a tela aperta, e quem sobra para fora da caixa
    // e o olhinho da senha. So aparece no celular porque no desktop sobra
    // espaco de sobra.
    minWidth: 0,
    paddingVertical: 13,
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaForte,
  },  // Espaco reservado para o olhinho, que agora flutua por cima.
  campoTextoComOlho: { paddingRight: 26 },

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
    color: AZUL,
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
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
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
    color: AMARELO,
    fontWeight: "700",
  },
});