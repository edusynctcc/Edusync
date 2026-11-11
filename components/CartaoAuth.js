import { Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
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
import { COR, FONTE } from "./estilo";

const IMAGEM_FUNDO = require("../assets/images/img_fundo_login.png");

const LARGURA_DESKTOP = 900;

// A imagem de fundo no celular.
//
// Desligada de propósito. Ela foi composta para tela larga; numa tela
// estreita e alta o "cover" precisa ampliá-la até cobrir a altura, e aí
// sobra só uma fatia do meio -- fica parecendo defeito. No computador ela
// continua aparecendo normalmente.
//
// Põe true aqui se quiser a imagem também no celular.
const IMAGEM_NO_CELULAR = false;

export const AZUL = "#2E6FB0";
export const AMARELO = "#EAB308";

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

export function Campo({ icone, olho, olhoAberto, aoAlternarOlho, ...props }) {
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
          hitSlop={10}
          style={styles.botaoOlho}
          accessibilityRole="button"
          accessibilityLabel={olhoAberto ? "Esconder a senha" : "Mostrar a senha"}
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

export function CaixaMensagem({ texto, tipo = "erro" }) {
  if (!texto) return null;
  const ok = tipo === "ok";
  return (
    <View style={[styles.aviso, ok ? styles.avisoOk : styles.avisoErro]}>
      <Ionicons
        name={ok ? "checkmark-circle-outline" : "alert-circle-outline"}
        size={16}
        color={ok ? "#15803D" : "#DC2626"}
        style={{ marginTop: 1 }}
      />
      <Text style={[styles.avisoTexto, { color: ok ? "#15803D" : "#DC2626" }]}>
        {texto}
      </Text>
    </View>
  );
}

export function BotaoAzul({ texto, carregando, textoCarregando, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.botao, carregando && styles.botaoDesabilitado]}
      onPress={onPress}
      disabled={carregando}
      activeOpacity={0.85}
    >
      <Text style={styles.textoBotao}>
        {carregando ? textoCarregando : texto}
      </Text>
      {!carregando && (
        <Ionicons name="arrow-forward" size={18} color={COR.branco} />
      )}
    </TouchableOpacity>
  );
}

export default function CartaoAuth({ titulo, subtitulo, children }) {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= LARGURA_DESKTOP;

  // No computador, a imagem. No celular, o marinho sólido.
  const comImagem = ehDesktop || IMAGEM_NO_CELULAR;
  const Fundo = comImagem ? ImageBackground : View;
  const propsFundo = comImagem
    ? { source: IMAGEM_FUNDO, resizeMode: "cover" }
    : {};

  return (
    <Fundo {...propsFundo} style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          style={{ backgroundColor: "transparent" }}
        >
          <View style={styles.cartao}>
            <Image
              source={require("../assets/images/logoTexto.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.titulo}>{titulo}</Text>
            {subtitulo ? <Text style={styles.subtitulo}>{subtitulo}</Text> : null}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Fundo>
  );
}

export const estilosAuth = StyleSheet.create({
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
  linkCentro: {
    marginTop: 16,
    alignItems: "center",
  },
  linkTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    color: AZUL,
    fontWeight: "600",
  },
  linkDesabilitado: { color: "#9AA3B2" },
});

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.marinho },

  // Sem justifyContent: "center" aqui, de propósito.
  //
  // Centralizar com justifyContent dentro de uma área rolável funciona
  // enquanto o conteúdo cabe. Quando ele passa da altura disponível -- com o
  // teclado aberto, ou numa tela baixa -- o excedente transborda para os DOIS
  // lados, e a parte que sobe fica fora do alcance da rolagem: o topo do
  // cartão (o logo) é cortado e não tem como chegar nele.
  //
  // O "marginVertical: auto" lá no cartão centraliza do mesmo jeito quando
  // sobra espaço, e quando não sobra, encosta no topo e deixa rolar até o fim.
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    padding: 24,
  },
  cartao: {
    width: "100%",
    maxWidth: 400,
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
  logo: { width: 150, height: 99, marginBottom: 6 },
  titulo: {
    fontFamily: FONTE.bold,
    fontSize: 21,
    fontWeight: "700",
    color: COR.tintaForte,
    marginTop: 2,
    textAlign: "center",
  },
  subtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    marginBottom: 14,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 19,
  },
  campoLinha: {
    width: "100%",
    // Âncora para o olhinho posicionado.
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderRadius: 14,
    paddingHorizontal: 14,
    backgroundColor: COR.fundo,
  },
  campoLinhaFocado: { borderColor: AZUL, backgroundColor: COR.branco },
  campoIcone: { marginRight: 8 },

  // O olhinho fica preso na direita da caixa, fora do fluxo.
  //
  // Antes ele era mais um item na fila do flexbox, disputando largura com o
  // campo de texto. Na web o TextInput vira um <input>, e o Safari do iPhone
  // dá a esse <input> uma largura mínima bem maior que a do Chrome -- com a
  // tela estreita não sobrava espaço e o olhinho era empurrado para fora da
  // borda. Posicionado, não existe largura que o expulse.
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
    // mínima própria que o flexbox respeita. Sem este minWidth: 0 a caixa
    // inteira vaza para fora do cartão quando a tela aperta.
    minWidth: 0,
    paddingVertical: 12,
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaForte,
  },
  // Espaço reservado para o olhinho, que agora flutua por cima.
  campoTextoComOlho: { paddingRight: 26 },

  aviso: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
    alignSelf: "stretch",
  },
  avisoErro: { backgroundColor: "#FEF2F2" },
  avisoOk: { backgroundColor: "#F0FDF4" },
  avisoTexto: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontWeight: "600",
    fontSize: 12.5,
  },
  botao: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    backgroundColor: AZUL,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  botaoDesabilitado: { opacity: 0.7 },
  textoBotao: {
    color: COR.branco,
    fontWeight: "700",
    fontFamily: FONTE.bold,
    fontSize: 14.5,
  },
});