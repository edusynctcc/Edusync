import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { COR, FONTE, RAIO } from "./estilo";
import { listarAvisos } from "../constants/api";

const INTERVALO_MS = 8000;
const VISIVEL_MS = 8000;

export default function AvisoCorrecao() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;

  const [aviso, setAviso] = useState(null);
  const vistos = useRef(null);
  const chave = useRef(null);
  const fechar = useRef(null);
  const ocupado = useRef(false);

  useEffect(() => {
    let ativo = true;

    async function verificar() {
      if (ocupado.current) return;
      ocupado.current = true;
      try {
        const dados = await listarAvisos();
        if (!ativo) return;

        const concluidas = dados.concluidas || [];
        const ids = concluidas.map((c) => c.id_correcao);

        if (vistos.current === null) {
          chave.current = `avisos_vistos_${dados.id_professor}`;
          const salvo = await AsyncStorage.getItem(chave.current);
          if (salvo) {
            vistos.current = new Set(JSON.parse(salvo));
          } else {
            vistos.current = new Set(ids);
            await AsyncStorage.setItem(chave.current, JSON.stringify(ids));
            return;
          }
        }

        const novas = concluidas.filter((c) => !vistos.current.has(c.id_correcao));
        if (novas.length === 0) return;

        novas.forEach((c) => vistos.current.add(c.id_correcao));
        await AsyncStorage.setItem(chave.current, JSON.stringify([...vistos.current]));

        if (!dados.notif_correcao || !ativo) return;

        setAviso({
          quantidade: novas.length,
          atividade: novas[0].atividade,
          turma: novas[0].turma,
        });
        clearTimeout(fechar.current);
        fechar.current = setTimeout(() => setAviso(null), VISIVEL_MS);
      } catch {
      } finally {
        ocupado.current = false;
      }
    }

    verificar();
    const intervalo = setInterval(verificar, INTERVALO_MS);
    return () => {
      ativo = false;
      clearInterval(intervalo);
      clearTimeout(fechar.current);
    };
  }, []);

  if (!aviso) return null;

  const varias = aviso.quantidade > 1;
  const titulo = varias
    ? `${aviso.quantidade} correções concluídas`
    : "Correção concluída";
  const detalhe = [aviso.atividade, aviso.turma].filter(Boolean).join(" · ");

  return (
    <View
      style={[
        styles.camada,
        ehDesktop ? styles.camadaDesktop : styles.camadaMobile,
      ]}
    >
      <Pressable
        style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}
        onPress={() => {
          setAviso(null);
          router.push("/correcoes");
        }}
      >
        <View style={styles.icone}>
          <Ionicons name="checkmark" size={18} color={COR.ok} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.titulo}>{titulo}</Text>
          {detalhe ? (
            <Text style={styles.detalhe} numberOfLines={1}>
              {detalhe}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={() => setAviso(null)} hitSlop={8}>
          <Ionicons name="close" size={16} color={COR.tintaFraca} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  camada: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    pointerEvents: "box-none",
  },
  camadaMobile: {
    top: Platform.OS === "web" ? 58 : 96,
    paddingHorizontal: 12,
  },
  camadaDesktop: {
    top: 16,
    paddingHorizontal: 16,
    alignItems: "flex-end",
  },
  cartao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.okFundo,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cartaoDesktop: { width: 340 },
  icone: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COR.okFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  textos: { flex: 1, minWidth: 0 },
  titulo: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  detalhe: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    marginTop: 2,
  },
});