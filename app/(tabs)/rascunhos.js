import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import { listarTurmas } from "../../constants/api";
import {
  apagarRascunho,
  lerRascunhos,
  quandoFoi,
  resumoDoRascunho,
  tituloDoRascunho,
} from "../../constants/rascunhos";

export default function Rascunhos() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

  const [rascunhos, setRascunhos] = useState([]);
  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [paraApagar, setParaApagar] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      (async () => {
        const lista = await lerRascunhos();
        if (!ativo) return;

        setRascunhos(lista);
        setCarregando(false);

        // A turma é guardada no rascunho só pelo id. O nome vem daqui, e se
        // a busca falhar o cartão simplesmente não mostra a turma.
        try {
          const dados = await listarTurmas();
          if (ativo) setTurmas(dados || []);
        } catch {
          if (ativo) setTurmas([]);
        }
      })();

      return () => {
        ativo = false;
      };
    }, []),
  );

  function nomeDaTurma(id_turma) {
    if (!id_turma) return "";
    const achou = turmas.find((t) => t.id_turma === id_turma);
    return achou ? achou.nome : "";
  }

  function abrir(r) {
    router.push({
      pathname: "/criar-atividade",
      params: { rascunho: r.id },
    });
  }

  async function confirmarApagar() {
    if (!paraApagar) return;

    await apagarRascunho(paraApagar.id);
    setRascunhos(await lerRascunhos());
    setParaApagar(null);
  }

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 100 },
        ]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          <TouchableOpacity
            style={styles.voltarLinha}
            activeOpacity={0.7}
            onPress={() => router.navigate("/atividades")}
          >
            <Ionicons name="arrow-back" size={21} color={COR.tintaForte} />
            <Text
              style={[
                styles.tituloPagina,
                ehDesktop && styles.tituloPaginaDesktop,
              ]}
            >
              Rascunhos
            </Text>
          </TouchableOpacity>

          <Text style={styles.explicacao}>
            Atividades que você começou e ainda não publicou. Ficam guardadas
            só neste aparelho, e somem sozinhas quando a atividade é
            publicada.
          </Text>

          {carregando ? (
            <View style={styles.centro}>
              <ActivityIndicator color={COR.marcador} />
            </View>
          ) : rascunhos.length === 0 ? (
            <View style={styles.vazioBox}>
              <Ionicons
                name="document-text-outline"
                size={30}
                color={COR.tintaFraca}
              />
              <Text style={styles.vazioTexto}>
                Nenhum rascunho por aqui.
              </Text>
              <Text style={styles.vazioApoio}>
                Quando você começar uma atividade e sair sem publicar, ela
                aparece nesta tela.
              </Text>

              <TouchableOpacity
                style={styles.botaoCriar}
                activeOpacity={0.85}
                onPress={() => router.push("/criar-atividade")}
              >
                <Ionicons name="add" size={19} color={COR.branco} />
                <Text style={styles.botaoCriarTexto}>Criar atividade</Text>
              </TouchableOpacity>
            </View>
          ) : (
            rascunhos.map((r) => (
              <View key={r.id} style={styles.cartao}>
                <TouchableOpacity
                  style={styles.cartaoMeio}
                  activeOpacity={0.7}
                  onPress={() => abrir(r)}
                >
                  <View style={styles.icone}>
                    <Ionicons
                      name="document-text-outline"
                      size={19}
                      color={COR.tintaFraca}
                    />
                  </View>

                  <View style={styles.cartaoTexto}>
                    <Text style={styles.nome} numberOfLines={2}>
                      {tituloDoRascunho(r)}
                    </Text>
                    <Text style={styles.apoio} numberOfLines={2}>
                      {resumoDoRascunho(r)} · {quandoFoi(r.quando)}
                      {nomeDaTurma(r.id_turma)
                        ? ` · ${nomeDaTurma(r.id_turma)}`
                        : ""}
                      {r.imagensPerdidas || r.tinhaImagem
                        ? " · sem as imagens"
                        : ""}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setParaApagar(r)}
                  hitSlop={10}
                  style={styles.lixeira}
                  accessibilityLabel={`Descartar o rascunho ${tituloDoRascunho(r)}`}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={COR.tintaFraca}
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!paraApagar}
        transparent
        animationType="fade"
        onRequestClose={() => setParaApagar(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCartao}>
            <View style={styles.modalIcone}>
              <Ionicons name="trash-outline" size={21} color={COR.perigo} />
            </View>

            <Text style={styles.modalTitulo}>Descartar este rascunho?</Text>
            <Text style={styles.modalTexto}>
              {paraApagar ? `"${tituloDoRascunho(paraApagar)}"` : ""} se perde
              para sempre. Não dá para desfazer.
            </Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalCancelar}
                onPress={() => setParaApagar(null)}
              >
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApagar}
                onPress={confirmarApagar}
              >
                <Text style={styles.modalApagarTexto}>Descartar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },
  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 40, alignItems: "center" },
  miolo: { width: "92%", maxWidth: 1100 },
  centro: { paddingVertical: 50, alignItems: "center" },

  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
  },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 21,
    color: COR.tintaForte,
  },
  tituloPaginaDesktop: { fontSize: 25 },

  explicacao: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COR.tintaFraca,
    marginTop: 4,
    marginBottom: 18,
    maxWidth: 560,
  },

  cartao: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COR.branco,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderRadius: RAIO.superficie,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  cartaoMeio: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  icone: {
    width: 42,
    height: 42,
    borderRadius: RAIO.controle,
    backgroundColor: COR.campo,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    alignItems: "center",
    justifyContent: "center",
  },
  cartaoTexto: { flex: 1, minWidth: 0 },
  nome: {
    fontFamily: FONTE.bold,
    fontSize: 14.5,
    color: COR.tintaForte,
  },
  apoio: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    lineHeight: 17,
    color: COR.tintaFraca,
    marginTop: 3,
  },
  lixeira: { padding: 4 },

  vazioBox: {
    width: "100%",
    alignItems: "center",
    gap: 9,
    paddingVertical: 44,
  },
  vazioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    color: COR.tintaMedia,
  },
  vazioApoio: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COR.tintaFraca,
    textAlign: "center",
    maxWidth: 320,
  },
  botaoCriar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginTop: 8,
  },
  botaoCriarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    color: COR.branco,
  },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
  },
  modalCartao: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    padding: 22,
  },
  modalIcone: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 12,
  },
  modalTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  modalTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    lineHeight: 19,
    color: COR.tintaMedia,
    textAlign: "center",
    marginTop: 8,
  },
  modalBotoes: { flexDirection: "row", gap: 10, marginTop: 18 },
  modalCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    borderColor: COR.linha,
  },
  modalCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.tintaMedia,
  },
  modalApagar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    backgroundColor: COR.perigo,
  },
  modalApagarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },
});
