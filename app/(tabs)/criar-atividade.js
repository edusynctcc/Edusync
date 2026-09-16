import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
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
import { listarTurmas, criarAtividade, atualizarAtividade } from "../../constants/api";

const TIPOS = [
  { valor: "multipla_escolha", rotulo: "Alternativa" },
  { valor: "dissertativa", rotulo: "Dissertativa" },
  { valor: "calculo", rotulo: "Cálculo" },
];

const LETRAS = ["A", "B", "C", "D", "E"];

let proximoId = 1;

function novaQuestao() {
  return {
    id: proximoId++,
    enunciado: "",
    peso: "1",
    tipo: "multipla_escolha",
    alternativas: [
      { letra: "A", texto: "" },
      { letra: "B", texto: "" },
      { letra: "C", texto: "" },
      { letra: "D", texto: "" },
    ],
    letraCorreta: "",
    palavrasChave: "",
    respostaEsperada: "",
  };
}

function contarPalavrasChave(texto) {
  return texto
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean).length;
}

function comoNumero(texto) {
  const n = parseFloat(String(texto).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export default function CriarAtividade() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

  // Vindo de "Editar atividade", os dados chegam por parâmetro.
  const { modo, id, tituloInicial, idTurmaInicial } = useLocalSearchParams();
  const emEdicao = modo === "editar";

  const [titulo, setTitulo] = useState(
    typeof tituloInicial === "string" ? tituloInicial : "",
  );
  const [disciplina, setDisciplina] = useState("");
  const [descricao, setDescricao] = useState("");
  const [questoes, setQuestoes] = useState([novaQuestao()]);

  const [turmas, setTurmas] = useState([]);
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [modalTurmaAberto, setModalTurmaAberto] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarTurmas() {
      try {
        const dados = await listarTurmas();
        setTurmas(dados);
        if (idTurmaInicial) {
          const turmaAtual = dados.find((t) => t.id_turma === Number(idTurmaInicial));
          if (turmaAtual) setTurmaSelecionada(turmaAtual);
        }
      } catch (e) {
        setErro(e.message);
      }
    }
    carregarTurmas();
  }, []);

  function atualizarQuestao(idQuestao, campo, valor) {
    setQuestoes((atuais) =>
      atuais.map((q) => (q.id === idQuestao ? { ...q, [campo]: valor } : q))
    );
  }

  function adicionarQuestao() {
    setQuestoes((atuais) => [...atuais, novaQuestao()]);
  }

  function removerQuestao(id) {
    setQuestoes((atuais) => atuais.filter((q) => q.id !== id));
  }

  function atualizarAlternativa(idQuestao, letra, texto) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? {
              ...q,
              alternativas: q.alternativas.map((a) =>
                a.letra === letra ? { ...a, texto } : a
              ),
            }
          : q
      )
    );
  }

  function adicionarAlternativa(idQuestao) {
    setQuestoes((atuais) =>
      atuais.map((q) => {
        if (q.id !== idQuestao) return q;
        const proximaLetra = LETRAS[q.alternativas.length];
        if (!proximaLetra) return q;
        return { ...q, alternativas: [...q.alternativas, { letra: proximaLetra, texto: "" }] };
      })
    );
  }

  function removerAlternativa(idQuestao, letra) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? { ...q, alternativas: q.alternativas.filter((a) => a.letra !== letra) }
          : q
      )
    );
  }

  async function publicarAtividade() {
    if (!titulo.trim() || !disciplina.trim() || !turmaSelecionada) {
      setErro("Preencha título, disciplina e turma antes de continuar.");
      return;
    }

    setSalvando(true);
    setErro("");
    try {
      if (emEdicao) {
        await atualizarAtividade(id, titulo, disciplina, descricao, turmaSelecionada.id_turma);
      } else {
        await criarAtividade(titulo, disciplina, descricao, turmaSelecionada.id_turma);
      }
      // Questões ainda não são conectadas à API — isso entra no próximo passo.
      router.replace("/atividades");
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <View style={styles.tela}>
      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : null}>
          {ehDesktop ? (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>
                  {emEdicao ? "Editar atividade" : "Criar atividade"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
              <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
              <Text style={styles.tituloPagina}>
                {emEdicao ? "Editar atividade" : "Criar atividade"}
              </Text>
            </TouchableOpacity>
          )}

          {erro ? <Text style={{ color: "#EF4444", marginBottom: 12 }}>{erro}</Text> : null}

          <View
            style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}
          >
            <View style={styles.secaoCabecalho}>
              <Text style={styles.secaoTitulo}>Informações gerais</Text>
            </View>

            <Text style={styles.rotulo}>
              Título da atividade <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex: Prova de Ciências — Fotossíntese"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>
              Disciplina <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={disciplina}
              onChangeText={setDisciplina}
              placeholder="Ex: Ciências"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Avaliação bimestral sobre processos das plantas"
              placeholderTextColor={COR.tintaFraca}
              style={[styles.campoTexto, styles.campoTextoArea]}
              multiline
            />

            <Text style={styles.rotulo}>
              Turma <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.campoSelect}
              onPress={() => setModalTurmaAberto(true)}
            >
              <Text
                style={
                  turmaSelecionada ? styles.campoSelectValor : styles.campoSelectPlaceholder
                }
              >
                {turmaSelecionada ? turmaSelecionada.nome : "Selecione a turma"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.avisoBox}>
            <Ionicons
              name="information-circle"
              size={18}
              color={COR.marcador}
            />
            <View style={styles.avisoTextos}>
              <Text style={styles.avisoTitulo}>Isto é o gabarito</Text>
              <Text style={styles.avisoDescricao}>
                A IA corrige as folhas escaneadas comparando com o que você
                preencher aqui.
              </Text>
            </View>
          </View>

          {/* Questões da atividade — ainda não conectadas à API */}
          <Text style={styles.secaoTituloGrande}>Questões da atividade</Text>
          <Text style={styles.secaoSubtitulo}>
            A IA usará essas informações para corrigir as imagens.
          </Text>

          {questoes.map((questao, indice) => (
            <View
              key={questao.id}
              style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}
            >
              <View style={styles.questaoCabecalho}>
                <Text style={styles.numeroQuestao}>QUESTÃO {indice + 1}</Text>
                {questoes.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removerQuestao(questao.id)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={COR.tintaFraca}
                    />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.rotulo}>
                Enunciado <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <TextInput
                value={questao.enunciado}
                onChangeText={(v) =>
                  atualizarQuestao(questao.id, "enunciado", v)
                }
                placeholder="Digite o enunciado da questão..."
                placeholderTextColor={COR.tintaFraca}
                style={[styles.campoTexto, styles.campoTextoArea]}
                multiline
              />

              <Text style={styles.rotulo}>Peso</Text>
              <TextInput
                value={questao.peso}
                onChangeText={(v) => atualizarQuestao(questao.id, "peso", v)}
                placeholder="1,0"
                placeholderTextColor={COR.tintaFraca}
                style={[styles.campoTexto, styles.campoPeso]}
                keyboardType="decimal-pad"
              />

              <Text style={styles.rotulo}>
                Tipo <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <View style={styles.tiposGrade}>
                {TIPOS.map((tipo) => {
                  const selecionado = questao.tipo === tipo.valor;
                  return (
                    <TouchableOpacity
                      key={tipo.valor}
                      onPress={() =>
                        atualizarQuestao(questao.id, "tipo", tipo.valor)
                      }
                      style={[
                        styles.tipoPill,
                        selecionado && styles.tipoPillAtivo,
                      ]}
                    >
                      <Text
                        style={[
                          styles.tipoPillTexto,
                          selecionado && styles.tipoPillTextoAtivo,
                        ]}
                      >
                        {tipo.rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {questao.tipo === "multipla_escolha" && (
                <>
                  <Text style={styles.rotulo}>
                    Alternativas <Text style={styles.obrigatorio}>*</Text>{" "}
                    <Text style={styles.rotuloApoio}>— marque a correta</Text>
                  </Text>

                  {questao.alternativas.map((alternativa) => {
                    const correta = questao.letraCorreta === alternativa.letra;
                    return (
                      <View
                        key={alternativa.letra}
                        style={styles.alternativaLinha}
                      >
                        <TouchableOpacity
                          onPress={() =>
                            atualizarQuestao(
                              questao.id,
                              "letraCorreta",
                              alternativa.letra,
                            )
                          }
                          hitSlop={6}
                          style={[styles.radio, correta && styles.radioAtivo]}
                        />
                        <Text style={styles.alternativaLetra}>
                          {alternativa.letra})
                        </Text>
                        <TextInput
                          value={alternativa.texto}
                          onChangeText={(v) =>
                            atualizarAlternativa(
                              questao.id,
                              alternativa.letra,
                              v,
                            )
                          }
                          placeholder="Texto da alternativa"
                          placeholderTextColor={COR.tintaFraca}
                          style={[styles.campoTexto, styles.alternativaCampo]}
                        />
                        {questao.alternativas.length > 2 && (
                          <TouchableOpacity
                            onPress={() =>
                              removerAlternativa(questao.id, alternativa.letra)
                            }
                            hitSlop={8}
                          >
                            <Ionicons
                              name="close"
                              size={15}
                              color={COR.chevron}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {questao.alternativas.length < LETRAS.length && (
                    <TouchableOpacity
                      onPress={() => adicionarAlternativa(questao.id)}
                    >
                      <Text style={styles.linkPequeno}>
                        + Adicionar alternativa
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {questao.tipo === "dissertativa" && (
                <>
                  <Text style={styles.rotulo}>
                    Palavras-chave <Text style={styles.obrigatorio}>*</Text>
                  </Text>
                  <TextInput
                    value={questao.palavrasChave}
                    onChangeText={(v) =>
                      atualizarQuestao(questao.id, "palavrasChave", v)
                    }
                    placeholder="luz solar; gás carbônico; água; glicose; oxigênio"
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.campoTexto}
                  />
                  <Text style={styles.dica}>
                    Separe por ponto e vírgula. A IA conta quantas o aluno
                    expressou — mesmo com outras palavras ("H2O" vale por
                    "água") — e a nota é essa fração do peso.
                  </Text>
                  {contarPalavrasChave(questao.palavrasChave) > 0 && (
                    <Text style={styles.dicaForte}>
                      {contarPalavrasChave(questao.palavrasChave)} palavras ·
                      cada uma vale{" "}
                      {(
                        comoNumero(questao.peso) /
                        contarPalavrasChave(questao.palavrasChave)
                      )
                        .toFixed(2)
                        .replace(".", ",")}
                    </Text>
                  )}
                </>
              )}

              {questao.tipo === "calculo" && (
                <>
                  <Text style={styles.rotulo}>
                    Resposta esperada <Text style={styles.obrigatorio}>*</Text>
                  </Text>
                  <TextInput
                    value={questao.respostaEsperada}
                    onChangeText={(v) =>
                      atualizarQuestao(questao.id, "respostaEsperada", v)
                    }
                    placeholder="Ex: 3 g por hora"
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.campoTexto}
                  />
                  <Text style={styles.dica}>
                    A IA confere o resultado e também o caminho. Se o aluno
                    acerta o resultado por caminho errado, ela dá nota parcial e
                    explica.
                  </Text>
                </>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.botaoAdicionarQuestao}
            onPress={adicionarQuestao}
          >
            <Ionicons name="add" size={18} color={COR.marcador} />
            <Text style={styles.botaoAdicionarQuestaoTexto}>
              Adicionar questão
            </Text>
          </TouchableOpacity>

          <View style={[styles.acoesFinais, ehDesktop && styles.acoesFinaisDesktop]}>
            {!emEdicao && (
              <TouchableOpacity
                style={[styles.botaoRascunho, ehDesktop && styles.botaoRascunhoDesktop]}
              >
                <Text style={styles.botaoRascunhoTexto} numberOfLines={1}>
                  Salvar rascunho
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.botaoPublicar, ehDesktop && styles.botaoPublicarDesktop]}
              onPress={publicarAtividade}
              disabled={salvando}
            >
              <Text style={styles.botaoPublicarTexto} numberOfLines={1}>
                {salvando ? "Salvando..." : emEdicao ? "Salvar alterações" : "Publicar atividade"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={modalTurmaAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTurmaAberto(false)}
      >
        <View style={styles.modalTurmaFundo}>
          <View style={styles.modalTurmaCard}>
            <Text style={styles.modalTurmaTitulo}>Selecione a turma</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {turmas.map((t) => (
                <TouchableOpacity
                  key={t.id_turma}
                  style={styles.modalTurmaItem}
                  onPress={() => {
                    setTurmaSelecionada(t);
                    setModalTurmaAberto(false);
                  }}
                >
                  <Text style={styles.modalTurmaItemTexto}>{t.nome}</Text>
                  {t.escola ? (
                    <Text style={styles.modalTurmaItemEscola}>{t.escola}</Text>
                  ) : null}
                </TouchableOpacity>
              ))}
              {turmas.length === 0 && (
                <Text style={{ color: "#94A3B8", padding: 12 }}>
                  Nenhuma turma cadastrada ainda.
                </Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalTurmaFechar}
              onPress={() => setModalTurmaAberto(false)}
            >
              <Text style={styles.modalTurmaFecharTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 60, alignItems: "center" },
  conteudoInternoDesktop: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 60,
  },
  miolo: { width: "92%", maxWidth: 760 },

  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 22,
  },
  tituloPagina: {
    fontFamily: FONTE.bold,
    fontSize: 18,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  tituloPaginaDesktop: {
    fontFamily: FONTE.bold,
    fontSize: 22,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  secaoCard: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    marginBottom: 16,
  },
  secaoCardDesktop: { padding: 24, marginBottom: 18 },
  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  secaoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 14.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },

  questaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  numeroQuestao: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "700",
    color: COR.marcador,
  },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 14,
    marginBottom: 6,
  },
  rotuloApoio: {
    fontFamily: FONTE.regular,
    fontWeight: "400",
    color: COR.tintaFraca,
  },
  obrigatorio: { color: COR.perigo },

  campoTexto: {
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
    backgroundColor: COR.branco,
  },
  campoTextoArea: { minHeight: 72, textAlignVertical: "top" },
  campoPeso: { width: 110 },

  campoSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COR.branco,
  },
  campoSelectTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaForte,
  },
  campoSelectPlaceholder: { fontSize: 13, color: "#94A3B8" },
  campoSelectValor: { fontSize: 13, color: "#0B1E3D", fontWeight: "600" },

  avisoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    backgroundColor: COR.emAndamentoFundo,
    borderRadius: RAIO.superficie,
    padding: 14,
    marginBottom: 20,
  },
  avisoTextos: { flex: 1 },
  avisoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "700",
    color: COR.marinho,
  },
  avisoDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
    marginTop: 2,
    lineHeight: 15,
  },

  tiposGrade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipoPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
  },
  tipoPillAtivo: { backgroundColor: COR.marinho, borderColor: COR.marinho },
  tipoPillTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
  },
  tipoPillTextoAtivo: { color: COR.branco },

  alternativaLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COR.linha,
    flexShrink: 0,
  },
  radioAtivo: { borderWidth: 6, borderColor: COR.ok },
  alternativaLetra: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
    color: COR.tintaMedia,
    width: 22,
    flexShrink: 0,
  },
  alternativaCampo: { flex: 1 },
  linkPequeno: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    fontWeight: "600",
    color: COR.marcador,
    marginTop: 4,
  },

  dica: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 6,
    lineHeight: 16,
  },
  dicaForte: {
    fontFamily: FONTE.semi,
    fontSize: 11.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 4,
  },

  botaoAdicionarQuestao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderStyle: "dashed",
    borderRadius: RAIO.superficie,
    paddingVertical: 14,
    marginBottom: 16,
  },
  botaoAdicionarQuestaoTexto: {
    color: COR.marcador,
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
  },

  totalCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 16,
    marginBottom: 18,
  },
  totalRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
  },
  totalValor: {
    fontFamily: FONTE.bold,
    fontSize: 20,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  totalSelo: {
    backgroundColor: COR.avisoFundo,
    borderRadius: RAIO.etiqueta,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalSeloTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12,
    fontWeight: "600",
    color: COR.avisoTexto,
  },

  acoesFinais: { flexDirection: "row", gap: 12, width: "100%" },
  acoesFinaisDesktop: {
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: COR.linha,
    paddingTop: 22,
  },
  botaoPublicar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: RAIO.superficie,
    backgroundColor: COR.marinho,
  },
  botaoPublicarDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    paddingHorizontal: 32,
  },
  botaoPublicarTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },

  modalTurmaFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalTurmaCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  modalTurmaTitulo: { fontSize: 15, fontWeight: "700", color: "#0B1E3D", marginBottom: 10 },
  modalTurmaItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTurmaItemTexto: { fontSize: 14, fontWeight: "600", color: "#0B1E3D" },
  modalTurmaItemEscola: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
  modalTurmaFechar: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  modalTurmaFecharTexto: { fontSize: 13.5, fontWeight: "700", color: "#64748B" },
});