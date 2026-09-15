import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { COR, FONTE, RAIO } from "../../components/estilo";
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

const TIPOS = [
  { valor: "multipla_escolha", rotulo: "Múltipla escolha" },
  { valor: "dissertativa", rotulo: "Dissertativa" },
  { valor: "calculo", rotulo: "Cálculo" },
];

const LETRAS = ["A", "B", "C", "D", "E"];

// API — GET /turmas
// A atividade pertence a UMA turma (atividade.id_turma é Int e obrigatório).
//
//   const [turmas, setTurmas] = useState([]);
//   useEffect(() => { listarTurmas().then(setTurmas); }, []);
const TURMAS = [
  { id_turma: 1, nome: "9º Ano A", escola: "E.E. Marechal Rondon" },
  { id_turma: 2, nome: "1ª Série B", escola: "E.E. Marechal Rondon" },
  { id_turma: 3, nome: "7º Ano C", escola: "Colégio Santa Clara" },
];

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

// O que vai em questao.resposta_correta muda conforme o tipo:
//   multipla_escolha -> a letra        ("B")
//   dissertativa     -> palavras-chave ("luz solar; água; oxigênio")
//   calculo          -> resultado      ("3 g por hora")
function respostaCorretaDe(questao) {
  if (questao.tipo === "multipla_escolha") return questao.letraCorreta;
  if (questao.tipo === "dissertativa") return questao.palavrasChave.trim();
  return questao.respostaEsperada.trim();
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

  const { modo, tituloInicial } = useLocalSearchParams();
  const emEdicao = modo === "editar";

  const [titulo, setTitulo] = useState(typeof tituloInicial === "string" ? tituloInicial : "");
  const [descricao, setDescricao] = useState("");
  const [turmaSelecionada, setTurmaSelecionada] = useState(null);
  const [seletorTurmaAberto, setSeletorTurmaAberto] = useState(false);
  const [questoes, setQuestoes] = useState([novaQuestao()]);

  const totalPontos = questoes.reduce((soma, q) => soma + comoNumero(q.peso), 0);

  function atualizarQuestao(id, campo, valor) {
    setQuestoes((atuais) => atuais.map((q) => (q.id === id ? { ...q, [campo]: valor } : q)));
  }

  function adicionarQuestao() {
    setQuestoes((atuais) => [...atuais, novaQuestao()]);
  }

  function removerQuestao(id) {
    setQuestoes((atuais) => (atuais.length === 1 ? atuais : atuais.filter((q) => q.id !== id)));
  }

  function atualizarAlternativa(idQuestao, letra, texto) {
    setQuestoes((atuais) =>
      atuais.map((q) =>
        q.id === idQuestao
          ? {
              ...q,
              alternativas: q.alternativas.map((a) => (a.letra === letra ? { ...a, texto } : a)),
            }
          : q
      )
    );
  }

  function adicionarAlternativa(idQuestao) {
    setQuestoes((atuais) =>
      atuais.map((q) => {
        if (q.id !== idQuestao || q.alternativas.length >= LETRAS.length) return q;
        return {
          ...q,
          alternativas: [...q.alternativas, { letra: LETRAS[q.alternativas.length], texto: "" }],
        };
      })
    );
  }

  // Ao remover, as letras são renumeradas: se sair a B, a antiga C vira B.
  function removerAlternativa(idQuestao, letra) {
    setQuestoes((atuais) =>
      atuais.map((q) => {
        if (q.id !== idQuestao || q.alternativas.length <= 2) return q;
        const restantes = q.alternativas
          .filter((a) => a.letra !== letra)
          .map((a, i) => ({ ...a, letra: LETRAS[i] }));
        return {
          ...q,
          alternativas: restantes,
          letraCorreta: q.letraCorreta === letra ? "" : q.letraCorreta,
        };
      })
    );
  }

  // ---------------------------------------------------------------------
  // API — POST /atividades  e depois  POST /atividades/:id/questoes
  //
  // Em duas etapas: a atividade precisa existir antes de as questões terem
  // um id_atividade pra apontar.
  //
  //   async function publicar() {
  //     const atividade = await criarAtividade(titulo, descricao, turmaSelecionada.id_turma);
  //
  //     const corpo = questoes.map((q, i) => ({
  //       numero: i + 1,
  //       pergunta: q.enunciado,
  //       tipo: q.tipo,
  //       resposta_correta: respostaCorretaDe(q),
  //       peso: comoNumero(q.peso),
  //       alternativas:
  //         q.tipo === "multipla_escolha"
  //           ? q.alternativas.filter((a) => a.texto.trim())
  //           : [],
  //     }));
  //
  //     await fetch(`${API_URL}/atividades/${atividade.id_atividade}/questoes`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  //       body: JSON.stringify({ questoes: corpo }),
  //     });
  //
  //     router.replace("/atividades");
  //   }
  // ---------------------------------------------------------------------

  return (
    <View style={styles.tela}>
      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[styles.conteudoInterno, ehDesktop && styles.conteudoInternoDesktop]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
            <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
            <Text style={ehDesktop ? styles.tituloPaginaDesktop : styles.tituloPagina}>
              {emEdicao ? "Editar atividade" : "Criar atividade"}
            </Text>
          </TouchableOpacity>

          <View style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}>
            <View style={styles.secaoCabecalho}>
              <View style={styles.checkboxDecorativo} />
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

            <Text style={styles.rotulo}>Descrição</Text>
            <TextInput
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Avaliação bimestral sobre processos das plantas"
              placeholderTextColor={COR.tintaFraca}
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>
              Turma <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TouchableOpacity
              style={styles.campoSelect}
              activeOpacity={0.7}
              onPress={() => setSeletorTurmaAberto(true)}
            >
              <Text style={turmaSelecionada ? styles.campoSelectTexto : styles.campoSelectPlaceholder}>
                {turmaSelecionada
                  ? `${turmaSelecionada.nome} · ${turmaSelecionada.escola}`
                  : "Selecione a turma"}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COR.tintaMedia} />
            </TouchableOpacity>
          </View>

          <View style={styles.avisoBox}>
            <Ionicons name="information-circle" size={18} color={COR.marcador} />
            <View style={styles.avisoTextos}>
              <Text style={styles.avisoTitulo}>Isto é o gabarito</Text>
              <Text style={styles.avisoDescricao}>
                A IA corrige as folhas escaneadas comparando com o que você preencher aqui.
              </Text>
            </View>
          </View>

          {questoes.map((questao, indice) => (
            <View key={questao.id} style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}>
              <View style={styles.questaoCabecalho}>
                <Text style={styles.numeroQuestao}>QUESTÃO {indice + 1}</Text>
                {questoes.length > 1 && (
                  <TouchableOpacity onPress={() => removerQuestao(questao.id)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={16} color={COR.tintaFraca} />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.rotulo}>
                Enunciado <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <TextInput
                value={questao.enunciado}
                onChangeText={(v) => atualizarQuestao(questao.id, "enunciado", v)}
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
                      onPress={() => atualizarQuestao(questao.id, "tipo", tipo.valor)}
                      style={[styles.tipoPill, selecionado && styles.tipoPillAtivo]}
                    >
                      <Text style={[styles.tipoPillTexto, selecionado && styles.tipoPillTextoAtivo]}>
                        {tipo.rotulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* O campo daqui pra baixo muda conforme o tipo. Só um aparece. */}

              {questao.tipo === "multipla_escolha" && (
                <>
                  <Text style={styles.rotulo}>
                    Alternativas <Text style={styles.obrigatorio}>*</Text>{" "}
                    <Text style={styles.rotuloApoio}>— marque a correta</Text>
                  </Text>

                  {questao.alternativas.map((alternativa) => {
                    const correta = questao.letraCorreta === alternativa.letra;
                    return (
                      <View key={alternativa.letra} style={styles.alternativaLinha}>
                        <TouchableOpacity
                          onPress={() => atualizarQuestao(questao.id, "letraCorreta", alternativa.letra)}
                          hitSlop={6}
                          style={[styles.radio, correta && styles.radioAtivo]}
                        />
                        <Text style={styles.alternativaLetra}>{alternativa.letra})</Text>
                        <TextInput
                          value={alternativa.texto}
                          onChangeText={(v) => atualizarAlternativa(questao.id, alternativa.letra, v)}
                          placeholder="Texto da alternativa"
                          placeholderTextColor={COR.tintaFraca}
                          style={[styles.campoTexto, styles.alternativaCampo]}
                        />
                        {questao.alternativas.length > 2 && (
                          <TouchableOpacity
                            onPress={() => removerAlternativa(questao.id, alternativa.letra)}
                            hitSlop={8}
                          >
                            <Ionicons name="close" size={15} color={COR.chevron} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}

                  {questao.alternativas.length < LETRAS.length && (
                    <TouchableOpacity onPress={() => adicionarAlternativa(questao.id)}>
                      <Text style={styles.linkPequeno}>+ Adicionar alternativa</Text>
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
                    onChangeText={(v) => atualizarQuestao(questao.id, "palavrasChave", v)}
                    placeholder="luz solar; gás carbônico; água; glicose; oxigênio"
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.campoTexto}
                  />
                  <Text style={styles.dica}>
                    Separe por ponto e vírgula. A IA conta quantas o aluno expressou — mesmo com
                    outras palavras ("H2O" vale por "água") — e a nota é essa fração do peso.
                  </Text>
                  {contarPalavrasChave(questao.palavrasChave) > 0 && (
                    <Text style={styles.dicaForte}>
                      {contarPalavrasChave(questao.palavrasChave)} palavras · cada uma vale{" "}
                      {(comoNumero(questao.peso) / contarPalavrasChave(questao.palavrasChave))
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
                    onChangeText={(v) => atualizarQuestao(questao.id, "respostaEsperada", v)}
                    placeholder="Ex: 3 g por hora"
                    placeholderTextColor={COR.tintaFraca}
                    style={styles.campoTexto}
                  />
                  <Text style={styles.dica}>
                    A IA confere o resultado e também o caminho. Se o aluno acerta o resultado por
                    caminho errado, ela dá nota parcial e explica.
                  </Text>
                </>
              )}
            </View>
          ))}

          <TouchableOpacity style={styles.botaoAdicionarQuestao} onPress={adicionarQuestao}>
            <Ionicons name="add" size={18} color={COR.marcador} />
            <Text style={styles.botaoAdicionarQuestaoTexto}>Adicionar questão</Text>
          </TouchableOpacity>

          <View style={[styles.totalCard, ehDesktop && styles.secaoCardDesktop]}>
            <View>
              <Text style={styles.totalRotulo}>Total da atividade</Text>
              <Text style={styles.totalValor}>
                {totalPontos.toFixed(1).replace(".", ",")} pontos
              </Text>
            </View>
            <View style={styles.totalSelo}>
              <Text style={styles.totalSeloTexto}>
                {questoes.length} {questoes.length === 1 ? "questão" : "questões"}
              </Text>
            </View>
          </View>

          <View style={[styles.acoesFinais, ehDesktop && styles.acoesFinaisDesktop]}>
            <TouchableOpacity style={[styles.botaoPublicar, ehDesktop && styles.botaoPublicarDesktop]}>
              <Text style={styles.botaoPublicarTexto} numberOfLines={1}>
                {emEdicao ? "Salvar alterações" : "Publicar atividade"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={seletorTurmaAberto}
        transparent
        animationType="slide"
        onRequestClose={() => setSeletorTurmaAberto(false)}
      >
        <View style={[styles.modalFundo, !ehDesktop && styles.modalFundoMobile]}>
          <View style={[styles.modalCard, !ehDesktop && styles.modalCardMobile]}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>Escolha a turma</Text>
              <TouchableOpacity onPress={() => setSeletorTurmaAberto(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={COR.tintaMedia} />
              </TouchableOpacity>
            </View>

            {TURMAS.map((turma, indice) => {
              const escolhida = turmaSelecionada?.id_turma === turma.id_turma;
              return (
                <TouchableOpacity
                  key={turma.id_turma}
                  style={[styles.turmaOpcao, indice === TURMAS.length - 1 && styles.turmaOpcaoUltima]}
                  activeOpacity={0.6}
                  onPress={() => {
                    setTurmaSelecionada(turma);
                    setSeletorTurmaAberto(false);
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.turmaOpcaoNome}>{turma.nome}</Text>
                    <Text style={styles.turmaOpcaoEscola}>{turma.escola}</Text>
                  </View>
                  {escolhida && <Ionicons name="checkmark" size={18} color={COR.ok} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 60, alignItems: "center" },
  conteudoInternoDesktop: { alignItems: "center", paddingTop: 32, paddingBottom: 60 },
  miolo: { width: "92%", maxWidth: 760 },

  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 22 },
  tituloPagina: { fontFamily: FONTE.bold, fontSize: 18, fontWeight: "700", color: COR.tintaForte },
  tituloPaginaDesktop: { fontFamily: FONTE.bold, fontSize: 22, fontWeight: "700", color: COR.tintaForte },

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
  secaoCabecalho: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  checkboxDecorativo: {
    width: 18,
    height: 18,
    borderRadius: RAIO.etiqueta,
    borderWidth: 1.5,
    borderColor: COR.marcador,
  },
  secaoTitulo: { fontFamily: FONTE.bold, fontSize: 14.5, fontWeight: "700", color: COR.tintaForte },

  questaoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  numeroQuestao: { fontFamily: FONTE.bold, fontSize: 12.5, fontWeight: "700", color: COR.marcador },

  rotulo: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
    marginTop: 14,
    marginBottom: 6,
  },
  rotuloApoio: { fontFamily: FONTE.regular, fontWeight: "400", color: COR.tintaFraca },
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
  campoSelectTexto: { fontFamily: FONTE.regular, fontSize: 13, color: COR.tintaForte },
  campoSelectPlaceholder: { fontFamily: FONTE.regular, fontSize: 13, color: COR.tintaFraca },

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
  avisoTitulo: { fontFamily: FONTE.bold, fontSize: 12.5, fontWeight: "700", color: COR.marinho },
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
  tipoPillTexto: { fontFamily: FONTE.semi, fontSize: 12.5, fontWeight: "600", color: COR.tintaMedia },
  tipoPillTextoAtivo: { color: COR.branco },

  alternativaLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
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
  linkPequeno: { fontFamily: FONTE.semi, fontSize: 12, fontWeight: "600", color: COR.marcador, marginTop: 4 },

  dica: { fontFamily: FONTE.regular, fontSize: 11.5, color: COR.tintaFraca, marginTop: 6, lineHeight: 16 },
  dicaForte: { fontFamily: FONTE.semi, fontSize: 11.5, fontWeight: "600", color: COR.tintaMedia, marginTop: 4 },

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
  totalRotulo: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaFraca },
  totalValor: { fontFamily: FONTE.bold, fontSize: 20, fontWeight: "700", color: COR.tintaForte },
  totalSelo: {
    backgroundColor: COR.avisoFundo,
    borderRadius: RAIO.etiqueta,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  totalSeloTexto: { fontFamily: FONTE.semi, fontSize: 12, fontWeight: "600", color: COR.avisoTexto },

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
  botaoPublicarDesktop: { flexGrow: 0, flexShrink: 0, flexBasis: "auto", paddingHorizontal: 32 },
  botaoPublicarTexto: { fontFamily: FONTE.bold, fontSize: 13.5, fontWeight: "700", color: COR.branco },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(8,23,48,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalFundoMobile: { justifyContent: "flex-end", padding: 0 },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
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
    marginBottom: 10,
  },
  modalTitulo: { fontFamily: FONTE.semi, fontSize: 17, fontWeight: "600", color: COR.tintaForte },

  turmaOpcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  turmaOpcaoUltima: { borderBottomWidth: 0 },
  turmaOpcaoNome: { fontFamily: FONTE.semi, fontSize: 13.5, fontWeight: "600", color: COR.tintaForte },
  turmaOpcaoEscola: { fontFamily: FONTE.regular, fontSize: 11.5, color: COR.tintaFraca, marginTop: 2 },
});