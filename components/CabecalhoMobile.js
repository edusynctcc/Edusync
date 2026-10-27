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

function iniciais(nome) {
  if (!nome) return "?";
  const partes = String(nome).trim().split(/\s+/);
  return ((partes[0]?.[0] || "") + (partes[1]?.[0] || "")).toUpperCase();
}

export default function CabecalhoMobile({
  linkPerfil = true,
  ehMobilePequeno = false,
  paddingBottom = 11,
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
            <Ionicons name="chevron-down" size={14} color={COR.branco} />
          )}
        </View>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.cabecalho,
        { paddingTop: Platform.OS === "web" ? 11 : 50, paddingBottom },
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

          <TouchableOpacity
            style={styles.botaoSair}
            activeOpacity={0.8}
            onPress={sair}
          >
            <Ionicons name="log-out-outline" size={17} color={COR.perigo} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingHorizontal: 18, backgroundColor: COR.marinho },
  cabecalhoMiolo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },

  logo: { width: 104, height: 28, flexShrink: 0 },
  logoPequeno: { width: 89, height: 24 },

  usuarioLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarPequeno: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COR.branco,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFoto: {
    width: 27,
    height: 27,
    borderRadius: 14,
  },
  avatarPequenoTexto: {
    fontFamily: FONTE.bold,
    color: COR.marinho,
    fontSize: 11,
  },
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    color: COR.branco,
    maxWidth: 110,
  },
  botaoSair: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});