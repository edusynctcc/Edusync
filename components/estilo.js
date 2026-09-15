import { Platform } from "react-native";

const SISTEMA = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
});

export const FONTE = {
  regular: Platform.OS === "web" ? `PublicSans_400Regular, ${SISTEMA}` : "PublicSans_400Regular",
  media: Platform.OS === "web" ? `PublicSans_500Medium, ${SISTEMA}` : "PublicSans_500Medium",
  semi: Platform.OS === "web" ? `PublicSans_600SemiBold, ${SISTEMA}` : "PublicSans_600SemiBold",
  bold: Platform.OS === "web" ? `PublicSans_700Bold, ${SISTEMA}` : "PublicSans_700Bold",
};

export const COR = {
  marinho: "#0B1E3D",
  marinhoFundo: "#081730",
  marinhoClaro: "#9FB3D4",

  tintaForte: "#17242E",
  tintaMedia: "#55646F",
  tintaFraca: "#8795A0",
  chevron: "#B9C4CB",
  marcador: "#2E6FB0",

  linha: "#DDE3E7",
  linhaSuave: "#E9EEF0",
  fundo: "#F2F5F6",
  campo: "#EBEFF1",
  branco: "#FFFFFF",

  avisoFundo: "#FBF1E0",
  avisoTexto: "#8A4A12",

  ok: "#2F7D5C",
  okFundo: "#E6F2EC",
  emAndamento: "#2E6FB0",
  emAndamentoFundo: "#E7EFF7",
  perigo: "#B4443A",
  perigoFundo: "#FBEAE8",
};

export const RAIO = { etiqueta: 6, controle: 10, superficie: 16 };

export const TRANSICAO_WEB =
  Platform.OS === "web"
    ? { transitionProperty: "background-color", transitionDuration: "150ms" }
    : null;

export const SEM_CONTORNO_WEB = Platform.OS === "web" ? { outlineStyle: "none" } : null;