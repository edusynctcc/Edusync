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
} from "react-native";
import { Link, router, Stack } from "expo-router";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
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

    router.replace("/");

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

      // aqui depois entra o armazenamento do token (ex: AsyncStorage)
      router.replace("/");
    } catch (e) {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
    ---------------------------------------------------------------------------- */
  }

  return (
    <KeyboardAvoidingView
      style={styles.tela}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.cartao}>
           <Image source={require("../assets/images/logoTexto.png")} style={styles.logo} resizeMode="contain" />
           <Text style={styles.rotulo}>Nome</Text>
          <TextInput
            style={styles.campo}
            placeholder="Digite seu email"
            placeholderTextColor="#9AA3B2"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.rotulo}>Senha</Text>
          <TextInput
            style={styles.campo}
            placeholder="Digite sua senha"
            placeholderTextColor="#9AA3B2"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          <View style={styles.linhaOpcoes}>
            <Text style={styles.linkPequeno}>Lembrar senha</Text>
            <Text style={styles.linkPequeno}>Esqueceu sua senha?</Text>
          </View>

          {erro ? <Text style={styles.textoErro}>{erro}</Text> : null}

          <TouchableOpacity
            style={styles.botao}
            onPress={handleLogin}
            disabled={carregando}
          >
            <Text style={styles.textoBotao}>
              {carregando ? "Entrando..." : "Entrar na Plataforma"}
            </Text>
          </TouchableOpacity>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Ainda não tem uma conta? </Text>
            <Link href="/cadastro" style={styles.rodapeLink}>
              Cadastre-se e conheça agora
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#0B1E3D",
  },
  logo: {
  width: 120,
  height: 120,
  alignSelf: 'center',
  marginBottom: 20,
  },
  scroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  cartao: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  marca: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0B1E3D",
    letterSpacing: 1,
    marginTop: 4,
  },
  slogan: {
    fontSize: 11,
    color: "#F5A623",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 20,
  },
  rotulo: {
    alignSelf: "flex-start",
    fontSize: 14,
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  campo: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0B1E3D",
    backgroundColor: "#F8FAFC",
  },
  linhaOpcoes: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    marginBottom: 8,
  },
  linkPequeno: {
    fontSize: 12,
    color: "#64748B",
  },
  textoErro: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 6,
    marginBottom: 4,
    textAlign: "center",
  },
  botao: {
    width: "100%",
    backgroundColor: "#2F6FED",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  textoBotao: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  rodape: {
    flexDirection: "row",
    marginTop: 18,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  rodapeTexto: {
    fontSize: 12,
    color: "#475569",
  },
  rodapeLink: {
    fontSize: 12,
    color: "#F5A623",
    fontWeight: "700",
  },
});