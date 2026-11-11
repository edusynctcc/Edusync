import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COR, FONTE } from "./estilo";
import { buscarPerfil } from "../constants/api";

// Mostrar ou não o atalho de sair aqui no cabeçalho.
//
// Tocar no nome já leva ao Perfil, e lá existe o botão "Sair da conta". Então
// este atalho é conveniência, não a única saída. Põe false se quiser o
// cabeçalho limpo, só com o logo e o seu nome -- nada se perde.
const MOSTRAR_SAIR = true;

// Tamanho geral do cabeçalho.
//
// Todas as medidas daqui -- logo, avatar, botão de sair, textos, respiro --
// saem deste fator. Mexendo só neste número, o cabeçalho inteiro cresce ou
// diminui junto, e a proporção entre as peças continua exatamente a mesma.
// 1 = o tamanho original.
const ESCALA = 1.18;

// px para medidas (pixel inteiro), pt para fontes (meio ponto já é suficiente).
const px = (n) => Math.round(n * ESCALA);
const pt = (n) => Math.round(n * ESCALA * 2) / 2;

function iniciais(nome) {
  if (!nome) return "?";
  const partes = String(nome).trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
}

export default function CabecalhoMobile({
  linkPerfil = true,
  ehMobilePequeno = false,
  paddingBottom = px(11),
}) {
  const router = useRouter();
  const [professor, setProfessor] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      buscarPerfil()
        .then((dados) => {
          if (ativo) setProfessor(dados);
        })
        .catch(() => {
        });
      return () => {
        ativo = false;
      };
    }, [])
  );

  async function sair() {
    await AsyncStorage.removeItem("token");
    router.replace("/login");
  }

  const conteudoAvatar = (
    <>
      {professor?.foto ? (
        <Image source={{ uri: professor.foto }} style={styles.avatarFoto} />
      ) : (
        <View style={styles.avatarPequeno}>
          <Text style={styles.avatarPequenoTexto}>
            {iniciais(professor?.nome)}
          </Text>
        </View>
      )}
      {!ehMobilePequeno && (
        <View style={styles.usuarioNomeLinha}>
          <Text style={styles.usuarioNome} numberOfLines={1}>
            {professor?.nome || ""}
          </Text>
          {linkPerfil && (
            <Ionicons name="chevron-down" size={px(14)} color={COR.branco} />
          )}
        </View>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.cabecalho,
        {
          paddingTop: Platform.OS === "web" ? px(11) : 50,
          paddingBottom,
        },
      ]}
    >
      <View style={styles.cabecalhoMiolo}>
        <Image
          source={require("../assets/images/logo_escrita.png")}
          style={[styles.logo, ehMobilePequeno && styles.logoPequeno]}
          resizeMode="contain"
        />

        <View style={styles.usuarioLinha}>
          {linkPerfil ? (
            <TouchableOpacity
              style={styles.usuarioLinha}
              activeOpacity={0.8}
              onPress={() => router.push("/perfil")}
            >
              {conteudoAvatar}
            </TouchableOpacity>
          ) : (
            conteudoAvatar
          )}

          {MOSTRAR_SAIR && (
            <TouchableOpacity
              style={styles.botaoSair}
              activeOpacity={0.7}
              onPress={sair}
              // A área tocável fica maior que o desenho. O círculo tem 32px,
              // abaixo dos 44 que o dedo pede; o hitSlop cobre a diferença
              // sem engordar o botão na tela.
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Sair da conta"
            >
              <Ionicons
                name="log-out-outline"
                size={px(18)}
                color="rgba(255,255,255,0.82)"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingHorizontal: px(18), backgroundColor: COR.marinho },
  cabecalhoMiolo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },

  // resizeMode "contain" mantém a proporção do desenho dentro destas
  // medidas, então mesmo com o arredondamento o logo nunca distorce.
  logo: { width: px(104), height: px(28), flexShrink: 0 },
  logoPequeno: { width: px(89), height: px(24) },

  usuarioLinha: { flexDirection: "row", alignItems: "center", gap: px(8) },
  avatarPequeno: {
    width: px(27),
    height: px(27),
    borderRadius: px(27) / 2,
    backgroundColor: COR.branco,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFoto: {
    width: px(27),
    height: px(27),
    borderRadius: px(27) / 2,
  },
  avatarPequenoTexto: {
    fontFamily: FONTE.bold,
    color: COR.marinho,
    fontSize: pt(11),
  },
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: px(4) },
  usuarioNome: {
    fontFamily: FONTE.semi,
    fontSize: pt(12.5),
    color: COR.branco,
    maxWidth: px(110),
  },
  // Vermelho em cima de azul-marinho é o maior contraste da tela inteira, e
  // isso fazia o "sair" gritar mais que "Escanear atividade" -- justamente a
  // ação que a pessoa veio fazer. Sair da conta também não é destrutivo: ela
  // entra de novo. Vermelho fica guardado para o que não tem volta.
  //
  // Agora é um círculo de branco translúcido: ele pertence ao cabeçalho, o
  // dedo encontra, e não disputa atenção com o resto.
  botaoSair: {
    width: px(32),
    height: px(32),
    borderRadius: px(32) / 2,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: px(4),
  },
});