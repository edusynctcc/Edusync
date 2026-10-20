import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  excluirAtividade as excluirAtividadeApi,
  listarAtividades,
} from "../../constants/api";
import {
  semAcento,
  visualDaDisciplina,
} from "../../constants/disciplinas";
import { imprimirProvaDaAtividade } from "../../constants/provaPdf";






function formatarData(isoString) {
  if (!isoString) return { data: "", quando: "" };
  const data = new Date(isoString);
  const hoje = new Date();
  const diffMs =
    hoje.setHours(0, 0, 0, 0) - new Date(data).setHours(0, 0, 0, 0);
  const diffDias = Math.round(diffMs / 86400000);

  const dataFormatada = data.toLocaleDateString("pt-BR");
  let quando;
  if (diffDias <= 0) quando = "Hoje";
  else if (diffDias === 1) quando = "Ontem";
  else if (diffDias < 30) quando = `Há ${diffDias} dias`;
  else quando = "Há mais de um mês";

  return { data: dataFormatada, quando };
}

export default function Atividades() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const { atividadeTitulo } = useLocalSearchParams();
  const [busca, setBusca] = useState(
    atividadeTitulo ? String(atividadeTitulo) : "",
  );

  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [menuAtivo, setMenuAtivo] = useState(null);
  const [atividadeParaExcluir, setAtividadeParaExcluir] = useState(null);
  const [gerandoProva, setGerandoProva] = useState(false);

  async function salvarProvaEmPdf(atividade) {
    if (gerandoProva) return;

    setGerandoProva(true);
    setErro("");

    try {
      const problema = await imprimirProvaDaAtividade(atividade);
      if (problema) setErro(problema);
      else setMenuAtivo(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setGerandoProva(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      async function carregar() {
        setCarregando(true);
        setErro("");
        try {
          const dados = await listarAtividades();
          const comVisual = dados.map((a) => {
            const visual = visualDaDisciplina(a.disciplina);
            const { data, quando } = formatarData(a.criado_em);
            return {
              ...a,
              id: a.id_atividade,
              titulo: a.nome,
              descricao: a.descricao || "",
              idTurma: a.id_turma,
              data,
              quando,
              ...visual,
            };
          });
          setAtividades(comVisual);
        } catch (e) {
          setErro(e.message);
        } finally {
          setCarregando(false);
        }
      }
      carregar();
    }, []),
  );

  function irParaEdicao(item) {
    setMenuAtivo(null);
    router.push({
      pathname: "/criar-atividade",
      params: {
        modo: "editar",
        id: item.id,
        tituloInicial: item.titulo,
        idTurmaInicial: item.idTurma,
      },
    });
  }

  async function confirmarExclusao() {
    try {
      await excluirAtividadeApi(atividadeParaExcluir.id);
      setAtividades((atuais) =>
        atuais.filter((a) => a.id !== atividadeParaExcluir.id),
      );
      setAtividadeParaExcluir(null);
    } catch (e) {
      setErro(e.message);
      setAtividadeParaExcluir(null);
    }
  }

  const procurado = semAcento(busca);

  const atividadesFiltradas = atividades.filter((item) =>
    semAcento(item.titulo).includes(procurado),
  );

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          !ehDesktop && { paddingBottom: 100 },
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Atividades</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.buscaLinha}>
            <View
              style={[styles.buscaBox, ehDesktop && styles.buscaBoxDesktop]}
            >
              <Ionicons name="search" size={16} color={COR.tintaFraca} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar atividade..."
                placeholderTextColor={COR.tintaFraca}
                style={[
                  styles.buscaInput,
                  ehDesktop && styles.buscaInputDesktop,
                ]}
              />
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca("")} hitSlop={8}>
                  <Ionicons
                    name="close-circle"
                    size={16}
                    color={COR.tintaFraca}
                  />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={styles.botaoCriarAtividade}
              activeOpacity={0.85}
              onPress={() => router.push("/criar-atividade")}
            >
              <Ionicons name="add" size={18} color={COR.branco} />
              <Text style={styles.botaoCriarAtividadeTexto}>
                Criar atividade
              </Text>
            </TouchableOpacity>
          </View>

          {erro ? (
            <Text style={{ color: "red", marginBottom: 10 }}>{erro}</Text>
          ) : null}
          {carregando ? (
            <Text style={{ color: COR.tintaFraca, marginBottom: 10 }}>
              Carregando...
            </Text>
          ) : null}

          <View style={[styles.lista, ehDesktop && styles.listaDesktop]}>
            {
                                                                }
            {atividadesFiltradas.map((item) => (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.85}
                onPress={() =>
                  router.push({
                    pathname: "/atividade",
                    params: { id: item.id },
                  })
                }
                style={[
                  styles.atividadeCard,
                  ehDesktop && styles.atividadeCardDesktop,
                ]}
              >
                <View
                  style={[
                    styles.atividadeLinhaTopo,
                    ehDesktop && styles.atividadeLinhaTopoDesktop,
                  ]}
                >
                  <View
                    style={[
                      styles.atividadeIconeCirculo,
                      ehDesktop && styles.atividadeIconeCirculoDesktop,
                      { backgroundColor: item.corFundo },
                    ]}
                  >
                    {item.biblioteca === "mci" ? (
                      <MaterialCommunityIcons
                        name={item.icone}
                        size={ehDesktop ? 24 : 20}
                        color={item.corIcone}
                      />
                    ) : (
                      <Ionicons
                        name={item.icone}
                        size={ehDesktop ? 24 : 20}
                        color={item.corIcone}
                      />
                    )}
                  </View>

                  <View style={styles.atividadeTextos}>
                    <Text
                      style={[
                        styles.atividadeTitulo,
                        ehDesktop && styles.atividadeTituloDesktop,
                      ]}
                      numberOfLines={1}
                    >
                      {item.titulo}
                    </Text>
                    <Text
                      style={[
                        styles.atividadeDescricao,
                        ehDesktop && styles.atividadeDescricaoDesktop,
                      ]}
                      numberOfLines={1}
                    >
                      {item.descricao}
                    </Text>
                    {
                                                  }
                    <Text
                      style={[
                        styles.atividadeData,
                        ehDesktop && styles.atividadeDataDesktop,
                      ]}
                      numberOfLines={1}
                    >
                      {item.data} · {item.quando}
                    </Text>
                  </View>

                  {
                                                                       }
                  <Ionicons
                    name="chevron-forward"
                    size={ehDesktop ? 20 : 18}
                    color={COR.tintaFraca}
                  />
                </View>
              </TouchableOpacity>
            ))}

            {!carregando && atividadesFiltradas.length === 0 && (
              <View style={styles.vazioBox}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={COR.tintaFraca}
                />
                <Text
                  style={[
                    styles.vazioTexto,
                    ehDesktop && styles.vazioTextoDesktop,
                  ]}
                >
                  Nenhuma atividade encontrada.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={!!menuAtivo}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAtivo(null)}
      >
        <Pressable style={styles.modalFundo} onPress={() => setMenuAtivo(null)}>
          <Pressable
            style={[styles.menuCartao, ehDesktop && styles.menuCartaoDesktop]}
            onPress={() => {}}
          >
            <Text style={styles.menuTituloAtividade} numberOfLines={1}>
              {menuAtivo?.titulo}
            </Text>

            <TouchableOpacity
              style={[styles.menuOpcao, ehDesktop && styles.menuOpcaoDesktop]}
              activeOpacity={0.7}
              onPress={() => irParaEdicao(menuAtivo)}
            >
              <Ionicons name="pencil-outline" size={17} color={COR.marcador} />
              <Text
                style={[
                  styles.menuOpcaoTexto,
                  ehDesktop && styles.menuOpcaoTextoDesktop,
                ]}
              >
                Editar atividade
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOpcao, ehDesktop && styles.menuOpcaoDesktop]}
              activeOpacity={0.7}
              disabled={gerandoProva}
              onPress={() => salvarProvaEmPdf(menuAtivo)}
            >
              <Ionicons name="print-outline" size={17} color={COR.marcador} />
              <Text
                style={[
                  styles.menuOpcaoTexto,
                  ehDesktop && styles.menuOpcaoTextoDesktop,
                ]}
              >
                {gerandoProva ? "Gerando prova..." : "Salvar prova em PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.menuOpcao, ehDesktop && styles.menuOpcaoDesktop]}
              activeOpacity={0.7}
              onPress={() => {
                setAtividadeParaExcluir(menuAtivo);
                setMenuAtivo(null);
              }}
            >
              <Ionicons name="trash-outline" size={17} color={COR.perigo} />
              <Text
                style={[
                  styles.menuOpcaoTexto,
                  ehDesktop && styles.menuOpcaoTextoDesktop,
                  { color: COR.perigo },
                ]}
              >
                Excluir atividade
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={!!atividadeParaExcluir}
        transparent
        animationType="fade"
        onRequestClose={() => setAtividadeParaExcluir(null)}
      >
        <View style={styles.modalFundo}>
          <View
            style={[styles.modalCard, ehDesktop && styles.modalCardDesktop]}
          >
            <View style={styles.modalIconeCirculo}>
              <Ionicons name="trash-outline" size={22} color={COR.perigo} />
            </View>
            <Text
              style={[
                styles.modalTitulo,
                ehDesktop && styles.modalTituloDesktop,
              ]}
            >
              Excluir esta atividade?
            </Text>
            <Text
              style={[styles.modalTexto, ehDesktop && styles.modalTextoDesktop]}
            >
              &quot;{atividadeParaExcluir?.titulo}&quot; será removida e essa
              ação não pode ser desfeita.
            </Text>
            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                activeOpacity={0.8}
                onPress={() => setAtividadeParaExcluir(null)}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBotaoExcluir}
                activeOpacity={0.8}
                onPress={confirmarExclusao}
              >
                <Text style={styles.modalBotaoExcluirTexto}>Excluir</Text>
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
  conteudoInternoDesktop: { alignItems: "center" },
  miolo: { width: "92%", maxWidth: 1100 },

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
    fontSize: 24,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  buscaLinha: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 16,
  },
  buscaBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COR.branco,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linha,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buscaInput: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    padding: 0,
  },
  botaoCriarAtividade: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COR.marinho,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoCriarAtividadeTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },

  buscaBoxDesktop: { paddingHorizontal: 14, paddingVertical: 13 },
  buscaInputDesktop: { fontSize: 14.5 },

  listaDesktop: { gap: 12 },
  atividadeCardDesktop: { padding: 20 },
  atividadeLinhaTopoDesktop: { gap: 16 },
  atividadeIconeCirculoDesktop: { width: 52, height: 52, borderRadius: 12 },
  atividadeTituloDesktop: { fontSize: 15.5 },
  atividadeDescricaoDesktop: { fontSize: 13, marginTop: 3 },
  atividadeDataDesktop: { fontSize: 12 },
  vazioTextoDesktop: { fontSize: 14.5 },

  menuCartaoDesktop: { maxWidth: 360, padding: 10 },
  menuOpcaoDesktop: { paddingVertical: 14, paddingHorizontal: 12 },
  menuOpcaoTextoDesktop: { fontSize: 15.5 },
  modalCardDesktop: { maxWidth: 400, padding: 26 },
  modalTituloDesktop: { fontSize: 18 },
  modalTextoDesktop: { fontSize: 14, lineHeight: 20 },

  lista: { width: "100%", gap: 10, marginBottom: 20 },
  vazioBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    width: "100%",
  },
  vazioTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaFraca,
  },
  atividadeCard: {
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 14,
  },
  atividadeLinhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  atividadeIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  atividadeTextos: { flex: 1, minWidth: 0 },
  atividadeTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  atividadeDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 2,
  },
  atividadeData: {
    fontFamily: FONTE.regular,
    fontSize: 10,
    color: COR.tintaFraca,
  },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  menuCartao: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: COR.branco,
    borderRadius: 14,
    padding: 8,
  },
  menuTituloAtividade: {
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    fontWeight: "700",
    color: COR.tintaFraca,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  menuOpcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: RAIO.controle,
  },
  menuOpcaoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 14,
    fontWeight: "600",
    color: COR.tintaForte,
  },

  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: COR.branco,
    borderRadius: 14,
    padding: 22,
    alignItems: "center",
  },
  modalIconeCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 15.5,
    fontWeight: "700",
    color: COR.tintaForte,
    marginBottom: 6,
    textAlign: "center",
  },
  modalTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  modalAcoes: { flexDirection: "row", gap: 10, width: "100%" },
  modalBotaoCancelar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    borderColor: COR.linha,
  },
  modalBotaoCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.tintaMedia,
  },
  modalBotaoExcluir: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    backgroundColor: COR.perigoFundo,
  },
  modalBotaoExcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.branco,
  },
});