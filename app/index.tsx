// Conteúdo para colocar em app/index.js (arquivo novo, direto dentro de app/, fora de (tabs))
import { Redirect } from "expo-router";

export default function Index() {
  return <Redirect href="/login" />;
}