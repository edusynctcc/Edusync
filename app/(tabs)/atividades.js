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
import { imprimirProvaDaAtividade } from "../../constants/provaPdf";

// ---------------------------------------------------------------------------
// Os filtros "Todas / Em aberto / Concluídas" saíram daqui.
//
// Eles nunca funcionaram, e não dava para consertar sem inventar dado: a
// tabela `atividade` não tem coluna de status. O que o banco guarda é o
// status de cada CORREÇÃO ("pendente" por padrão), que é outra coisa — quem
// tem estado é a folha de cada aluno, não a atividade.
//
// Com isso, "Em aberto" mostrava tudo e "Concluídas" não mostrava nada. Três
// botões que o professor clica e nada acontece leem como defeito, não como
// funcionalidade pela metade.
//
// Para fazer de verdade, a regra honesta seria derivar das correções:
// "em aberto" = ainda tem aluno sem folha fechada; "concluída" = todas
// fechadas. Isso pede uma contagem por atividade vinda da API, e fica para
// quando valer a pena.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// O banco não guarda ícone. Em vez de sortear pela posição na lista, deduzimos
// da disciplina que o professor já preenche — assim a mesma atividade tem
// sempre o mesmo ícone, mesmo quando a ordem da lista muda.
//
// As cores aqui são de IDENTIDADE da matéria, não de status: verde quer dizer
// "Ciências", não "concluído".
// ---------------------------------------------------------------------------
const VISUAL_PADRAO = {
  icone: "file-document-outline",
  biblioteca: "mci",
  corFundo: "#EEF2F4",
  corIcone: "#55646F",
};

const POR_DISCIPLINA = [
  {
    termos: ["matematica", "algebra", "geometria", "calculo", "aritmetica"],
    icone: "function-variant",
    corFundo: "#E7EFF7",
    corIcone: "#2E6FB0",
  },
  {
    termos: ["historia"],
    icone: "book-open-page-variant",
    corFundo: "#FBF1E0",
    corIcone: "#8A4A12",
  },
  {
    termos: ["geografia"],
    icone: "earth",
    corFundo: "#F3EDE6",
    corIcone: "#A85A3C",
  },
  {
    termos: ["ciencias", "biologia", "quimica", "fisica"],
    icone: "flask-outline",
    corFundo: "#E6F2EC",
    corIcone: "#2F7D5C",
  },
  {
    termos: ["portugues", "literatura", "redacao", "gramatica"],
    icone: "format-quote-close",
    corFundo: "#EFEAF7",
    corIcone: "#6B4E9B",
  },
  {
    termos: ["ingles", "espanhol", "frances", "idioma"],
    icone: "translate",
    corFundo: "#E9EEF0",
    corIcone: "#55646F",
  },
  {
    termos: ["arte", "artes", "musica", "educacao fisica"],
    icone: "palette-outline",
    corFundo: "#FBEAE8",
    corIcone: "#B4443A",
  },
];

function semAcento(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function visualDaDisciplina(disciplina) {
  const nome = semAcento(disciplina);
  if (!nome) return VISUAL_PADRAO;

  const achou = POR_DISCIPLINA.find((grupo) =>
    grupo.termos.some((termo) => nome.includes(termo)),
  );

  if (!achou) return VISUAL_PADRAO;

  return {
    icone: achou.icone,
    biblioteca: "mci",
    corFundo: achou.corFundo,
    corIcone: achou.corIcone,
  };
}

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

  // Gera a folha em branco da atividade, para imprimir e entregar aos alunos.
  // As questões vêm do banco; o gabarito não entra no documento.
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

  // Com os filtros fora, a busca é o único jeito de encurtar a lista — então
  // ela passou a ignorar acento. O semAcento já estava aqui para escolher o
  // ícone da disciplina; agora serve aos dois. Sem isso, procurar "ciencias"
  // não acha "Ciências", e o professor conclui que a atividade sumiu.
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
            {atividadesFiltradas.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.atividadeCard,
                  ehDesktop && styles.atividadeCardDesktop,
                  !ehDesktop && styles.atividadeCardMobile,
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
                  </View>

                  {ehDesktop && (
                    <View style={styles.atividadeAcao}>
                      <TouchableOpacity
                        style={[styles.botaoVer, styles.botaoVerDesktop]}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: "/atividade",
                            params: { id: item.id },
                          })
                        }
                      >
                        <Text
                          style={[
                            styles.botaoVerTexto,
                            styles.botaoVerTextoDesktop,
                          ]}
                        >
                          Ver atividade
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={[
                          styles.atividadeData,
                          styles.atividadeDataDesktop,
                        ]}
                      >
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
                          pathname: "/atividade",
                          params: { id: item.id },
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
    // Era 14 quando havia a fila de filtros logo abaixo. Sem ela, a busca
    // ficaria colada na lista.
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

  // -------------------------------------------------------------------------
  // Tamanhos só do computador.
  //
  // Esta tela desenha o mesmo JSX nas duas larguras, então cada estilo daqui
  // entra empilhado por cima do compartilhado:
  // [styles.atividadeTitulo, ehDesktop && styles.atividadeTituloDesktop].
  // O primeiro define, o segundo corrige, e o celular não passa por aqui.
  //
  // Mesmo arranjo do AUMENTO_DESKTOP da Home. Para ajustar o web, é só este
  // bloco.
  // -------------------------------------------------------------------------
  buscaBoxDesktop: { paddingHorizontal: 14, paddingVertical: 13 },
  buscaInputDesktop: { fontSize: 14.5 },

  // Estes quatro números são os da tela de Turmas, medidos em cima dela para
  // os dois cartões ficarem iguais de verdade. Mexer num deles aqui desencontra
  // as duas telas de novo.
  //
  // A borda já era a mesma nas duas (1px de COR.linhaSuave, que é #E9EEF0) — o
  // que fazia parecer diferente era o cartão de atividade ter 2px a menos de
  // respiro interno e o quadradinho do ícone ser 4px menor.
  listaDesktop: { gap: 12 },
  atividadeCardDesktop: { padding: 20, borderRadius: 10 },
  atividadeLinhaTopoDesktop: { gap: 16 },
  atividadeIconeCirculoDesktop: { width: 52, height: 52, borderRadius: 12 },
  atividadeTituloDesktop: { fontSize: 15.5 },
  atividadeDescricaoDesktop: { fontSize: 13, marginTop: 3 },
  botaoVerDesktop: { paddingHorizontal: 16, paddingVertical: 10 },
  botaoVerTextoDesktop: { fontSize: 13.5 },
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
    borderRadius: 10,
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
  atividadeAcao: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  botaoVer: {
    backgroundColor: COR.marinho,
    borderRadius: 8,
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