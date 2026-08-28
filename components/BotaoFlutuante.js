
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity } from "react-native";

export default function BotaoFlutuante({ onPress, icone = "add", tamanho = 46, style }) {
  return (
    <TouchableOpacity
      style={[
        styles.fab,
        { width: tamanho, height: tamanho, borderRadius: tamanho / 2 },
        style,
      ]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <Ionicons name={icone} size={Math.round(tamanho * 0.48)} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 20,
    backgroundColor: "#3B82F6",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
});