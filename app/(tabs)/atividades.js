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
  View
} from "react-native";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import { excluirAtividade as excluirAtividadeApi, listarAtividades } from "../../constants/api";

const FILTROS = ["Todas", "Em aberto", "Concluídas"];

// Ícones e cores só existem no front — o back não manda isso, então
// escolhemos ciclicamente com base no índice da atividade na lista.
const ICONES = [
  { icone: "function-variant", biblioteca: "mci", corFundo: COR.emAndamentoFundo, corIcone: COR.marcador },
  { icone: "format-list-bulleted", biblioteca: "mci", corFundo: COR.emAndamentoFundo, corIcone: COR.marcador },
  { icone: "shape-outline", biblioteca: "mci", corFundo: COR.avisoFundo, corIcone: COR.avisoTexto },
  { icone: "school-outline", biblioteca: "ion", corFundo: COR.avisoFundo, corIcone: COR.marcador },
  { icone: "chart-line", biblioteca: "mci", corFundo: COR.okFundo, corIcone: COR.ok },
];

function formatarData(isoString) {
  if (!isoString) return { data: "", quando: "" };
  const data = new Date(isoString);
  const hoje = new Date();
  const diffMs = hoje.setHours(0, 0, 0, 0) - new Date(data).setHours(0, 0, 0, 0);
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
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  const { atividadeTitulo } = useLocalSearchParams();
  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState(
    atividadeTitulo ? String(atividadeTitulo) : "",
  );

  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [menuAtivo, setMenuAtivo] = useState(null);
  const [atividadeParaExcluir, setAtividadeParaExcluir] = useState(null);

    useFocusEffect(
    useCallback(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const dados = await listarAtividades();
        const comVisual = dados.map((a, i) => {
          const visual = ICONES[i % ICONES.length];
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
   }, [])
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

  function combinaComFiltro(item, filtro) {
    if (filtro === "Todas") return true;
    if (filtro === "Em aberto") return item.status !== "concluida";
    if (filtro === "Concluídas") return item.status === "concluida";
    return true;
  }

  async function confirmarExclusao() {
    try {
      await excluirAtividadeApi(atividadeParaExcluir.id);
      setAtividades((atuais) => atuais.filter((a) => a.id !== atividadeParaExcluir.id));
      setAtividadeParaExcluir(null);
    } catch (e) {
      setErro(e.message);
      setAtividadeParaExcluir(null);
    }
  }

  const atividadesFiltradas = atividades.filter(
    (item) =>
      combinaComFiltro(item, filtroAtivo) &&
      item.titulo.toLowerCase().includes(busca.toLowerCase()),
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
        <View
          style={[
            ehDesktop ? styles.miolo : { width: "100%" },
            ehTelaLarga && { maxWidth: 1300 },
          ]}
        >
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
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color={COR.tintaFraca} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar atividade..."
                placeholderTextColor={COR.tintaFraca}
                style={styles.buscaInput}
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
          </View>

          <View style={styles.filtrosLinha}>
            {FILTROS.map((filtro) => {
              const ativo = filtro === filtroAtivo;
              return (
                <TouchableOpacity
                  key={filtro}
                  onPress={() => setFiltroAtivo(filtro)}
                  style={[styles.filtroPill, ativo && styles.filtroPillAtivo]}
                >
                  <Text
                    style={[
                      styles.filtroTexto,
                      ativo && styles.filtroTextoAtivo,
                    ]}
                  >
                    {filtro}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {erro ? <Text style={{ color: "red", marginBottom: 10 }}>{erro}</Text> : null}
          {carregando ? (
            <Text style={{ color: COR.tintaFraca, marginBottom: 10 }}>Carregando...</Text>
          ) : null}

          <View style={styles.lista}>
            {atividadesFiltradas.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.atividadeCard,
                  !ehDesktop && styles.atividadeCardMobile,
                ]}
              >
                <View style={styles.atividadeLinhaTopo}>
                  <View
                    style={[
                      styles.atividadeIconeCirculo,
                      { backgroundColor: item.corFundo },
                    ]}
                  >
                    {item.biblioteca === "mci" ? (
                      <MaterialCommunityIcons
                        name={item.icone}
                        size={20}
                        color={item.corIcone}
                      />
                    ) : (
                      <Ionicons
                        name={item.icone}
                        size={20}
                        color={item.corIcone}
                      />
                    )}
                  </View>

                  <View style={styles.atividadeTextos}>
                    <Text style={styles.atividadeTitulo} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.atividadeDescricao} numberOfLines={1}>
                      {item.descricao}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.botaoMenu}
                    activeOpacity={0.7}
                    hitSlop={8}
                    onPress={() => setMenuAtivo(item)}
                  >
                    <Ionicons
                      name="ellipsis-vertical"
                      size={16}
                      color={COR.tintaFraca}
                    />
                  </TouchableOpacity>

                  {ehDesktop && (
                    <View style={styles.atividadeAcao}>
                      <TouchableOpacity
                        style={styles.botaoVer}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: "/correcoes",
                            params: { atividadeTitulo: item.titulo },
                          })
                        }
                      >
                        <Text style={styles.botaoVerTexto}>Ver atividade</Text>
                      </TouchableOpacity>
                      <Text style={styles.atividadeData}>
                        {item.data} · {item.quando}
                      </Text>
                    </View>
                  )}
                </View>

                {!ehDesktop && (
                  <View style={styles.atividadeLinhaBaixoMobile}>
                    <Text style={styles.atividadeData}>
                      {item.data} · {item.quando}
                    </Text>
                    <TouchableOpacity
                      style={styles.botaoVer}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/correcoes",
                          params: { atividadeTitulo: item.titulo },
                        })
                      }
                    >
                      <Text style={styles.botaoVerTexto}>Ver atividade</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}

            {!carregando && atividadesFiltradas.length === 0 && (
              <Text style={{ color: COR.tintaFraca, textAlign: "center", marginTop: 20 }}>
                Nenhuma atividade encontrada.
              </Text>
            )}
          </View>
        </View>
      </ScrollView>

      <BotaoFlutuante
        onPress={() => router.push("/criar-atividade")}
        style={
          ehDesktop ? { bottom: 32, right: 32 } : { bottom: 74, right: 14 }
        }
      />

      <Modal
        visible={!!menuAtivo}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAtivo(null)}
      >
        <Pressable style={styles.modalFundo} onPress={() => setMenuAtivo(null)}>
          <Pressable style={styles.menuCartao} onPress={() => {}}>
            <Text style={styles.menuTituloAtividade} numberOfLines={1}>
              {menuAtivo?.titulo}
            </Text>

            <TouchableOpacity
              style={styles.menuOpcao}
              activeOpacity={0.7}
              onPress={() => irParaEdicao(menuAtivo)}
            >
              <Ionicons name="pencil-outline" size={17} color={COR.marcador} />
              <Text style={styles.menuOpcaoTexto}>Editar atividade</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOpcao}
              activeOpacity={0.7}
              onPress={() => {
                setAtividadeParaExcluir(menuAtivo);
                setMenuAtivo(null);
              }}
            >
              <Ionicons name="trash-outline" size={17} color={COR.perigo} />
              <Text style={[styles.menuOpcaoTexto, { color: COR.perigo }]}>
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
          <View style={styles.modalCard}>
            <View style={styles.modalIconeCirculo}>
              <Ionicons name="trash-outline" size={22} color={COR.perigo} />
            </View>
            <Text style={styles.modalTitulo}>Excluir esta atividade?</Text>
            <Text style={styles.modalTexto}>
              "{atividadeParaExcluir?.titulo}" será removida e essa ação não
              pode ser desfeita.
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
    fontSize: 20,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  buscaLinha: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 14,
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

  filtrosLinha: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 16,
  },
  filtroPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COR.linhaSuave,
  },
  filtroPillAtivo: { backgroundColor: COR.marinho },
  filtroTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
  },
  filtroTextoAtivo: { color: COR.branco },

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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 14,
  },
  atividadeCardMobile: { gap: 10 },
  atividadeLinhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  atividadeLinhaBaixoMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  atividadeIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
  atividadeAcao: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  botaoVer: {
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  botaoVerTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    fontWeight: "700",
  },
  atividadeData: {
    fontFamily: FONTE.regular,
    fontSize: 10,
    color: COR.tintaFraca,
  },
  botaoMenu: {
    width: 28,
    height: 28,
    borderRadius: RAIO.superficie,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
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
    borderRadius: 16,
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
    borderRadius: RAIO.superficie,
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
  modalBotaoExcluirTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.branco },
});
