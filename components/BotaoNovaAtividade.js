import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

export default function BotaoNovaAtividade({
  texto = "Nova atividade",
  descricao,
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.botao}
      activeOpacity={0.85}
      onPress={() => router.push("/atividades")}
    >
      <Ionicons name="add" size={20} color="#FFFFFF" />
      <Text style={styles.textos}>
        <Text style={styles.titulo}>{texto}</Text>
        {descricao ? `\n${descricao}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  botao: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 9,
    width: "100%",
  },
  textos: {
    color: "#DBEAFE",
    fontSize: 12,
    lineHeight: 18,
  },
  titulo: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
