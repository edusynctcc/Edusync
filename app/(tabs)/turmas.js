import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE } from "../../components/estilo";
import { criarTurma, listarTurmas } from "../../constants/api";

const CORES_TURMA = ["#2E6FB0", "#8B5EA6", "#DDA015", "#2F7D5C", "#B4443A"];

function iniciais(nome) {
  const texto = String(nome).trim();
  const numero = (texto.match(/\d+/) || [""])[0];
  const letra = (texto.match(/([A-Za-zÀ-ÿ])\s*$/) || ["", ""])[1].toUpperCase();
  if (numero && letra) return numero + letra;

  const palavras = texto.split(/\s+/).filter(Boolean);
  return (
    palavras
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("") || "?"
  );
}

export default function Turmas() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehWeb = Platform.OS === "web";
  const router = useRouter();
  const { turmaBusca } = useLocalSearchParams();

  const [turmas, setTurmas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState(turmaBusca ? String(turmaBusca) : "");
  const [modalAberto, setModalAberto] = useState(false);
  const [novaTurma, setNovaTurma] = useState({ nome: "", escola: "" });
  const [salvando, setSalvando] = useState(false);

  // useFocusEffect e não useEffect: esta é uma tela de aba e não é desmontada
  // ao navegar. Com useEffect([]) as contagens ficariam congeladas no valor de
  // quando o app abriu — voltar da tela da turma depois de cadastrar um aluno
  // não mudaria nada aqui.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        setCarregando(true);
        setErro("");
        try {
          const dados = await listarTurmas();
          if (!ativo) return;

          setTurmas(
            dados.map((t, i) => ({
              ...t,
              id: t.id_turma,
              cor: CORES_TURMA[i % CORES_TURMA.length],
              alunos: t.alunos ?? 0,
              atividades: t.atividades ?? 0,
            })),
          );
        } catch (e) {
          if (ativo) setErro(e.message);
        } finally {
          if (ativo) setCarregando(false);
        }
      }

      carregar();
      return () => {
        ativo = false;
      };
    }, []),
  );

  const turmasFiltradas = turmas.filter((t) =>
    `${t.nome} ${t.escola}`.toLowerCase().includes(busca.toLowerCase()),
  );

  function abrirCriar() {
    setNovaTurma({ nome: "", escola: "" });
    setModalAberto(true);
  }

  function abrirTurma(turma) {
    router.push({ pathname: "/turma", params: { id: turma.id } });
  }

  async function salvarTurma() {
    if (!novaTurma.nome.trim() || salvando) return;

    setSalvando(true);
    setErro("");

    try {
      const criada = await criarTurma(
        novaTurma.nome.trim(),
        novaTurma.escola.trim(),
      );
      setModalAberto(false);

      // Abre a turma recém-criada: o passo seguinte quase sempre é cadastrar
      // os alunos dela, e é lá dentro que isso acontece.
      router.push({
        pathname: "/turma",
        params: { id: criada.id_turma },
      });
    } catch (e) {
      setErro(e.message);
      setModalAberto(false);
    } finally {
      setSalvando(false);
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
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Turmas</Text>
              </TouchableOpacity>
            </View>
          )}

          {!ehDesktop && <Text style={styles.tituloPagina}>Turmas</Text>}

          <View style={styles.buscaLinha}>
            <View
              style={[styles.buscaBox, ehDesktop && styles.buscaBoxDesktop]}
            >
              <Ionicons name="search" size={16} color={COR.tintaFraca} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar turma ou escola..."
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

            {(ehDesktop || ehWeb) && (
              <TouchableOpacity
                style={styles.botaoNovaTurmaDesktop}
                onPress={abrirCriar}
              >
                <Ionicons name="add" size={19} color={COR.branco} />
                <Text style={styles.botaoNovaTurmaDesktopTexto}>
                  Criar turma
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {erro ? <Text style={styles.erroFaixa}>{erro}</Text> : null}
          {carregando ? (
            <Text style={{ color: COR.tintaFraca, marginBottom: 10 }}>
              Carregando...
            </Text>
          ) : null}

          <View style={[styles.lista, ehDesktop && styles.listaDesktop]}>
            {turmasFiltradas.map((turma) => (
              <TouchableOpacity
                key={turma.id}
                style={[styles.turmaCard, ehDesktop && styles.turmaCardDesktop]}
                activeOpacity={0.85}
                onPress={() => abrirTurma(turma)}
              >
                <View
                  style={[
                    styles.turmaSigla,
                    ehDesktop && styles.turmaSiglaDesktop,
                    { backgroundColor: turma.cor },
                  ]}
                >
                  <Text
                    style={[
                      styles.turmaSiglaTexto,
                      ehDesktop && styles.turmaSiglaTextoDesktop,
                    ]}
                  >
                    {iniciais(turma.nome)}
                  </Text>
                </View>

                <View style={styles.turmaTextos}>
                  <Text
                    style={[
                      styles.turmaNome,
                      ehDesktop && styles.turmaNomeDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    {turma.nome}
                  </Text>
                  <Text
                    style={[
                      styles.turmaDetalhe,
                      ehDesktop && styles.turmaDetalheDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    {turma.escola}
                  </Text>
                  <Text
                    style={[
                      styles.turmaMeta,
                      ehDesktop && styles.turmaMetaDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    <Text style={styles.turmaMetaForte}>{turma.alunos}</Text>{" "}
                    {turma.alunos === 1 ? "aluno" : "alunos"} ·{" "}
                    <Text style={styles.turmaMetaForte}>
                      {turma.atividades}
                    </Text>{" "}
                    {turma.atividades === 1 ? "atividade" : "atividades"}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={ehDesktop ? 20 : 18}
                  color={COR.tintaFraca}
                />
              </TouchableOpacity>
            ))}

            {turmasFiltradas.length === 0 && !carregando && (
              <View style={styles.vazioBox}>
                <Ionicons
                  name="people-outline"
                  size={28}
                  color={COR.tintaFraca}
                />
                <Text
                  style={[
                    styles.vazioTexto,
                    ehDesktop && styles.vazioTextoDesktop,
                  ]}
                >
                  Nenhuma turma encontrada.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {!ehDesktop && !ehWeb && (
        <BotaoFlutuante
          onPress={abrirCriar}
          style={{ bottom: 74, right: 14 }}
        />
      )}

      <Modal
        visible={modalAberto}
        transparent
        animationType="slide"
        onRequestClose={() => setModalAberto(false)}
      >
        <View
          style={[styles.modalFundo, !ehDesktop && styles.modalFundoMobile]}
        >
          <View
            style={[
              styles.modalCard,
              ehDesktop && styles.modalCardDesktop,
              !ehDesktop && styles.modalCardMobile,
            ]}
          >
            <View style={styles.modalCabecalho}>
              <Text
                style={[
                  styles.modalTitulo,
                  ehDesktop && styles.modalTituloDesktop,
                ]}
              >
                Criar turma
              </Text>
              <TouchableOpacity onPress={() => setModalAberto(false)}>
                <Ionicons name="close" size={22} color={COR.tintaMedia} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.rotulo, ehDesktop && styles.rotuloDesktop]}>
              Nome da turma <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={novaTurma.nome}
              onChangeText={(v) =>
                setNovaTurma((atual) => ({ ...atual, nome: v }))
              }
              placeholder="Ex: 9º Ano A"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campoTexto, ehDesktop && styles.campoTextoDesktop]}
            />

            <Text style={[styles.rotulo, ehDesktop && styles.rotuloDesktop]}>
              Escola
            </Text>
            <TextInput
              value={novaTurma.escola}
              onChangeText={(v) =>
                setNovaTurma((atual) => ({ ...atual, escola: v }))
              }
              placeholder="Ex: E.E. Marechal Rondon"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campoTexto, ehDesktop && styles.campoTextoDesktop]}
            />

            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={styles.botaoCancelar}
                onPress={() => setModalAberto(false)}
              >
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botaoSalvar}
                disabled={salvando}
                onPress={salvarTurma}
              >
                <Text style={styles.botaoSalvarTexto}>
                  {salvando ? "Criando..." : "Criar turma"}
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
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    fontWeight: "700",
    color: COR.tintaForte,
    marginBottom: 14,
    width: "100%",
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COR.linha,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buscaInput: {
    fontFamily: FONTE.regular,
    flex: 1,
    fontSize: 13,
    color: COR.tintaForte,
    padding: 0,
  },

  botaoNovaTurmaDesktop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COR.marinho,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoNovaTurmaDesktopTexto: {
    fontFamily: FONTE.bold,
    color: COR.branco,
    fontSize: 13,
  },

  erroFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    lineHeight: 17,
  },

  lista: { width: "100%", gap: 10 },
  turmaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    backgroundColor: COR.branco,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
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
  turmaSiglaTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    fontWeight: "700",
    color: COR.branco,
  },
  turmaTextos: { flex: 1, minWidth: 0 },
  turmaNome: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  turmaDetalhe: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 2,
  },
  turmaMeta: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 5,
  },
  turmaMetaForte: {
    fontFamily: FONTE.semi,
    fontWeight: "600",
    color: COR.tintaMedia,
  },

  // -------------------------------------------------------------------------
  // Tamanhos só do computador.
  //
  // Esta tela desenha o mesmo JSX nas duas larguras, então cada estilo daqui
  // entra empilhado por cima do compartilhado:
  // [styles.turmaNome, ehDesktop && styles.turmaNomeDesktop].
  // O primeiro define, o segundo corrige, e o celular não passa por aqui.
  //
  // Mesmo arranjo do AUMENTO_DESKTOP da Home. Para ajustar o web, é só este
  // bloco.
  // -------------------------------------------------------------------------
  buscaBoxDesktop: { paddingHorizontal: 14, paddingVertical: 13 },
  buscaInputDesktop: { fontSize: 14.5 },

  listaDesktop: { gap: 12 },
  turmaCardDesktop: {
    gap: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
  },
  turmaSiglaDesktop: { width: 52, height: 52, borderRadius: 15 },
  turmaSiglaTextoDesktop: { fontSize: 17 },
  turmaNomeDesktop: { fontSize: 16 },
  turmaDetalheDesktop: { fontSize: 13, marginTop: 3 },
  turmaMetaDesktop: { fontSize: 13, marginTop: 6 },
  vazioTextoDesktop: { fontSize: 14.5 },

  modalCardDesktop: { maxWidth: 480, padding: 26 },
  modalTituloDesktop: { fontSize: 19 },
  rotuloDesktop: { fontSize: 13.5, marginTop: 16 },
  campoTextoDesktop: { fontSize: 14.5, paddingVertical: 12 },

  vazioBox: { alignItems: "center", gap: 8, paddingVertical: 40 },
  vazioTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaFraca,
  },

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
  modalTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 17,
    fontWeight: "700",
    color: COR.tintaForte,
  },

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

  modalAcoes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 22,
  },
  botaoCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COR.linha,
  },
  botaoCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.tintaMedia,
  },
  botaoSalvar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: COR.marinho,
  },
  botaoSalvarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.branco,
  },
});
