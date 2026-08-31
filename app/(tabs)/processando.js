import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

const ETAPAS_PROCESSAMENTO = [
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

  const [etapa, setEtapa] = useState("preview"); // "preview" | "processando"
  const [progresso, setProgresso] = useState(0);
  const intervaloRef = useRef(null);

  const indiceEtapaTexto = Math.min(
    ETAPAS_PROCESSAMENTO.length - 1,
    Math.floor((progresso / 100) * ETAPAS_PROCESSAMENTO.length)
  );

  // Sai do preview e começa o processamento (hoje só uma animação).
  //
  // -------------------------------------------------------------------------
  // API — POST /correcoes  (é a chamada mais importante do app)
  //
  // Manda a foto da folha; o back-end roda o OCR, passa o resultado pro
  // agente de IA e grava a correção com as notas de cada questão.
  //
  //   async function confirmarECorrigir() {
  //     setEtapa("processando");
  //
  //     const formulario = new FormData();
  //     formulario.append("imagem", {
  //       uri: imagemUri,              // veio do Scanner, via params
  //       name: "folha.jpg",
  //       type: "image/jpeg",
  //     });
  //     formulario.append("id_atividade", id_atividade);
  //
  //     try {
  //       const resposta = await fetch("http://localhost:3000/correcoes", {
  //         method: "POST",
  //         headers: { Authorization: `Bearer ${token}` },
  //         // repare: NÃO defina Content-Type aqui — o fetch monta sozinho
  //         // o boundary do multipart, e se você escrever na mão ele quebra
  //         body: formulario,
  //       });
  //
  //       const correcao = await resposta.json();
  //       router.replace({ pathname: "/editar", params: { id: correcao.id_correcao } });
  //     } catch (e) {
  //       // avisar o professor e deixar tentar de novo
  //     }
  //   }
  //
  // OCR + IA levam alguns segundos, então a barra de progresso deixa de ser
  // decorativa: ela passa a esperar essa resposta chegar.
  // -------------------------------------------------------------------------
  function confirmarECorrigir() {
    setEtapa("processando");
  }

  function tirarNovamente() {
    router.back();
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
    if (progresso === 100) {
      const tempo = setTimeout(() => router.replace("/editar"), 500);
      return () => clearTimeout(tempo);
    }
  }, [progresso]);

  return (
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
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
                <Ionicons name="scan-outline" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>Enviar correção</Text>
              </View>
            </View>
          )}

          {etapa === "preview" ? (
            <View style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}>
              <View style={styles.previewCaixa}>
                <Ionicons name="document-text-outline" size={48} color="#3B82F6" />
                <Text style={styles.previewCaixaTexto}>Folha capturada</Text>
              </View>

              <Text style={styles.atividadeTitulo}>{atividadeTitulo}</Text>
              {!!atividadeTurma && <Text style={styles.atividadeTurma}>{atividadeTurma}</Text>}

              <Text style={styles.previewDica}>
                Confira se a folha ficou legível antes de enviar pra correção.
              </Text>

              <View style={styles.botoesLinha}>
                <TouchableOpacity style={styles.botaoSecundario} onPress={tirarNovamente}>
                  <Ionicons name="camera-reverse-outline" size={17} color="#3B82F6" />
                  <Text style={styles.botaoSecundarioTexto}>Tirar novamente</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.botaoPrimario} onPress={confirmarECorrigir}>
                  <Text style={styles.botaoPrimarioTexto}>Confirmar e corrigir</Text>
                  <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={[styles.cardCentral, ehDesktop && styles.cardCentralDesktop]}>
              <View style={styles.spinnerCirculo}>
                <Ionicons name="sparkles" size={30} color="#3B82F6" />
              </View>

              <Text style={styles.processandoTitulo}>Analisando atividade com IA</Text>
              <Text style={styles.processandoEtapa}>
                {ETAPAS_PROCESSAMENTO[indiceEtapaTexto]}
              </Text>

              <View style={styles.barraFundo}>
                <View style={[styles.barraPreenchida, { width: `${progresso}%` }]} />
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
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 60, alignItems: "center", justifyContent: "center", flexGrow: 1 },
  conteudoInternoDesktop: { alignItems: "center", justifyContent: "flex-start", paddingTop: 32 },
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
  tituloPaginaDesktop: { fontSize: 20, fontWeight: "700", color: "#0B1E3D" },
  toolbarDesktop: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarPequenoClaro: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPequenoClaroTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  usuarioNomeClaro: { fontSize: 13, fontWeight: "600", color: "#0B1E3D" },

  cardCentral: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 24,
    alignItems: "center",
  },
  cardCentralDesktop: { padding: 40, borderRadius: 22 },

  previewCaixa: {
    width: "100%",
    aspectRatio: 4 / 3,
    maxHeight: 220,
    backgroundColor: "#EAF1FE",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 18,
  },
  previewCaixaTexto: { fontSize: 12.5, fontWeight: "600", color: "#3B82F6" },

  atividadeTitulo: { fontSize: 16, fontWeight: "700", color: "#0B1E3D", textAlign: "center" },
  atividadeTurma: { fontSize: 12.5, color: "#94A3B8", marginTop: 3, textAlign: "center" },
  previewDica: {
    fontSize: 12,
    color: "#64748B",
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
    borderColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoSecundarioTexto: { fontSize: 13, fontWeight: "700", color: "#3B82F6" },
  botaoPrimario: {
    flex: 1.3,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoPrimarioTexto: { fontSize: 13, fontWeight: "700", color: "#FFFFFF" },

  spinnerCirculo: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EAF1FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  processandoTitulo: { fontSize: 16, fontWeight: "700", color: "#0B1E3D", textAlign: "center" },
  processandoEtapa: {
    fontSize: 12.5,
    color: "#64748B",
    marginTop: 6,
    marginBottom: 22,
    textAlign: "center",
  },
  barraFundo: {
    width: "100%",
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EDF1F7",
    overflow: "hidden",
  },
  barraPreenchida: { height: "100%", backgroundColor: "#3B82F6", borderRadius: 4 },
  progressoTexto: { fontSize: 11.5, color: "#94A3B8", marginTop: 8, fontWeight: "600" },
});