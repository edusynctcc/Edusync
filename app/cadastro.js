// app/cadastro.js
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

export default function Cadastro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleCadastro() {
    setErro("");

    if (!nome || !email || !senha || !confirmarSenha) {
      setErro("Preencha todos os campos.");
      return;
    }
    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      const resposta = await fetch("http://localhost:3000/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Não foi possível criar a conta.");
        return;
      }

      router.replace("/");
    } catch (e) {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
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
            placeholder="Digite seu nome"
            placeholderTextColor="#9AA3B2"
            value={nome}
            onChangeText={setNome}
          />

          <Text style={styles.rotulo}>E-mail</Text>
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
            placeholder="Mínimo de 6 caracteres"
            placeholderTextColor="#9AA3B2"
            value={senha}
            onChangeText={setSenha}
            secureTextEntry
          />

          <Text style={styles.rotulo}>Confirmar senha</Text>
          <TextInput
            style={styles.campo}
            placeholder="Digite a senha novamente"
            placeholderTextColor="#9AA3B2"
            value={confirmarSenha}
            onChangeText={setConfirmarSenha}
            secureTextEntry
          />

          {erro ? <Text style={styles.textoErro}>{erro}</Text> : null}

          <TouchableOpacity
            style={styles.botao}
            onPress={handleCadastro}
            disabled={carregando}
          >
            <Text style={styles.textoBotao}>
              {carregando ? "Criando conta..." : "Criar Conta"}
            </Text>
          </TouchableOpacity>

          <View style={styles.rodape}>
            <Text style={styles.rodapeTexto}>Já tem uma conta? </Text>
            <Link href="/login" style={styles.rodapeLink}>
              Entrar
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
  textoErro: {
    color: "#DC2626",
    fontSize: 13,
    marginTop: 10,
    marginBottom: 4,
    textAlign: "center",
  },
  botao: {
    width: "100%",
    backgroundColor: "#2F6FED",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 18,
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