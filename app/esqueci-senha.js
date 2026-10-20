import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import CartaoAuth, {
  BotaoAzul,
  Campo,
  CaixaMensagem,
  estilosAuth,
} from "../components/CartaoAuth";
import { esqueciSenha } from "../constants/api";
 
export default function EsqueciSenha() {
  const params = useLocalSearchParams();
  const [email, setEmail] = useState(params.email ? String(params.email) : "");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
 
  async function enviar() {
    setErro("");
    const emailLimpo = email.trim().toLowerCase();
 
    if (!emailLimpo.includes("@") || !emailLimpo.includes(".")) {
      setErro("Digite o e-mail da sua conta.");
      return;
    }
 
    setCarregando(true);
    try {
      await esqueciSenha(emailLimpo);
      router.push({
        pathname: "/codigo",
        params: { email: emailLimpo, modo: "senha" },
      });
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }
 
  return (
    <CartaoAuth
      titulo="Esqueceu sua senha?"
      subtitulo="Digite o e-mail da sua conta e enviaremos um código para você criar uma nova senha."
    >
      <Text style={estilosAuth.rotulo}>E-mail</Text>
      <Campo
        icone="mail-outline"
        placeholder="Digite seu email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        onSubmitEditing={enviar}
      />
 
      <CaixaMensagem texto={erro} />
 
      <BotaoAzul
        texto="Enviar código"
        carregando={carregando}
        textoCarregando="Enviando..."
        onPress={enviar}
      />
 
      <TouchableOpacity
        style={estilosAuth.linkCentro}
        onPress={() => router.replace("/login")}>
        <Text style={estilosAuth.linkTexto}>Voltar ao login</Text>
      </TouchableOpacity>
    </CartaoAuth>
  );
}