import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

export default function CabecalhoMobile({
  comSino = false,
  linkPerfil = true,
  ehMobilePequeno = false,
  paddingBottom = 16,
}) {
  const router = useRouter();

  const conteudoAvatar = (
    <>
      <View style={styles.avatarPequeno}>
        <Text style={styles.avatarPequenoTexto}>{INICIAIS_PROFESSOR}</Text>
      </View>
      {!ehMobilePequeno && (
        <View style={styles.usuarioNomeLinha}>
          <Text style={styles.usuarioNome}>Ana Silva</Text>
          {linkPerfil && (
            <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
          )}
        </View>
      )}
    </>
  );

  return (
    <View
      style={[
        styles.cabecalho,
        { paddingTop: Platform.OS === "web" ? 18 : 56, paddingBottom },
      ]}
    >
      <View style={styles.cabecalhoMiolo}>
        <Image
          source={require("../assets/images/logoImg.png")}
          style={[styles.logo, ehMobilePequeno && { width: 40, height: 40 }]}
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

          {comSino && (
            <View style={styles.sino}>
              <Ionicons
                name="notifications-outline"
                size={16}
                color="#FFFFFF"
              />
              <View style={styles.sinoPonto} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingHorizontal: 20, backgroundColor: "#0B1E3D" },
  cabecalhoMiolo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  logo: { width: 48, height: 48 },
  usuarioLinha: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarPequeno: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPequenoTexto: { color: "#0B1E3D", fontSize: 11, fontWeight: "700" },
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },
  sino: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  sinoPonto: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F5A623",
  },
});
