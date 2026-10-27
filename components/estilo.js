import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// A FONTE
// O fallback para a fonte do sistema só existe na web, e não é enfeite: até o
// arquivo da fonte terminar de baixar, o navegador precisa de algo para
// desenhar. Sem isso, o texto some por um instante a cada carregamento.
// ---------------------------------------------------------------------------
const SISTEMA = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif",
});

export const FONTE = {
  regular:
    Platform.OS === "web" ? `Poppins_400Regular, ${SISTEMA}` : "Poppins_400Regular",
  media:
    Platform.OS === "web" ? `Poppins_500Medium, ${SISTEMA}` : "Poppins_500Medium",
  semi:
    Platform.OS === "web" ? `Poppins_600SemiBold, ${SISTEMA}` : "Poppins_600SemiBold",
  bold:
    Platform.OS === "web" ? `Poppins_700Bold, ${SISTEMA}` : "Poppins_700Bold",
};

// ---------------------------------------------------------------------------
// AS CORES
//
// O que mudou e por quê.
//
// Os neutros saíram do cinza AZULADO para cinza de verdade. Cinza puxado para
// o azul é a assinatura de interface gerada por IA — e, de quebra, o cinza
// claro azulado que estava aqui tinha contraste ruim: o tintaFraca #8795A0
// dava 3,07 sobre branco, abaixo dos 4,5 que texto pequeno precisa. O novo
// #6C757D dá 4,69. Ou seja, ficou menos "IA" e mais legível ao mesmo tempo.
//
//   tintaMedia  6,11 -> 8,18
//   tintaFraca  3,07 -> 4,69   (passou a cumprir o mínimo)
//
// As bordas ficaram visíveis. A linhaSuave era #E9EEF0, que sobre branco dá
// 1,17 de contraste — na prática, borda nenhuma. Cartão branco sem borda sobre
// fundo quase branco é exatamente o visual de template; sistema de verdade tem
// a linha à vista.
//
// O que NÃO mudou: marinho, amarelo e destaque. São a marca do EduSync. O que
// dá a cara de sistema institucional é a ESTRUTURA — canto seco, borda à
// vista, cinza neutro —, não trocar o azul por outro azul.
// ---------------------------------------------------------------------------
export const COR = {
  // ----------------------------------------------------- a marca (intocada)
  marinho: "#0B1E3D",
  marinhoFundo: "#081730",
  marinhoClaro: "#9FB3D4",
  amareloLogo: "#FFD447",
  destaque: "#F5811F",

  // ------------------------------------------------------------- os neutros
  tintaForte: "#212529",
  tintaMedia: "#495057",
  tintaFraca: "#6C757D",
  chevron: "#ADB5BD",
  marcador: "#2E6FB0",

  // ------------------------------------------------ linhas, fundos e campos
  linha: "#CED4DA",
  linhaSuave: "#DEE2E6",
  // Medido no print que você mandou: #F0F0F0, cinza sem temperatura nenhuma.
  fundo: "#F0F0F0",
  campo: "#F1F3F5",
  branco: "#FFFFFF",

  // --------------------------------------------------------------- estados
  // As cores de estado ficaram como estavam: o verde #2F7D5C e o vermelho
  // #B4443A são contidos, e justamente por isso não parecem template — o
  // visual gerado por IA costuma usar #10B981 e #EF4444, que gritam. Só os
  // FUNDOS ficaram um pouco menos pastel, para acompanhar o resto.
  avisoFundo: "#FAF0DF",
  avisoTexto: "#8A4A12",

  ok: "#2F7D5C",
  okFundo: "#E4EFE9",
  emAndamento: "#2E6FB0",
  emAndamentoFundo: "#E4EBF3",
  perigo: "#B4443A",
  perigoFundo: "#F7E7E5",
};

export const RAIO = { etiqueta: 5, controle: 8, superficie: 12 };

export const TRANSICAO_WEB =
  Platform.OS === "web"
    ? { transitionProperty: "background-color", transitionDuration: "150ms" }
    : null;

export const SEM_CONTORNO_WEB =
  Platform.OS === "web" ? { outlineStyle: "none" } : null;