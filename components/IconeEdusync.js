import { Ionicons } from "@expo/vector-icons";

const EQUIVALENTE = {
  home: "home-outline",
  turmas: "people-outline",
  atividades: "document-text-outline",
  scanner: "scan-outline",
  correcoes: "checkmark-done-outline",
  perfil: "person-outline",
  documento: "document-outline",
  grafico: "bar-chart-outline",
  checklist: "list-outline",
};

export default function IconeEdusync({ nome, tamanho = 22, cor, style }) {
  const equivalente = EQUIVALENTE[nome];
  if (!equivalente) return null;

  return <Ionicons name={equivalente} size={tamanho} color={cor} style={style} />;
}