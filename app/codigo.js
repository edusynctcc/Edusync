import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TouchableOpacity } from "react-native";
import CartaoAuth, {
  BotaoAzul,
  Campo,
  CaixaMensagem,
  estilosAuth,
} from "../components/CartaoAuth";
import {
  loginComCodigo,
  redefinirSenha,
  reenviarCodigo,
  verificarEmail,
} from "../constants/api";

const ESPERA_REENVIO = 60;

const TEXTOS = {
  cadastro: { titulo: "Confirme seu e-mail", botao: "Confirmar e entrar" },
  login: { titulo: "Verificação em duas etapas", botao: "Entrar" },
  senha: { titulo: "Redefinir senha", botao: "Salvar nova senha" },
};

export default function Codigo() {
  const params = useLocalSearchParams();
  const email = String(params.email || "");
  const modo = TEXTOS[params.modo] ? String(params.modo) : "cadastro";

  const [codigo, setCodigo] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [info, setInfo] = useState("");
  const [segundos, setSegundos] = useState(ESPERA_REENVIO);

  useEffect(() => {
    if (segundos <= 0) return undefined;
    const t = setTimeout(() => setSegundos((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [segundos]);

  async function confirmarCodigo() {
    setErro("");
    setInfo("");

    if (!/^\d{6}$/.test(codigo.trim())) {
      setErro("Digite os 6 números do código.");
      return;
    }

    if (modo === "senha") {
      if (novaSenha.length < 6) {
        setErro("A nova senha deve ter pelo menos 6 caracteres.");
        return;
      }
      if (novaSenha !== confirmar) {
        setErro("As senhas não coincidem.");
        return;
      }
    }

    setCarregando(true);
    try {
      if (modo === "cadastro") {
        await verificarEmail(email, codigo.trim());
        router.replace("/home");
      } else if (modo === "login") {
        await loginComCodigo(email, codigo.trim());
        router.replace("/home");
      } else {
        await redefinirSenha(email, codigo.trim(), novaSenha);
        router.replace({ pathname: "/login", params: { email } });
      }
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }

  async function reenviar() {
    if (segundos > 0) return;
    setErro("");
    setInfo("");
    try {
      await reenviarCodigo(email, modo);
      setInfo("Enviamos um novo código para o seu e-mail.");
      setSegundos(ESPERA_REENVIO);
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <CartaoAuth
      titulo={TEXTOS[modo].titulo}
      subtitulo={`Enviamos um código de 6 dígitos para ${email}. Ele vale por 10 minutos.`}
    >
      <Text style={estilosAuth.rotulo}>Código</Text>
      <Campo
        icone="keypad-outline"
        placeholder="000000"
        value={codigo}
        onChangeText={(v) => setCodigo(v.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
        onSubmitEditing={modo === "senha" ? undefined : confirmarCodigo}
      />

      {modo === "senha" && (
        <>
          <Text style={estilosAuth.rotulo}>Nova senha</Text>
          <Campo
            icone="lock-closed-outline"
            placeholder="Mínimo de 6 caracteres"
            value={novaSenha}
            onChangeText={setNovaSenha}
            secureTextEntry={!mostrarSenha}
            olho
            olhoAberto={mostrarSenha}
            aoAlternarOlho={() => setMostrarSenha((v) => !v)}
          />

          <Text style={estilosAuth.rotulo}>Confirmar nova senha</Text>
          <Campo
            icone="lock-closed-outline"
            placeholder="Digite a senha novamente"
            value={confirmar}
            onChangeText={setConfirmar}
            secureTextEntry={!mostrarSenha}
            onSubmitEditing={confirmarCodigo}
          />
        </>
      )}

      <CaixaMensagem texto={erro} />
      <CaixaMensagem texto={info} tipo="ok" />

      <BotaoAzul
        texto={TEXTOS[modo].botao}
        carregando={carregando}
        textoCarregando="Verificando..."
        onPress={confirmarCodigo}
      />

      <TouchableOpacity
        style={estilosAuth.linkCentro}
        onPress={reenviar}
        disabled={segundos > 0}
      >
        <Text
          style={[estilosAuth.linkTexto, segundos > 0 && estilosAuth.linkDesabilitado]}
        >
          {segundos > 0 ? `Reenviar código em ${segundos}s` : "Reenviar código"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={estilosAuth.linkCentro}
        onPress={() => router.replace("/login")}
      >
        <Text style={estilosAuth.linkTexto}>Voltar ao login</Text>
      </TouchableOpacity>
    </CartaoAuth>
  );
}