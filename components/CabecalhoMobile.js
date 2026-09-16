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

const SISTEMA = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
});

const FONTE = {
  semi:
    Platform.OS === "web"
      ? `PublicSans_600SemiBold, ${SISTEMA}`
      : "PublicSans_600SemiBold",
  bold:
    Platform.OS === "web"
      ? `PublicSans_700Bold, ${SISTEMA}`
      : "PublicSans_700Bold",
};

const INICIAIS_PROFESSOR = "AS";

export default function CabecalhoMobile({
  linkPerfil = true,
  ehMobilePequeno = false,
  paddingBottom = 11,
}) {
  const router = useRouter();

  function sair() {
    router.replace("/login");
  }

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
            <Ionicons name="log-out-outline" size={17} color="#F87171" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cabecalho: { paddingHorizontal: 18, backgroundColor: "#0B1E3D" },
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPequenoTexto: {
    fontFamily: FONTE.bold,
    color: "#0B1E3D",
    fontSize: 11,
  },
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: { fontFamily: FONTE.semi, fontSize: 12.5, color: "#FFFFFF" },
  botaoSair: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(248,113,113,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});
