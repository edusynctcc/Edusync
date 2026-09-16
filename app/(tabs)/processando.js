import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE } from "../../components/estilo";

const ETAPAS = [
  "Lendo o documento...",
  "Identificando o aluno...",
  "Comparando com o gabarito...",
  "Calculando a nota...",
];

export default function Processando() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const params = useLocalSearchParams();

  const atividadeTitulo = params.atividadeTitulo || "Atividade";
  const atividadeTurma = params.atividadeTurma || "";

  const [etapa, setEtapa] = useState("preview");
  const [progresso, setProgresso] = useState(0);
  const intervaloRef = useRef(null);

  const indiceEtapa = Math.min(
    ETAPAS.length - 1,
    Math.floor((progresso / 100) * ETAPAS.length),
  );

  function confirmarECorrigir() {
    setEtapa("processando");
  }

  useEffect(() => {
    if (etapa !== "processando") return;

    intervaloRef.current = setInterval(() => {
      setProgresso((atual) => {
        const proximo = atual + 4;
        if (proximo >= 100) {
          clearInterval(intervaloRef.current);
          return 100;
        }
        return proximo;
      });
    }, 120);

    return () => clearInterval(intervaloRef.current);
  }, [etapa]);

  useEffect(() => {
    if (progresso !== 100) return;
    const tempo = setTimeout(() => router.replace("/editar"), 500);
    return () => clearTimeout(tempo);
  }, [progresso]);

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <View style={styles.voltarLinha}>
                <Ionicons
                  name="scan-outline"
                  size={18}
                  color={COR.tintaForte}
                />
                <Text style={styles.tituloPaginaDesktop}>Enviar correção</Text>
              </View>
            </View>
          )}

          {etapa === "preview" ? (
            <View
              style={[
                styles.cardCentral,
                ehDesktop && styles.cardCentralDesktop,
              ]}
            >
              <View style={styles.previewCaixa}>
                <Ionicons
                  name="document-text-outline"
                  size={48}
                  color={COR.marcador}
                />
                <Text style={styles.previewCaixaTexto}>Folha capturada</Text>
              </View>

              <Text style={styles.atividadeTitulo}>{atividadeTitulo}</Text>
              {!!atividadeTurma && (
                <Text style={styles.atividadeTurma}>{atividadeTurma}</Text>
              )}

              <Text style={styles.previewDica}>
                Confira se a folha ficou legível antes de enviar pra correção.
              </Text>

              <View style={styles.botoesLinha}>
                <TouchableOpacity
                  style={styles.botaoSecundario}
                  activeOpacity={0.85}
                  onPress={() => router.back()}
                >
                  <Ionicons
                    name="camera-reverse-outline"
                    size={17}
                    color={COR.marcador}
                  />
                  <Text style={styles.botaoSecundarioTexto}>
                    Tirar novamente
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoPrimario}
                  activeOpacity={0.85}
                  onPress={confirmarECorrigir}
                >
                  <Text style={styles.botaoPrimarioTexto}>
                    Confirmar e corrigir
                  </Text>
                  <Ionicons name="arrow-forward" size={17} color={COR.branco} />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View
              style={[
                styles.cardCentral,
                ehDesktop && styles.cardCentralDesktop,
              ]}
            >
              <View style={styles.spinnerCirculo}>
                <Ionicons name="sparkles" size={30} color={COR.marcador} />
              </View>

              <Text style={styles.processandoTitulo}>
                Analisando atividade com IA
              </Text>
              <Text style={styles.processandoEtapa}>{ETAPAS[indiceEtapa]}</Text>

              <View style={styles.barraFundo}>
                <View
                  style={[styles.barraPreenchida, { width: `${progresso}%` }]}
                />
              </View>
              <Text style={styles.progressoTexto}>{progresso}%</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },

  conteudo: { flex: 1 },
  conteudoInterno: {
    padding: 20,
    paddingBottom: 60,
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
  },
  conteudoInternoDesktop: {
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 32,
  },
  miolo: { width: "92%", maxWidth: 560, alignSelf: "center" },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 56,
    marginBottom: 22,
  },
  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 20,
    color: COR.tintaForte,
  },

  cardCentral: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 24,
    alignItems: "center",
  },
  cardCentralDesktop: { padding: 40, borderRadius: 22 },

  previewCaixa: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 220,
    backgroundColor: COR.emAndamentoFundo,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  previewCaixaTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: COR.marcador,
  },

  atividadeTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  atividadeTurma: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
    marginTop: 3,
    textAlign: "center",
  },
  previewDica: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    textAlign: "center",
    marginTop: 14,
    marginBottom: 20,
    lineHeight: 17,
  },

  botoesLinha: { flexDirection: "row", gap: 10, width: "100%" },
  botaoSecundario: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoSecundarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.marcador,
  },
  botaoPrimario: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COR.marinho,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoPrimarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },

  spinnerCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  processandoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  processandoEtapa: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    marginTop: 6,
    marginBottom: 22,
    textAlign: "center",
  },
  barraFundo: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: COR.linhaSuave,
    overflow: "hidden",
  },
  barraPreenchida: {
    height: "100%",
    backgroundColor: COR.marcador,
    borderRadius: 4,
  },
  progressoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 8,
  },
});
