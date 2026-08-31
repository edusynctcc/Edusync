// Conteúdo para colocar em app/welcome.js (arquivo novo, direto dentro de
// app/, fora de (tabs) — igual login.js e cadastro.js).
//
// Tela de boas-vindas: a primeira tela que a pessoa vê ao abrir o app,
// antes de login/cadastro.
//
// No mobile: fundo em degradê + onda + card branco (logo, "Bem-vindo!",
// botões "Criar Conta"/"Entrar", ícones de login social só visuais).
//
// No desktop essa tela nem aparece: a pessoa é redirecionada direto pra
// /login (o welcome é só uma introdução pensada pra tela de celular).
//
// Depois de colar esse arquivo, troque o redirect em app/index.js pra
// mandar pra "/welcome" em vez de "/login" (essa tela é que deve ser a
// primeira agora).

import { Redirect, Stack, useRouter } from "expo-router";
import {
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";

const LARGURA_DESKTOP = 900;

const CONTAS_SOCIAIS = [
  { chave: "google", icone: "logo-google", cor: "#EA4335" },
  { chave: "microsoft", icone: "grid-outline", cor: "#5C7096" },
  { chave: "apple", icone: "logo-apple", cor: "#0B1E3D" },
];

export default function Welcome() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isDesktop = width >= LARGURA_DESKTOP;

  const botoesEContas = (
    <>
      <TouchableOpacity
        style={styles.botaoPrimario}
        activeOpacity={0.9}
        onPress={() => router.push("/cadastro")}
      >
        <Text style={styles.botaoPrimarioTexto}>Criar Conta</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botaoSecundario}
        activeOpacity={0.85}
        onPress={() => router.push("/login")}
      >
        <Text style={styles.botaoSecundarioTexto}>Entrar</Text>
      </TouchableOpacity>

      <View style={styles.divisorLinha}>
        <View style={styles.divisorTraco} />
        <Text style={styles.divisorTexto}>ou continue com</Text>
        <View style={styles.divisorTraco} />
      </View>

      <View style={styles.contasSociaisLinha}>
        {CONTAS_SOCIAIS.map((conta) => (
          <TouchableOpacity key={conta.chave} style={styles.contaSocialCirculo} activeOpacity={0.8}>
            <Ionicons name={conta.icone} size={20} color={conta.cor} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );

  // ---------- no desktop essa tela nem existe: manda direto pro login ----------
  if (isDesktop) {
    return <Redirect href="/login" />;
  }

  // ---------- versão mobile: degradê + onda + card ----------
  return (
    <View style={styles.tela}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" />

      <View style={styles.areaTopo}>
        <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="fundoDegrade" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#0B1E3D" />
              <Stop offset="0.55" stopColor="#1D4ED8" />
              <Stop offset="1" stopColor="#3B82F6" />
            </LinearGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#fundoDegrade)" />
        </Svg>

        <Svg
          width="100%"
          height={70}
          viewBox="0 0 400 70"
          preserveAspectRatio="none"
          style={styles.onda}
        >
          <Path
            d="M 0 35 C 80 5, 150 65, 230 38 C 300 15, 350 42, 400 27 L 400 70 L 0 70 Z"
            fill="#FFFFFF"
          />
        </Svg>
      </View>

      <View style={styles.cardBranco}>
        <View style={styles.logoCirculo}>
          <Image
            source={require("../assets/images/logoTexto.png")}
            style={styles.logoImagem}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.titulo}>Bem-vindo!</Text>
        <Text style={styles.subtitulo}>
          Corrija atividades mais rápido com a ajuda da IA do EduSync.
        </Text>

        {botoesEContas}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ----- mobile -----
  tela: { flex: 1, backgroundColor: "#0B1E3D" },
  areaTopo: { height: "38%", position: "relative" },
  onda: { position: "absolute", bottom: -1, left: 0 },

  cardBranco: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    alignItems: "center",
  },

  logoCirculo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -50,
    marginBottom: 18,
    elevation: 5,
    shadowColor: "#0B1E3D",
    shadowOpacity: 0.18,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: "#EEF1F6",
  },
  logoImagem: { width: 64, height: 64 },

  // ----- compartilhado -----
  logo: { width: 120, height: 80, marginBottom: 8 },
  titulo: { fontSize: 24, fontWeight: "700", color: "#0B1E3D", marginBottom: 8, textAlign: "center" },
  subtitulo: {
    fontSize: 13.5,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 19,
    maxWidth: 300,
    marginBottom: 28,
  },

  botaoPrimario: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 12,
  },
  botaoPrimarioTexto: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  botaoSecundario: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 24,
  },
  botaoSecundarioTexto: { color: "#3B82F6", fontSize: 15, fontWeight: "700" },

  divisorLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    maxWidth: 320,
    marginBottom: 20,
  },
  divisorTraco: { flex: 1, height: 1, backgroundColor: "#EEF1F6" },
  divisorTexto: { fontSize: 11.5, color: "#94A3B8" },

  contasSociaisLinha: { flexDirection: "row", gap: 16 },
  contaSocialCirculo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F4F6FA",
    borderWidth: 1,
    borderColor: "#EEF1F6",
    alignItems: "center",
    justifyContent: "center",
  },
});