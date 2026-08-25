// Conteúdo para colocar em app/(tabs)/index.tsx (substitua todo o conteúdo do arquivo por este)
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Quando a logo estiver pronta:
// 1. salve o arquivo em assets/images/logo.png
// 2. importe Image de "react-native" (adicione ao import acima)
// 3. troque o bloco do ícone abaixo por:
//    <Image source={require("../../assets/images/logo.png")} style={styles.logo} resizeMode="contain" />
// Não deixe o require() no código antes de o arquivo existir — o Metro quebra o build
// mesmo que o require esteja dentro de um "if" que nunca roda.

export default function Home() {
  return (
    <View style={styles.tela}>
      <View style={styles.topo}>
        {/* Cabeçalho */}
        <View style={styles.cabecalho}>
          <View style={styles.marcaLinha}>
            <Ionicons name="school" size={22} color="#F5A623" />
            <View>
              <Text style={styles.marca}>EDUSYNC</Text>
              <Text style={styles.marcaSub}>DESDE 2025</Text>
            </View>
          </View>

          <View style={styles.usuarioLinha}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTexto}>AS</Text>
            </View>
            <View style={styles.usuarioNomeLinha}>
              <Text style={styles.usuarioNome}>Ana Silva</Text>
              <Ionicons name="chevron-down" size={14} color="#FFFFFF" />
            </View>
            <TouchableOpacity style={styles.sino}>
              <Ionicons
                name="notifications-outline"
                size={20}
                color="#FFFFFF"
              />
              <View style={styles.sinoPonto} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Card do scanner */}
        <View style={styles.cartaoScanner}>
          <View style={styles.visor}>
            <Ionicons name="scan-outline" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.tituloScanner}>Scanner de Atividades</Text>

          <View style={styles.botoesLinha}>
            <TouchableOpacity style={styles.botaoPrimario}>
              <Ionicons name="camera" size={16} color="#0B1E3D" />
              <Text style={styles.textoBotaoPrimario}>Tirar Foto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoSecundario}>
              <Ionicons name="image-outline" size={16} color="#FFFFFF" />
              <Text style={styles.textoBotaoSecundario}>Enviar Imagem</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.botaoSecundario}>
              <MaterialCommunityIcons
                name="file-pdf-box"
                size={16}
                color="#FFFFFF"
              />
              <Text style={styles.textoBotaoSecundario}>Enviar PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Área de conteúdo abaixo do card (correções recentes, etc.) */}
      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={styles.conteudoInterno}
      >
        <Text style={styles.conteudoTitulo}>Correções recentes</Text>
        <Text style={styles.conteudoVazio}>
          Nenhuma correção ainda. Toque em "Tirar Foto" para começar.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  topo: {
    backgroundColor: "#0B1E3D",
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  marcaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    width: 24,
    height: 24,
  },
  marca: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  marcaSub: {
    color: "#F5A623",
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  usuarioLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTexto: {
    color: "#0B1E3D",
    fontSize: 11,
    fontWeight: "700",
  },
  usuarioNomeLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  usuarioNome: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  sino: {
    marginLeft: 4,
  },
  sinoPonto: {
    position: "absolute",
    top: -1,
    right: -1,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  cartaoScanner: {
    backgroundColor: "#15316B",
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  visor: {
    width: 72,
    height: 72,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.35)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  tituloScanner: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 18,
  },
  botoesLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  botaoPrimario: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5A623",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  textoBotaoPrimario: {
    color: "#0B1E3D",
    fontWeight: "700",
    fontSize: 12,
  },
  botaoSecundario: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },
  textoBotaoSecundario: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 12,
  },
  conteudo: {
    flex: 1,
  },
  conteudoInterno: {
    padding: 20,
  },
  conteudoTitulo: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0B1E3D",
    marginBottom: 8,
  },
  conteudoVazio: {
    fontSize: 13,
    color: "#64748B",
  },
});
