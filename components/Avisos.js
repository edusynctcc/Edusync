import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COR, FONTE, RAIO } from "./estilo";

// ---------------------------------------------------------------------------
// O AVISO FLUTUANTE
//
// Antes cada tela desenhava o seu próprio bloco vermelho, e o resultado era
// desigual: em Atividades e em Perfil o erro era guardado numa variável que
// ninguém chegava a mostrar -- a pessoa clicava, nada acontecia e nada
// explicava. Agora existe um lugar só, desenhado uma vez no layout.
//
// Três comportamentos, nesta ordem de prioridade:
//
//   1. some sozinho depois de 5 segundos;
//   2. some na hora em que o problema é resolvido, mesmo antes disso;
//   3. some quando a pessoa clica no X.
//
// O item 2 é o que faz diferença no uso real: você corrige o campo e o aviso
// vai embora junto, em vez de ficar acusando um erro que não existe mais.
// ---------------------------------------------------------------------------
const TEMPO = 5000;

// Um aviso por vez. Qualquer tela levanta o seu chamando a função, sem
// contexto e sem prop atravessando cinco componentes.
let avisoAtual = null;
let proximoId = 1;
const ouvintes = new Set();

function espalhar() {
  for (const ouvinte of ouvintes) ouvinte(avisoAtual);
}

export function avisar(texto, tipo = "erro") {
  const limpo = String(texto ?? "").trim();
  if (!limpo) return null;

  avisoAtual = { id: proximoId++, texto: limpo, tipo };
  espalhar();
  return avisoAtual.id;
}

// Sem id, fecha o que estiver na tela. Com id, só fecha se o aviso na tela for
// aquele mesmo -- assim uma tela não apaga o aviso levantado por outra.
export function fecharAviso(id) {
  if (!avisoAtual) return;
  if (id !== undefined && id !== null && avisoAtual.id !== id) return;

  avisoAtual = null;
  espalhar();
}

// Liga o aviso ao estado de erro de uma tela: aparece quando a mensagem
// aparece e some quando ela é limpa.
export function useAviso(mensagem, tipo = "erro") {
  const meu = useRef(null);

  useEffect(() => {
    if (mensagem) {
      meu.current = avisar(mensagem, tipo);
      return;
    }

    if (meu.current) {
      fecharAviso(meu.current);
      meu.current = null;
    }
  }, [mensagem, tipo]);
}

const CARA = {
  erro: {
    fundo: COR.perigoFundo,
    borda: COR.perigo,
    tinta: COR.perigo,
    icone: "alert-circle",
  },
  ok: {
    fundo: COR.okFundo,
    borda: COR.ok,
    tinta: COR.ok,
    icone: "checkmark-circle",
  },
  aviso: {
    fundo: COR.avisoFundo,
    borda: COR.avisoTexto,
    tinta: COR.avisoTexto,
    icone: "information-circle",
  },
};

export default function Avisos() {
  const [atual, setAtual] = useState(() => avisoAtual);
  // useState em vez de useRef: o valor é lido durante o render, e ref lida
  // no render é justamente o que o compilador do React proíbe.
  const [entrada] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const ouvinte = (novo) => setAtual(novo);
    ouvintes.add(ouvinte);
    return () => {
      ouvintes.delete(ouvinte);
    };
  }, []);

  useEffect(() => {
    if (!atual) return;

    entrada.setValue(0);
    Animated.timing(entrada, {
      toValue: 1,
      duration: 180,
      useNativeDriver: Platform.OS !== "web",
    }).start();

    const relogio = setTimeout(() => fecharAviso(atual.id), TEMPO);
    return () => clearTimeout(relogio);
  }, [atual, entrada]);

  if (!atual) return null;

  const cara = CARA[atual.tipo] || CARA.erro;

  return (
    <View style={styles.area} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.cartao,
          {
            backgroundColor: cara.fundo,
            borderColor: cara.borda,
            opacity: entrada,
            transform: [
              {
                translateY: entrada.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Ionicons name={cara.icone} size={19} color={cara.tinta} />

        <Text style={[styles.texto, { color: cara.tinta }]} numberOfLines={4}>
          {atual.texto}
        </Text>

        <TouchableOpacity
          onPress={() => fecharAviso(atual.id)}
          hitSlop={10}
          activeOpacity={0.6}
        >
          <Ionicons name="close" size={17} color={cara.tinta} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    zIndex: 90,
  },
  cartao: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    maxWidth: 460,
    borderWidth: 1,
    borderRadius: RAIO.controle,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 8,
  },
  texto: {
    flex: 1,
    fontFamily: FONTE.media,
    fontSize: 13.5,
    lineHeight: 19,
  },
});
