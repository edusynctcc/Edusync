import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE } from "../../components/estilo";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { listarTurmas, criarTurma, atualizarTurma, excluirTurma as excluirTurmaApi } from "../../constants/api";

const CORES_TURMA = ["#2E6FB0", "#8B5EA6", "#DDA015", "#2F7D5C", "#B4443A"];

// "9º Ano A" -> "9A".  Se o nome não tiver número, cai nas iniciais das
// duas primeiras palavras.
function iniciais(nome) {
  const texto = String(nome).trim();
  const numero = (texto.match(/\d+/) || [""])[0];
  const letra = (texto.match(/([A-Za-zÀ-ÿ])\s*$/) || ["", ""])[1].toUpperCase();
  if (numero && letra) return numero + letra;

  const palavras = texto.split(/\s+/).filter(Boolean);
  return palavras.slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
}

function turmaVazia() {
  return { id: null, nome: "", escola: "" };
}

export default function Turmas() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const { turmaBusca } = useLocalSearchParams();

  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState(turmaBusca ? String(turmaBusca) : "");
  const [modalAberto, setModalAberto] = useState(false);
  const [turmaEmEdicao, setTurmaEmEdicao] = useState(turmaVazia());

  const editando = turmaEmEdicao.id !== null;

  useEffect(() => {
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const dados = await listarTurmas();
        const comCor = dados.map((t, i) => ({
          ...t,
          id: t.id_turma,
          cor: CORES_TURMA[i % CORES_TURMA.length],
          alunos: t.alunos ?? 0,
          atividades: t.atividades ?? 0,
        }));
        setTurmas(comCor);
      } catch (e) {
        setErro(e.message);
      } finally {
        setCarregando(false);
      }
    }
    carregar();
  }, []);

  const turmasFiltradas = turmas.filter((t) =>
    `${t.nome} ${t.escola}`.toLowerCase().includes(busca.toLowerCase())
  );

  function abrirCriar() {
    setTurmaEmEdicao(turmaVazia());
    setModalAberto(true);
  }

  function abrirEditar(turma) {
    setTurmaEmEdicao(turma);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  async function salvarTurma() {
    if (!turmaEmEdicao.nome.trim()) return;

    try {
      if (editando) {
        const atualizada = await atualizarTurma(turmaEmEdicao.id, turmaEmEdicao.nome, turmaEmEdicao.escola);
        setTurmas((atuais) =>
          atuais.map((t) => (t.id === turmaEmEdicao.id ? { ...t, ...atualizada, id: t.id, cor: t.cor } : t))
        );
      } else {
        const nova = await criarTurma(turmaEmEdicao.nome, turmaEmEdicao.escola);
        setTurmas((atuais) => [
          { ...nova, id: nova.id_turma, alunos: 0, atividades: 0, cor: CORES_TURMA[atuais.length % CORES_TURMA.length] },
          ...atuais,
        ]);
      }
      setModalAberto(false);
    } catch (e) {
      setErro(e.message);
    }
  }

  async function excluirTurma() {
    try {
      await excluirTurmaApi(turmaEmEdicao.id);
      setTurmas((atuais) => atuais.filter((t) => t.id !== turmaEmEdicao.id));
      setModalAberto(false);
    } catch (e) {
      setErro(e.message);
    }
  }

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
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Turmas</Text>
              </TouchableOpacity>
            </View>
          )}

          {!ehDesktop && <Text style={styles.tituloPagina}>Turmas</Text>}

          <View style={styles.buscaLinha}>
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color={COR.tintaFraca} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar turma ou escola..."
                placeholderTextColor={COR.tintaFraca}
                style={styles.buscaInput}
              />
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={COR.tintaFraca} />
                </TouchableOpacity>
              )}
            </View>

            {ehDesktop && (
              <TouchableOpacity style={styles.botaoNovaTurmaDesktop} onPress={abrirCriar}>
                <Ionicons name="add" size={18} color={COR.branco} />
                <Text style={styles.botaoNovaTurmaDesktopTexto}>Nova turma</Text>
              </TouchableOpacity>
            )}
          </View>

          {erro ? <Text style={{ color: "red", marginBottom: 10 }}>{erro}</Text> : null}
          {carregando ? <Text style={{ color: COR.tintaFraca, marginBottom: 10 }}>Carregando...</Text> : null}

          <View style={styles.lista}>
            {turmasFiltradas.map((turma) => (
              <TouchableOpacity
                key={turma.id}
                style={[styles.turmaCard, { borderLeftColor: turma.cor }]}
                activeOpacity={0.85}
                onPress={() => abrirEditar(turma)}
              >
                <View style={[styles.turmaSigla, { backgroundColor: turma.cor }]}>
                  <Text style={styles.turmaSiglaTexto}>{iniciais(turma.nome)}</Text>
                </View>

                <View style={styles.turmaTextos}>
                  <Text style={styles.turmaNome} numberOfLines={1}>
                    {turma.nome}
                  </Text>
                  <Text style={styles.turmaDetalhe} numberOfLines={1}>
                    {turma.escola}
                  </Text>
                  <Text style={styles.turmaMeta} numberOfLines={1}>
                    <Text style={styles.turmaMetaForte}>{turma.alunos}</Text> alunos ·{" "}
                    <Text style={styles.turmaMetaForte}>{turma.atividades}</Text>{" "}
                    {turma.atividades === 1 ? "atividade" : "atividades"}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color={COR.tintaFraca} />
              </TouchableOpacity>
            ))}

            {turmasFiltradas.length === 0 && (
              <View style={styles.vazioBox}>
                <Ionicons name="people-outline" size={28} color={COR.tintaFraca} />
                <Text style={styles.vazioTexto}>Nenhuma turma encontrada.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {!ehDesktop && (
        <BotaoFlutuante onPress={abrirCriar} style={{ bottom: 74, right: 14 }} />
      )}

      <Modal visible={modalAberto} transparent animationType="slide" onRequestClose={fecharModal}>
        <View style={[styles.modalFundo, !ehDesktop && styles.modalFundoMobile]}>
          <View style={[styles.modalCard, !ehDesktop && styles.modalCardMobile]}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>
                {editando ? "Editar turma" : "Criar turma"}
              </Text>
              <TouchableOpacity onPress={fecharModal}>
                <Ionicons name="close" size={22} color={COR.tintaMedia} />
              </TouchableOpacity>
            </View>

            <Text style={styles.rotulo}>
              Nome da turma <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={turmaEmEdicao.nome}
              onChangeText={(v) => setTurmaEmEdicao((atual) => ({ ...atual, nome: v }))}
              placeholder="Ex: 9º Ano A"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>Escola</Text>
            <TextInput
              value={turmaEmEdicao.escola}
              onChangeText={(v) => setTurmaEmEdicao((atual) => ({ ...atual, escola: v }))}
              placeholder="Ex: E.E. Marechal Rondon"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <View style={styles.modalAcoes}>
              {editando && (
                <TouchableOpacity style={styles.botaoExcluir} onPress={excluirTurma}>
                  <Ionicons name="trash-outline" size={16} color={COR.perigo} />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.botaoCancelar} onPress={fecharModal}>
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSalvar} onPress={salvarTurma}>
                <Text style={styles.botaoSalvarTexto}>
                  {editando ? "Salvar alterações" : "Criar turma"}
                </Text>
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
  miolo: { width: "92%", maxWidth: 1000 },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 56,
    marginBottom: 22,
  },
  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  tituloPaginaDesktop: { fontFamily: FONTE.bold, fontSize: 20, fontWeight: "700", color: COR.tintaForte },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    fontWeight: "700",
    color: COR.tintaForte,
    marginBottom: 14,
    width: "100%",
  },

  buscaLinha: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 16 },
  buscaBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COR.branco,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COR.linha,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buscaInput: { fontFamily: FONTE.regular, flex: 1, fontSize: 13, color: COR.tintaForte, padding: 0 },

  botaoNovaTurmaDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COR.marinho,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoNovaTurmaDesktopTexto: { fontFamily: FONTE.bold, color: COR.branco, fontSize: 13, fontWeight: "700" },

  lista: { width: "100%", gap: 10 },
  turmaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: COR.branco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderLeftWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  turmaSigla: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  turmaSiglaTexto: { fontFamily: FONTE.bold, fontSize: 15, fontWeight: "700", color: COR.branco },
  turmaTextos: { flex: 1, minWidth: 0 },
  turmaNome: { fontFamily: FONTE.bold, fontSize: 14, fontWeight: "700", color: COR.tintaForte },
  turmaDetalhe: { fontFamily: FONTE.regular, fontSize: 11.5, color: COR.tintaFraca, marginTop: 2 },
  turmaMeta: { fontFamily: FONTE.regular, fontSize: 11.5, color: COR.tintaFraca, marginTop: 5 },
  turmaMetaForte: { fontFamily: FONTE.semi, fontWeight: "600", color: COR.tintaMedia },

  vazioBox: { alignItems: "center", gap: 8, paddingVertical: 40 },
  vazioTexto: { fontFamily: FONTE.regular, fontSize: 13, color: COR.tintaFraca },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalFundoMobile: {
    justifyContent: "flex-end",
    padding: 0,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COR.branco,
    borderRadius: 18,
    padding: 22,
  },
  modalCardMobile: {
    maxWidth: "100%",
    borderRadius: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitulo: { fontFamily: FONTE.bold, fontSize: 17, fontWeight: "700", color: COR.tintaForte },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 14,
    marginBottom: 6,
  },
  obrigatorio: { color: COR.perigo },
  campoTexto: {
    fontFamily: FONTE.regular,
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: COR.tintaForte,
    backgroundColor: COR.branco,
  },

  modalAcoes: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22 },
  botaoExcluir: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COR.perigo,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COR.linha,
  },
  botaoCancelarTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.tintaMedia },
  botaoSalvar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COR.marinho,
  },
  botaoSalvarTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.branco },
});