import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE } from "../../components/estilo";
import {
  ajustarResposta,
  buscarCorrecao,
  concluirCorrecao,
} from "../../constants/api";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

function formatarNota(valor) {
  return Number(valor ?? 0)
    .toFixed(1)
    .replace(".", ",");
}

function formatarPeso(valor) {
  return Number(valor ?? 0)
    .toFixed(2)
    .replace(".", ",");
}

function palavrasDoGabarito(texto) {
  return String(texto || "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Os botões de nota saem da própria questão, não de uma régua fixa.
//
// Numa dissertativa de 5 palavras-chave, o servidor só consegue produzir 0/5,
// 1/5 ... 5/5. Se os botões fossem 0%, 25%, 50%, 75%, 100%, quase nenhuma nota
// da IA cairia em cima de um deles, e a professora veria todas as questões
// "fora da régua" — parecendo erro quando não é.
// ---------------------------------------------------------------------------
function opcoesDeNota(resposta) {
  if (resposta.tipo === "alternativa") {
    return [
      { fracao: 0, rotulo: "Errou" },
      { fracao: 1, rotulo: "Acertou" },
    ];
  }

  if (resposta.tipo === "calculo") {
    return [
      { fracao: 0, rotulo: "Errou" },
      { fracao: 0.5, rotulo: "Meio certo" },
      { fracao: 1, rotulo: "Certo" },
    ];
  }

  const total = palavrasDoGabarito(resposta.resposta_correta);

  // Gabarito sem palavras-chave separadas, ou com um número grande demais para
  // virar botão: cai numa régua simples.
  if (total < 2 || total > 8) {
    return [0, 0.25, 0.5, 0.75, 1].map((fracao) => ({
      fracao,
      rotulo: `${Math.round(fracao * 100)}%`,
    }));
  }

  return Array.from({ length: total + 1 }, (_, i) => ({
    fracao: i / total,
    rotulo: `${i} de ${total}`,
  }));
}

// Qual botão fica marcado. Tolerância porque 2.8 vindo do banco como Decimal
// nunca bate exato com 0.8 × 3.5 em ponto flutuante.
function fracaoAtual(nota, peso, opcoes) {
  if (!peso) return null;
  const bruta = nota / peso;
  const perto = opcoes.find((o) => Math.abs(o.fracao - bruta) < 0.005);
  return perto ? perto.fracao : null;
}

export default function Revisar() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const params = useLocalSearchParams();

  const id_correcao = params.id_correcao;

  const [correcao, setCorrecao] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [salvandoId, setSalvandoId] = useState(null);
  const [observacao, setObservacao] = useState("");
  const [fechando, setFechando] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        if (!id_correcao) {
          setErro("Nenhuma correção foi indicada.");
          setCarregando(false);
          return;
        }

        setCarregando(true);
        setErro("");

        try {
          const dados = await buscarCorrecao(id_correcao);
          if (!ativo) return;
          setCorrecao(dados);
          setObservacao(dados.observacao || "");
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
    }, [id_correcao]),
  );

  const concluida = correcao?.status === "concluida";

  // -------------------------------------------------------------------------
  // O professor discorda da IA numa questão.
  //
  // A nota nova não é calculada aqui: mandamos o valor e o servidor devolve o
  // total recalculado. Se a tela somasse por conta própria, o número na tela e
  // o número no banco poderiam divergir sem ninguém perceber.
  // -------------------------------------------------------------------------
  async function mudarNota(resposta, fracao) {
    if (concluida || salvandoId) return;

    const novaNota = Number((resposta.peso * fracao).toFixed(2));
    if (Math.abs(novaNota - resposta.nota) < 0.001) return;

    setSalvandoId(resposta.id_resposta);
    setErro("");

    try {
      const retorno = await ajustarResposta(
        id_correcao,
        resposta.id_resposta,
        novaNota,
      );

      setCorrecao((atual) => ({
        ...atual,
        nota: retorno.nota_total,
        respostas: atual.respostas.map((r) =>
          r.id_resposta === resposta.id_resposta
            ? { ...r, nota: retorno.nota, ajustado_manualmente: true }
            : r,
        ),
        ajustadas: atual.respostas.filter(
          (r) =>
            r.ajustado_manualmente || r.id_resposta === resposta.id_resposta,
        ).length,
      }));
    } catch (e) {
      setErro(e.message);
    } finally {
      setSalvandoId(null);
    }
  }

  async function fechar(reabrir) {
    if (fechando) return;
    setFechando(true);
    setErro("");

    try {
      const dados = await concluirCorrecao(id_correcao, {
        observacao,
        reabrir,
      });
      setCorrecao(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setFechando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <ActivityIndicator color={COR.marcador} />
          <Text
            style={[
              styles.carregandoTexto,
              ehDesktop && styles.carregandoTextoDesktop,
            ]}
          >
            Abrindo a correção...
          </Text>
        </View>
      </View>
    );
  }

  if (erro && !correcao) {
    return (
      <View style={styles.tela}>
        {!ehDesktop && <CabecalhoMobile />}
        <View style={styles.centro}>
          <Ionicons
            name="alert-circle-outline"
            size={ehDesktop ? 46 : 38}
            color={COR.avisoTexto}
          />
          <Text
            style={[
              styles.carregandoTexto,
              ehDesktop && styles.carregandoTextoDesktop,
            ]}
          >
            {erro}
          </Text>
          <TouchableOpacity
            style={[
              styles.botaoSecundarioLargo,
              ehDesktop && styles.botaoSecundarioLargoDesktop,
            ]}
            activeOpacity={0.85}
            onPress={() => router.replace("/correcoes")}
          >
            <Text
              style={[
                styles.botaoSecundarioTexto,
                ehDesktop && styles.botaoSecundarioTextoDesktop,
              ]}
            >
              Ver correções
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          <TouchableOpacity
            style={styles.voltarLinha}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={ehDesktop ? 21 : 18}
              color={COR.tintaMedia}
            />
            <Text
              style={[styles.voltarTexto, ehDesktop && styles.voltarTextoDesktop]}
            >
              Voltar
            </Text>
          </TouchableOpacity>

          {/* ---------------------------------------------------------- topo */}
          <View style={[styles.cartaoTopo, ehDesktop && styles.cartaoDesktop]}>
            <View style={styles.topoLinha}>
              <View style={styles.topoTextos}>
                <Text
                  style={[styles.nomeAluno, ehDesktop && styles.nomeAlunoDesktop]}
                >
                  {correcao.aluno?.nome || "Aluno"}
                </Text>
                <Text
                  style={[styles.subtitulo, ehDesktop && styles.subtituloDesktop]}
                >
                  {correcao.atividade?.nome}
                  {correcao.atividade?.turma
                    ? ` · ${correcao.atividade.turma}`
                    : ""}
                </Text>
              </View>

              <View style={styles.notaBloco}>
                <Text
                  style={[styles.notaGrande, ehDesktop && styles.notaGrandeDesktop]}
                >
                  {formatarNota(correcao.nota)}
                </Text>
                <Text style={[styles.notaDe, ehDesktop && styles.notaDeDesktop]}>
                  de {formatarNota(correcao.peso_total)}
                </Text>
              </View>
            </View>

            <View style={styles.etiquetasLinha}>
              <View
                style={[
                  styles.etiqueta,
                  ehDesktop && styles.etiquetaDesktop,
                  concluida ? styles.etiquetaOk : styles.etiquetaAberta,
                ]}
              >
                <Ionicons
                  name={concluida ? "checkmark-done" : "time-outline"}
                  size={ehDesktop ? 14 : 12}
                  color={concluida ? COR.ok : COR.marcador}
                />
                <Text
                  style={[
                    styles.etiquetaTexto,
                    ehDesktop && styles.etiquetaTextoDesktop,
                    { color: concluida ? COR.ok : COR.marcador },
                  ]}
                >
                  {concluida ? "Concluída" : "Em revisão"}
                </Text>
              </View>

              {correcao.ajustadas > 0 && (
                <View
                  style={[
                    styles.etiqueta,
                    ehDesktop && styles.etiquetaDesktop,
                    styles.etiquetaAviso,
                  ]}
                >
                  <Ionicons
                    name="create-outline"
                    size={ehDesktop ? 14 : 12}
                    color={COR.avisoTexto}
                  />
                  <Text
                    style={[
                      styles.etiquetaTexto,
                      ehDesktop && styles.etiquetaTextoDesktop,
                      { color: COR.avisoTexto },
                    ]}
                  >
                    {correcao.ajustadas === 1
                      ? "1 nota ajustada por você"
                      : `${correcao.ajustadas} notas ajustadas por você`}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Concluída = tudo travado. O botão que destrava também existe no
              rodapé, mas depois de rolar todas as questões ninguém acha. */}
          {concluida && (
            <View
              style={[
                styles.avisoTrancado,
                ehDesktop && styles.avisoTrancadoDesktop,
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={ehDesktop ? 17 : 15}
                color={COR.avisoTexto}
              />
              <Text
                style={[
                  styles.avisoTrancadoTexto,
                  ehDesktop && styles.avisoTrancadoTextoDesktop,
                ]}
              >
                Correção concluída — as notas estão travadas.
              </Text>
              <TouchableOpacity
                style={[
                  styles.avisoTrancadoBotao,
                  ehDesktop && styles.avisoTrancadoBotaoDesktop,
                ]}
                activeOpacity={0.85}
                disabled={fechando}
                onPress={() => fechar(true)}
              >
                <Text
                  style={[
                    styles.avisoTrancadoBotaoTexto,
                    ehDesktop && styles.avisoTrancadoBotaoTextoDesktop,
                  ]}
                >
                  {fechando ? "Reabrindo..." : "Reabrir para editar"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {!!erro && (
            <Text style={[styles.erroFaixa, ehDesktop && styles.erroFaixaDesktop]}>
              {erro}
            </Text>
          )}

          {/* ------------------------------------------------------- questões */}
          {correcao.respostas.map((resposta) => {
            const opcoes = opcoesDeNota(resposta);
            const marcada = fracaoAtual(resposta.nota, resposta.peso, opcoes);
            const salvandoEsta = salvandoId === resposta.id_resposta;

            return (
              <View
                key={resposta.id_resposta}
                style={[styles.cartaoQuestao, ehDesktop && styles.cartaoDesktop]}
              >
                <View style={styles.questaoCabecalho}>
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
                      {resposta.numero}
                    </Text>
                  </View>
                  <Text
                    style={[styles.pergunta, ehDesktop && styles.perguntaDesktop]}
                  >
                    {resposta.pergunta}
                  </Text>
                  <Text
                    style={[
                      styles.notaQuestao,
                      ehDesktop && styles.notaQuestaoDesktop,
                    ]}
                  >
                    {formatarPeso(resposta.nota)}
                    <Text
                      style={[
                        styles.notaQuestaoPeso,
                        ehDesktop && styles.notaQuestaoPesoDesktop,
                      ]}
                    >
                      {" "}
                      / {formatarPeso(resposta.peso)}
                    </Text>
                  </Text>
                </View>

                {/* O que a IA leu na folha. É o que permite conferir se ela leu
                    certo antes de discutir a nota. */}
                <View
                  style={[
                    styles.blocoLeitura,
                    ehDesktop && styles.blocoLeituraDesktop,
                  ]}
                >
                  <Text
                    style={[
                      styles.rotuloBloco,
                      ehDesktop && styles.rotuloBlocoDesktop,
                    ]}
                  >
                    O que a IA leu na folha
                  </Text>
                  <Text
                    style={[
                      styles.textoLeitura,
                      ehDesktop && styles.textoLeituraDesktop,
                    ]}
                  >
                    {resposta.resposta?.trim()
                      ? resposta.resposta
                      : "— nada foi lido nesta questão —"}
                  </Text>
                </View>

                {!!resposta.comentario && (
                  <View style={styles.blocoConta}>
                    <Ionicons
                      name="calculator-outline"
                      size={ehDesktop ? 15 : 13}
                      color={COR.tintaFraca}
                    />
                    <Text
                      style={[
                        styles.textoConta,
                        ehDesktop && styles.textoContaDesktop,
                      ]}
                    >
                      {resposta.comentario}
                    </Text>
                  </View>
                )}

                {!!resposta.resposta_correta && (
                  <View style={styles.blocoGabarito}>
                    <Text
                      style={[
                        styles.rotuloBloco,
                        ehDesktop && styles.rotuloBlocoDesktop,
                      ]}
                    >
                      Gabarito
                    </Text>
                    <Text
                      style={[
                        styles.textoGabarito,
                        ehDesktop && styles.textoGabaritoDesktop,
                      ]}
                    >
                      {resposta.resposta_correta}
                    </Text>
                  </View>
                )}

                <View
                  style={[styles.ajusteArea, ehDesktop && styles.ajusteAreaDesktop]}
                >
                  <Text
                    style={[
                      styles.rotuloBloco,
                      ehDesktop && styles.rotuloBlocoDesktop,
                    ]}
                  >
                    {concluida ? "Nota final" : "Discorda? Ajuste a nota"}
                  </Text>

                  <View style={styles.fracoesLinha}>
                    {opcoes.map((opcao) => {
                      const ativa = marcada === opcao.fracao;
                      const valor = Number(
                        (resposta.peso * opcao.fracao).toFixed(2),
                      );

                      return (
                        <TouchableOpacity
                          key={opcao.rotulo}
                          style={[
                            styles.botaoFracao,
                            ehDesktop && styles.botaoFracaoDesktop,
                            ativa && styles.botaoFracaoAtivo,
                            (concluida || salvandoEsta) && styles.desativado,
                          ]}
                          activeOpacity={0.8}
                          disabled={concluida || !!salvandoId}
                          onPress={() => mudarNota(resposta, opcao.fracao)}
                        >
                          <Text
                            style={[
                              styles.botaoFracaoTexto,
                              ehDesktop && styles.botaoFracaoTextoDesktop,
                              ativa && styles.botaoFracaoTextoAtivo,
                            ]}
                          >
                            {formatarPeso(valor)}
                          </Text>
                          <Text
                            style={[
                              styles.botaoFracaoRotulo,
                              ehDesktop && styles.botaoFracaoRotuloDesktop,
                              ativa && styles.botaoFracaoTextoAtivo,
                            ]}
                          >
                            {opcao.rotulo}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {marcada === null && (
                    <Text
                      style={[
                        styles.avisoFracao,
                        ehDesktop && styles.avisoFracaoDesktop,
                      ]}
                    >
                      A nota atual é {formatarPeso(resposta.nota)}, que não cai
                      em nenhum desses valores. Tocar em um deles substitui a
                      nota.
                    </Text>
                  )}

                  {resposta.ajustado_manualmente && (
                    <Text
                      style={[
                        styles.marcaAjustada,
                        ehDesktop && styles.marcaAjustadaDesktop,
                      ]}
                    >
                      nota ajustada por você
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* ------------------------------------------------------ rodapé */}
          <View style={[styles.cartaoRodape, ehDesktop && styles.cartaoDesktop]}>
            <Text
              style={[styles.rotuloBloco, ehDesktop && styles.rotuloBlocoDesktop]}
            >
              Observação para o aluno
            </Text>
            <TextInput
              value={observacao}
              onChangeText={setObservacao}
              editable={!concluida}
              placeholder="Opcional. Ex.: revise a questão 3 antes da prova."
              placeholderTextColor={COR.tintaFraca}
              multiline
              style={[
                styles.campoObservacao,
                ehDesktop && styles.campoObservacaoDesktop,
                concluida && styles.desativado,
              ]}
            />

            {concluida ? (
              <TouchableOpacity
                style={[
                  styles.botaoSecundarioLargo,
                  ehDesktop && styles.botaoSecundarioLargoDesktop,
                ]}
                activeOpacity={0.85}
                disabled={fechando}
                onPress={() => fechar(true)}
              >
                <Ionicons
                  name="lock-open-outline"
                  size={ehDesktop ? 18 : 16}
                  color={COR.marcador}
                />
                <Text
                  style={[
                    styles.botaoSecundarioTexto,
                    ehDesktop && styles.botaoSecundarioTextoDesktop,
                  ]}
                >
                  {fechando ? "Reabrindo..." : "Reabrir para editar"}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.botaoConcluir,
                  ehDesktop && styles.botaoConcluirDesktop,
                ]}
                activeOpacity={0.85}
                disabled={fechando}
                onPress={() => fechar(false)}
              >
                <Ionicons
                  name="checkmark-done"
                  size={ehDesktop ? 19 : 17}
                  color={COR.branco}
                />
                <Text
                  style={[
                    styles.botaoConcluirTexto,
                    ehDesktop && styles.botaoConcluirTextoDesktop,
                  ]}
                >
                  {fechando ? "Salvando..." : "Concluir correção"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Navegação, não ação: por isso sem borda, para não competir com
                o botão de cima. */}
            <TouchableOpacity
              style={styles.linkCorrecoes}
              activeOpacity={0.7}
              onPress={() => router.replace("/correcoes")}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={ehDesktop ? 17 : 15}
                color={COR.marcador}
              />
              <Text
                style={[
                  styles.linkCorrecoesTexto,
                  ehDesktop && styles.linkCorrecoesTextoDesktop,
                ]}
              >
                Ir para correções
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// AUMENTO_DESKTOP
//
// Tudo que cresce no web mora aqui, e em lugar nenhum mais. Na tela cada
// estilo entra empilhado por cima do compartilhado:
//
//   [styles.nomeAluno, ehDesktop && styles.nomeAlunoDesktop]
//
// O primeiro define, o segundo corrige, e o celular não passa por aqui — é a
// mesma montagem da Home, do Perfil, das Correções e do Editar. Se algum
// tamanho ficar errado no web, é só este bloco que se mexe.
// ---------------------------------------------------------------------------
const AUMENTO_DESKTOP = {
  conteudoInternoDesktop: {
    padding: 34,
    paddingBottom: 60,
    alignItems: "center",
    gap: 16,
  },

  carregandoTextoDesktop: { fontSize: 15, lineHeight: 22 },

  voltarTextoDesktop: { fontSize: 15 },

  // Vale para os três cartões: topo, questão e rodapé.
  cartaoDesktop: { padding: 24, borderRadius: 18, gap: 16 },

  nomeAlunoDesktop: { fontSize: 22 },
  subtituloDesktop: { fontSize: 14 },
  notaGrandeDesktop: { fontSize: 44 },
  notaDeDesktop: { fontSize: 13 },

  etiquetaDesktop: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  etiquetaTextoDesktop: { fontSize: 12.5 },

  avisoTrancadoDesktop: { paddingVertical: 15, paddingHorizontal: 18, gap: 10 },
  avisoTrancadoTextoDesktop: { fontSize: 13.5 },
  avisoTrancadoBotaoDesktop: { paddingVertical: 9, paddingHorizontal: 15 },
  avisoTrancadoBotaoTextoDesktop: { fontSize: 13 },

  erroFaixaDesktop: { fontSize: 13.5, padding: 15 },

  numeroCirculoDesktop: { width: 32, height: 32, borderRadius: 16 },
  numeroTextoDesktop: { fontSize: 14 },
  perguntaDesktop: { fontSize: 15.5, lineHeight: 22 },
  notaQuestaoDesktop: { fontSize: 16.5 },
  notaQuestaoPesoDesktop: { fontSize: 13 },

  rotuloBlocoDesktop: { fontSize: 11.5 },
  blocoLeituraDesktop: {
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 6,
  },
  textoLeituraDesktop: { fontSize: 14.5, lineHeight: 21 },
  textoContaDesktop: { fontSize: 13 },
  textoGabaritoDesktop: { fontSize: 13, lineHeight: 19 },

  ajusteAreaDesktop: { paddingTop: 18, gap: 10 },
  botaoFracaoDesktop: {
    minWidth: 68,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 11,
  },
  botaoFracaoTextoDesktop: { fontSize: 14.5 },
  botaoFracaoRotuloDesktop: { fontSize: 11, marginTop: 2 },
  avisoFracaoDesktop: { fontSize: 12, lineHeight: 17 },
  marcaAjustadaDesktop: { fontSize: 11.5 },

  campoObservacaoDesktop: {
    fontSize: 14.5,
    padding: 14,
    minHeight: 92,
    borderRadius: 12,
  },
  botaoConcluirDesktop: { paddingVertical: 17, borderRadius: 14, gap: 10 },
  botaoConcluirTextoDesktop: { fontSize: 16 },
  botaoSecundarioLargoDesktop: { paddingVertical: 16, borderRadius: 14 },
  botaoSecundarioTextoDesktop: { fontSize: 15 },
  linkCorrecoesTextoDesktop: { fontSize: 14.5 },
};

const styles = StyleSheet.create({
  ...AUMENTO_DESKTOP,

  tela: { flex: 1, backgroundColor: COR.fundo },
  centro: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 30,
  },
  carregandoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    textAlign: "center",
  },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 16, paddingBottom: 60, gap: 12 },
  miolo: { width: "100%", maxWidth: 860, gap: 16 },

  voltarLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 6,
  },
  voltarTexto: { fontFamily: FONTE.media, fontSize: 13, color: COR.tintaMedia },

  cartaoTopo: {
    backgroundColor: COR.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
    gap: 14,
  },
  topoLinha: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  topoTextos: { flex: 1, gap: 3 },
  nomeAluno: { fontFamily: FONTE.bold, fontSize: 17, color: COR.tintaForte },
  subtitulo: { fontFamily: FONTE.regular, fontSize: 12, color: COR.tintaFraca },
  notaBloco: { alignItems: "flex-end" },
  notaGrande: { fontFamily: FONTE.bold, fontSize: 32, color: COR.marinho },
  notaDe: { fontFamily: FONTE.regular, fontSize: 11, color: COR.tintaFraca },

  etiquetasLinha: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  etiqueta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  etiquetaAberta: { backgroundColor: COR.emAndamentoFundo },
  etiquetaOk: { backgroundColor: COR.okFundo },
  etiquetaAviso: { backgroundColor: COR.avisoFundo },
  etiquetaTexto: { fontFamily: FONTE.semi, fontSize: 10.5 },

  avisoTrancado: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    backgroundColor: COR.avisoFundo,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  avisoTrancadoTexto: {
    flex: 1,
    minWidth: 160,
    fontFamily: FONTE.semi,
    fontSize: 12,
    color: COR.avisoTexto,
  },
  avisoTrancadoBotao: {
    backgroundColor: COR.branco,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COR.avisoTexto,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  avisoTrancadoBotaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    color: COR.avisoTexto,
  },

  erroFaixa: {
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: 10,
    padding: 12,
  },

  cartaoQuestao: {
    backgroundColor: COR.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
    gap: 14,
  },
  questaoCabecalho: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  numeroCirculo: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
  },
  numeroTexto: { fontFamily: FONTE.bold, fontSize: 12, color: COR.marcador },
  pergunta: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.tintaForte,
    lineHeight: 18,
  },
  notaQuestao: { fontFamily: FONTE.bold, fontSize: 14, color: COR.tintaForte },
  notaQuestaoPeso: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },

  rotuloBloco: {
    fontFamily: FONTE.semi,
    fontSize: 10,
    color: COR.tintaFraca,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  blocoLeitura: {
    gap: 5,
    backgroundColor: COR.fundo,
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COR.marcador,
  },
  textoLeitura: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaForte,
    lineHeight: 18,
  },

  blocoConta: { flexDirection: "row", alignItems: "center", gap: 6 },
  textoConta: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
  },

  blocoGabarito: { gap: 4 },
  textoGabarito: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaMedia,
    lineHeight: 16,
  },

  ajusteArea: {
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
    paddingTop: 14,
  },
  fracoesLinha: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  botaoFracao: {
    minWidth: 54,
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
  },
  botaoFracaoAtivo: { borderColor: COR.marinho, backgroundColor: COR.marinho },
  botaoFracaoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    color: COR.tintaForte,
  },
  botaoFracaoRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 9.5,
    color: COR.tintaFraca,
    marginTop: 1,
  },
  botaoFracaoTextoAtivo: { color: COR.branco },
  desativado: { opacity: 0.5 },
  avisoFracao: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
    lineHeight: 15,
  },
  marcaAjustada: { fontFamily: FONTE.semi, fontSize: 10, color: COR.avisoTexto },

  cartaoRodape: {
    backgroundColor: COR.branco,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
    gap: 10,
  },
  campoObservacao: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaForte,
    backgroundColor: COR.campo,
    borderRadius: 10,
    padding: 12,
    minHeight: 70,
    textAlignVertical: "top",
  },
  botaoConcluir: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COR.ok,
    borderRadius: 12,
    paddingVertical: 14,
  },
  botaoConcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    color: COR.branco,
  },
  botaoSecundarioLargo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: 12,
    paddingVertical: 13,
  },
  botaoSecundarioTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.marcador,
  },
  linkCorrecoes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 2,
  },
  linkCorrecoesTexto: {
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.marcador,
  },
});