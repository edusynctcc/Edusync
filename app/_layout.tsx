import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export const unstable_settings = {
  anchor: "index",
};

export default function RootLayout() {
  // Carrega os pesos usados globalmente antes de exibir qualquer tela.
  const [fontesProntas, erroNasFontes] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  // --------------------------------------------------------------------
  // O FREIO DA TELA AZUL
  //
  // Esperar a fonte antes de desenhar qualquer coisa é certo -- sem isso o
  // texto pisca a cada carregamento. Errado era esperar PARA SEMPRE: se o
  // arquivo da fonte não chega (cache meio trocado depois de um deploy,
  // internet ruim, arquivo que voltou 404), o app ficava num retângulo
  // azul-marinho, sem mensagem, sem saída e sem dizer o que houve.
  //
  // Agora a espera tem prazo. Passados 4 segundos o app abre do mesmo
  // jeito, com a fonte do sistema. Feio é melhor do que inexistente.
  // --------------------------------------------------------------------
  const [esperouDemais, setEsperouDemais] = useState(false);

  useEffect(() => {
    const relogio = setTimeout(() => setEsperouDemais(true), 4000);
    return () => clearTimeout(relogio);
  }, []);

  if (!fontesProntas && !erroNasFontes && !esperouDemais) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0B1E3D",
        }}
      >
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="cadastro" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}