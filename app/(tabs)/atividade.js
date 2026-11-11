import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import {
  buscarAtividade,
  excluirAtividade,
  urlDaImagem,
} from "../../constants/api";
import { imprimirProvaDaAtividade } from "../../constants/provaPdf";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const VISUAL_PADRAO = {
  icone: "file-document-outline",
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
  const achou = POR_DISCIPLINA.find((g) =>
    g.termos.some((t) => nome.includes(t)),
  );
  return achou
    ? { icone: achou.icone, corFundo: achou.corFundo, corIcone: achou.corIcone }
    : VISUAL_PADRAO;
}

const NOME_DO_TIPO = {
  alternativa: "Alternativa",
  dissertativa: "Dissertativa",
  calculo: "Cálculo",
};

function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function formatarPeso(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function formatarData(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? "" : data.toLocaleDateString("pt-BR");
}

export default function AtividadeDetalhe() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const params = useLocalSearchParams();

  const id_atividade = params.id;

  const [atividade, setAtividade] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState("");
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        if (!id_atividade) {
          setErro("Nenhuma atividade foi indicada.");
          setCarregando(false);
          return;
        }

        setCarregando(true);
        setErro("");

        try {
          const dados = await buscarAtividade(id_atividade);
          if (ativo) setAtividade(dados);
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
    }, [id_atividade]),
  );

  async function gerarProva() {
    if (ocupado) return;
    setOcupado("pdf");
    setErro("");

    try {
      const problema = await imprimirProvaDaAtividade({
        ...atividade,
        turma: atividade.turma?.nome || "",
      });
      if (problema) setErro(problema);
    } catch (e) {
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  async function apagar() {
    if (ocupado) return;
    setOcupado("excluir");
    setErro("");

    try {
      await excluirAtividade(id_atividade);
      setConfirmandoExclusao(false);
      router.replace("/atividades");
    } catch (e) {
      setConfirmandoExclusao(false);
      setErro(e.message);
    } finally {
      setOcupado("");
    }
  }

  if (carregando) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <ActivityIndicator color={COR.marcador} />
          <Text style={styles.textoApoio}>Abrindo a atividade...</Text>
        </View>
      </View>
    );
  }

  if (!atividade) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <Ionicons
            name="alert-circle-outline"
            size={42}
            color={COR.avisoTexto}
          />
          <Text style={styles.textoApoio}>
            {erro || "Atividade não encontrada."}
          </Text>
          <TouchableOpacity
            style={styles.botaoEscuro}
            onPress={() => router.replace("/atividades")}
          >
            <Text style={styles.botaoEscuroTexto}>Ver atividades</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const visual = visualDaDisciplina(atividade.disciplina);
  const questoes = atividade.questao || [];
  const resumo = atividade.resumo || {
    folhas: 0,
    revisadas: 0,
    media: 0,
    peso_total: 0,
  };

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
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={21} color={COR.tintaForte} />
            <Text
              style={[
                styles.tituloPagina,
                ehDesktop && styles.tituloPaginaDesktop,
              ]}
            >
              Atividade
            </Text>
          </TouchableOpacity>

          {/* Cartão de cima: identificação da atividade e os números do resumo. */}
          <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
            <View style={styles.topoLinha}>
              <View
                style={[
                  styles.iconeCirculo,
                  ehDesktop && styles.iconeCirculoDesktop,
                  { backgroundColor: visual.corFundo },
                ]}
              >
                <MaterialCommunityIcons
                  name={visual.icone}
                  size={28}
                  color={visual.corIcone}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    styles.nomeAtividade,
                    ehDesktop && styles.nomeAtividadeDesktop,
                  ]}
                >
                  {atividade.nome}
                </Text>
                <Text
                  style={[
                    styles.subtitulo,
                    ehDesktop && styles.subtituloDesktop,
                  ]}
                >
                  {atividade.disciplina || "Sem disciplina"}
                  {atividade.turma?.nome ? ` · ${atividade.turma.nome}` : ""}
                  {formatarData(atividade.criado_em)
                    ? ` · ${formatarData(atividade.criado_em)}`
                    : ""}
                </Text>
              </View>
            </View>

            {!!atividade.descricao && (
              <Text
                style={[styles.descricao, ehDesktop && styles.descricaoDesktop]}
              >
                {atividade.descricao}
              </Text>
            )}

            <View style={styles.numerosLinha}>
              <View
                style={[
                  styles.numero,
                  ehDesktop ? styles.numeroLargo : styles.numeroMetade,
                ]}
              >
                <Text
                  style={[
                    styles.numeroValor,
                    ehDesktop && styles.numeroValorDesktop,
                  ]}
                >
                  {questoes.length}
                </Text>
                <Text
                  style={[
                    styles.numeroRotulo,
                    ehDesktop && styles.numeroRotuloDesktop,
                  ]}
                >
                  {questoes.length === 1 ? "questão" : "questões"}
                </Text>
              </View>

              <View
                style={[
                  styles.numero,
                  ehDesktop ? styles.numeroLargo : styles.numeroMetade,
                ]}
              >
                <Text
                  style={[
                    styles.numeroValor,
                    ehDesktop && styles.numeroValorDesktop,
                  ]}
                >
                  {formatarPeso(resumo.peso_total)}
                </Text>
                <Text
                  style={[
                    styles.numeroRotulo,
                    ehDesktop && styles.numeroRotuloDesktop,
                  ]}
                >
                  pontos no total
                </Text>
              </View>

              <View
                style={[
                  styles.numero,
                  ehDesktop ? styles.numeroLargo : styles.numeroMetade,
                ]}
              >
                <Text
                  style={[
                    styles.numeroValor,
                    ehDesktop && styles.numeroValorDesktop,
                  ]}
                >
                  {resumo.folhas}
                </Text>
                <Text
                  style={[
                    styles.numeroRotulo,
                    ehDesktop && styles.numeroRotuloDesktop,
                  ]}
                >
                  {resumo.folhas === 1
                    ? "folha corrigida"
                    : "folhas corrigidas"}
                </Text>
              </View>

              {resumo.folhas > 0 && (
                <View
                  style={[
                    styles.numero,
                    ehDesktop ? styles.numeroLargo : styles.numeroMetade,
                  ]}
                >
                  <Text
                    style={[
                      styles.numeroValor,
                      ehDesktop && styles.numeroValorDesktop,
                    ]}
                  >
                    {formatarNota(resumo.media)}
                  </Text>
                  <Text
                    style={[
                      styles.numeroRotulo,
                      ehDesktop && styles.numeroRotuloDesktop,
                    ]}
                  >
                    média da turma
                  </Text>
                </View>
              )}
            </View>
          </View>

          {!!erro && <Text style={styles.erroFaixa}>{erro}</Text>}

          {/* Editar, salvar a prova em PDF e excluir. */}
          <View style={[styles.acoes, ehDesktop && styles.acoesDesktop]}>
            <TouchableOpacity
              style={[styles.botaoAcao, ehDesktop && styles.botaoAcaoDesktop]}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/criar-atividade",
                  params: {
                    modo: "editar",
                    id: atividade.id_atividade,
                    tituloInicial: atividade.nome,
                    idTurmaInicial: atividade.id_turma,
                  },
                })
              }
            >
              <Ionicons
                name="create-outline"
                size={ehDesktop ? 19 : 20}
                color={COR.marcador}
              />
              <Text
                style={[
                  styles.botaoAcaoTexto,
                  ehDesktop && styles.botaoAcaoTextoDesktop,
                ]}
              >
                Editar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botaoAcao, ehDesktop && styles.botaoAcaoDesktop]}
              activeOpacity={0.85}
              disabled={!!ocupado}
              onPress={gerarProva}
            >
              <Ionicons
                name="print-outline"
                size={ehDesktop ? 18 : 19}
                color={COR.marcador}
              />
              <Text
                style={[
                  styles.botaoAcaoTexto,
                  ehDesktop && styles.botaoAcaoTextoDesktop,
                ]}
              >
                {ocupado === "pdf" ? "Gerando..." : "Salvar prova em PDF"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.botaoAcao,
                ehDesktop && styles.botaoAcaoDesktop,
                styles.botaoPerigo,
              ]}
              activeOpacity={0.85}
              disabled={!!ocupado}
              onPress={() => setConfirmandoExclusao(true)}
            >
              <Ionicons
                name="trash-outline"
                size={ehDesktop ? 18 : 19}
                color={COR.perigo}
              />
              <Text
                style={[
                  styles.botaoAcaoTexto,
                  ehDesktop && styles.botaoAcaoTextoDesktop,
                  { color: COR.perigo },
                ]}
              >
                Excluir
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista das questões com o gabarito logo abaixo de cada uma. */}
          <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
            <Text
              style={[
                styles.cartaoTitulo,
                ehDesktop && styles.cartaoTituloDesktop,
              ]}
            >
              Questões e gabarito
            </Text>

            {questoes.length === 0 && (
              <Text style={styles.textoApoio}>
                Esta atividade ainda não tem questões cadastradas.
              </Text>
            )}

            {questoes.map((q) => (
              <View key={q.id_questao} style={styles.blocoQuestao}>
                <View style={styles.questaoTopo}>
                  <View
                    style={[
                      styles.numeroCirculo,
                      ehDesktop && styles.numeroCirculoDesktop,
                    ]}
                  >
                    <Text
                      style={[
                        styles.numeroTexto,
                        ehDesktop && styles.numeroTextoDesktop,
                      ]}
                    >
                      {q.numero}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.pergunta,
                      ehDesktop && styles.perguntaDesktop,
                    ]}
                  >
                    {q.pergunta}
                  </Text>
                  <Text
                    style={[
                      styles.pesoQuestao,
                      ehDesktop && styles.pesoQuestaoDesktop,
                    ]}
                  >
                    {formatarPeso(q.peso)} pt
                  </Text>
                </View>

                <Text
                  style={[
                    styles.tipoQuestao,
                    ehDesktop && styles.tipoQuestaoDesktop,
                  ]}
                >
                  {NOME_DO_TIPO[q.tipo] || q.tipo}
                </Text>

                {/* A imagem da questão, quando existe uma anexada. */}
                {!!q.imagem && (
                  <Image
                    source={{ uri: urlDaImagem(q.imagem) }}
                    style={[
                      styles.questaoImagem,
                      ehDesktop && styles.questaoImagemDesktop,
                    ]}
                    resizeMode="contain"
                  />
                )}

                {q.tipo === "alternativa" ? (
                  <View style={styles.alternativas}>
                    {(q.alternativa || []).map((a) => {
                      const certa =
                        String(a.letra ?? "")
                          .trim()
                          .toUpperCase() ===
                        String(q.resposta_correta ?? "")
                          .trim()
                          .toUpperCase();
                      return (
                        <View
                          key={a.id_alternativa}
                          style={[
                            styles.alternativa,
                            ehDesktop && styles.alternativaDesktop,
                            certa && styles.alternativaCerta,
                          ]}
                        >
                          <Text
                            style={[
                              styles.letra,
                              ehDesktop && styles.letraDesktop,
                              certa && { color: COR.ok },
                            ]}
                          >
                            {a.letra})
                          </Text>
                          <Text
                            style={[
                              styles.textoAlternativa,
                              ehDesktop && styles.textoAlternativaDesktop,
                            ]}
                          >
                            {a.texto}
                          </Text>
                          {certa && (
                            <Ionicons
                              name="checkmark-circle"
                              size={ehDesktop ? 17 : 18}
                              color={COR.ok}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View
                    style={[
                      styles.gabarito,
                      ehDesktop && styles.gabaritoDesktop,
                    ]}
                  >
                    <Text
                      style={[
                        styles.gabaritoRotulo,
                        ehDesktop && styles.gabaritoRotuloDesktop,
                      ]}
                    >
                      {q.tipo === "calculo"
                        ? "Resultado esperado"
                        : "Palavras-chave"}
                    </Text>
                    <Text
                      style={[
                        styles.gabaritoTexto,
                        ehDesktop && styles.gabaritoTextoDesktop,
                      ]}
                    >
                      {q.resposta_correta || "— sem gabarito cadastrado —"}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {resumo.folhas > 0 && (
            <TouchableOpacity
              style={[
                styles.botaoEscuroLargo,
                ehDesktop && styles.botaoEscuroLargoDesktop,
              ]}
              activeOpacity={0.85}
              onPress={() =>
                router.push({
                  pathname: "/editar",
                  params: { id_atividade: atividade.id_atividade },
                })
              }
            >
              <Ionicons
                name="people-outline"
                size={ehDesktop ? 19 : 20}
                color={COR.branco}
              />
              <Text
                style={[
                  styles.botaoEscuroTexto,
                  ehDesktop && styles.botaoEscuroTextoDesktop,
                ]}
              >
                Ver as {resumo.folhas} folhas corrigidas
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={confirmandoExclusao}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmandoExclusao(false)}
      >
        <View style={styles.modalFundo}>
          <View
            style={[styles.modalCartao, ehDesktop && styles.modalCartaoDesktop]}
          >
            <View style={styles.modalIcone}>
              <Ionicons name="trash-outline" size={26} color={COR.perigo} />
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
              {resumo.folhas > 0
                ? `As questões, o gabarito e ${resumo.folhas} ${resumo.folhas === 1 ? "folha já corrigida" : "folhas já corrigidas"} vão junto. As notas somem com elas e não dá para desfazer.`
                : "As questões e o gabarito vão junto. Não dá para desfazer."}
            </Text>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.modalCancelar}
                onPress={() => setConfirmandoExclusao(false)}
              >
                <Text style={styles.modalCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalExcluir}
                disabled={!!ocupado}
                onPress={apagar}
              >
                <Text style={styles.modalExcluirTexto}>
                  {ocupado === "excluir" ? "Excluindo..." : "Excluir"}
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
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    padding: 35,
  },
  textoApoio: {
    fontFamily: FONTE.regular,
    fontSize: 15,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 21,
  },

  conteudo: { flex: 1 },
  conteudoInterno: {
    padding: 19,
    paddingBottom: 59,
    alignItems: "center",
    gap: 14,
  },
  miolo: { width: "94%", maxWidth: 900, gap: 17 },

  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 7,
  },
  tituloPagina: { fontFamily: FONTE.bold, fontSize: 21, color: COR.tintaForte },

  cartao: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 19,
    gap: 12,
  },
  cartaoTitulo: { fontFamily: FONTE.bold, fontSize: 16.5, color: COR.tintaForte },

  topoLinha: { flexDirection: "row", alignItems: "center", gap: 14 },
  iconeCirculo: {
    width: 57,
    height: 57,
    borderRadius: RAIO.controle,
    alignItems: "center",
    justifyContent: "center",
  },
  nomeAtividade: {
    fontFamily: FONTE.bold,
    fontSize: 20,
    color: COR.tintaForte,
  },
  subtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 13.5,
    color: COR.tintaFraca,
    marginTop: 2,
  },
  descricao: {
    fontFamily: FONTE.regular,
    fontSize: 15,
    color: COR.tintaMedia,
    lineHeight: 21,
  },

  tituloPaginaDesktop: { fontSize: 24 },
  cartaoDesktop: { padding: 22, borderRadius: RAIO.superficie, gap: 12 },
  cartaoTituloDesktop: { fontSize: 16.5 },
  iconeCirculoDesktop: {
    width: 58,
    height: 58,
    borderRadius: RAIO.controle,
  },
  nomeAtividadeDesktop: { fontSize: 21 },
  subtituloDesktop: { fontSize: 13.5, marginTop: 3 },
  descricaoDesktop: { fontSize: 14, lineHeight: 21 },
  numeroValorDesktop: { fontSize: 24, lineHeight: 29 },
  numeroRotuloDesktop: { fontSize: 13, lineHeight: 18 },
  botaoAcaoDesktop: {
    paddingVertical: 15,
    paddingHorizontal: 16,
    borderRadius: RAIO.controle,
  },
  botaoAcaoTextoDesktop: { fontSize: 14.5 },
  numeroCirculoDesktop: { width: 28, height: 28, borderRadius: 14 },
  numeroTextoDesktop: { fontSize: 13 },
  perguntaDesktop: { fontSize: 14.5, lineHeight: 20 },
  pesoQuestaoDesktop: { fontSize: 13 },
  tipoQuestaoDesktop: { fontSize: 11, marginLeft: 37 },
  questaoImagemDesktop: { height: 240, marginLeft: 37 },
  alternativaDesktop: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RAIO.controle,
  },
  letraDesktop: { fontSize: 13 },
  textoAlternativaDesktop: { fontSize: 14 },
  gabaritoDesktop: { padding: 13, borderRadius: RAIO.controle },
  gabaritoRotuloDesktop: { fontSize: 11 },
  gabaritoTextoDesktop: { fontSize: 14, lineHeight: 20 },
  botaoEscuroLargoDesktop: {
    paddingVertical: 16,
    borderRadius: RAIO.controle,
  },
  botaoEscuroTextoDesktop: { fontSize: 15 },
  modalCartaoDesktop: { maxWidth: 440, padding: 26 },
  modalTituloDesktop: { fontSize: 17 },
  modalTextoDesktop: { fontSize: 14, lineHeight: 20 },

  numerosLinha: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 19,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
    paddingTop: 17,
    marginTop: 5,
  },
  numero: { gap: 4, minWidth: 0, paddingRight: 14 },
  numeroMetade: { width: "50%" },
  numeroLargo: { flex: 1 },
  numeroValor: {
    fontFamily: FONTE.bold,
    fontSize: 22.5,
    color: COR.tintaForte,
    lineHeight: 27,
  },
  numeroRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaFraca,
    lineHeight: 17.5,
  },

  erroFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 14,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: RAIO.controle,
    padding: 14,
  },

  acoes: { width: "100%", flexDirection: "row", flexWrap: "wrap", gap: 9 },
  acoesDesktop: { flexWrap: "nowrap", gap: 10 },
  botaoAcao: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COR.branco,
    borderWidth: 1.5,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  botaoAcaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    color: COR.marcador,
  },
  botaoPerigo: { borderColor: COR.perigoFundo },

  blocoQuestao: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
    paddingTop: 14,
  },
  questaoTopo: { flexDirection: "row", alignItems: "flex-start", gap: 11 },
  numeroCirculo: {
    width: 28,
    height: 28,
    borderRadius: RAIO.controle,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  numeroTexto: { fontFamily: FONTE.bold, fontSize: 13, color: COR.marcador },
  pergunta: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 15,
    color: COR.tintaForte,
    lineHeight: 20,
  },
  pesoQuestao: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    color: COR.tintaFraca,
  },
  tipoQuestao: {
    fontFamily: FONTE.semi,
    fontSize: 11,
    color: COR.tintaFraca,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginLeft: 39,
  },

  questaoImagem: {
    marginLeft: 39,
    marginTop: 2,
    height: 212,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    backgroundColor: COR.fundo,
  },

  alternativas: { gap: 6, marginLeft: 39 },
  alternativa: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderRadius: RAIO.controle,
    backgroundColor: COR.fundo,
  },
  alternativaCerta: { backgroundColor: COR.okFundo },
  letra: { fontFamily: FONTE.bold, fontSize: 13.5, color: COR.tintaMedia },
  textoAlternativa: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaForte,
  },

  gabarito: {
    marginLeft: 39,
    backgroundColor: COR.fundo,
    borderRadius: RAIO.controle,
    padding: 12,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: COR.ok,
  },
  gabaritoRotulo: {
    fontFamily: FONTE.semi,
    fontSize: 11,
    color: COR.tintaFraca,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gabaritoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaForte,
    lineHeight: 20,
  },

  botaoEscuro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 19,
    paddingVertical: 12,
  },
  botaoEscuroLargo: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingVertical: 17,
  },
  botaoEscuroTexto: { color: COR.branco, fontFamily: FONTE.bold, fontSize: 15.5 },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
  },
  modalCartao: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    padding: 26,
    alignItems: "center",
    gap: 12,
  },
  modalIcone: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COR.perigoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 17.5,
    color: COR.tintaForte,
    textAlign: "center",
  },
  modalTexto: {
    fontFamily: FONTE.regular,
    fontSize: 15,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 21,
  },
  modalBotoes: { flexDirection: "row", gap: 12, width: "100%", marginTop: 7 },
  modalCancelar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: RAIO.controle,
    borderWidth: 1.5,
    borderColor: COR.linha,
  },
  modalCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    color: COR.tintaMedia,
  },
  modalExcluir: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: RAIO.controle,
    backgroundColor: COR.perigo,
  },
  modalExcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    color: COR.branco,
  },
});