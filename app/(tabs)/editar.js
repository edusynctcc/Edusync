import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";

const ABAS = [
  { chave: "resumo", rotulo: "Resumo", icone: "stats-chart-outline" },
  { chave: "pergunta", rotulo: "Pergunta", icone: "help-circle-outline" },
  { chave: "individual", rotulo: "Individual", icone: "person-outline" },
];

const ALUNOS = [
  { numero: "01", nome: "Ana Santos", nota: "8,5" },
  { numero: "02", nome: "Bruno Lima", nota: "7,5" },
  { numero: "03", nome: "Carlos Souza", nota: "4,0" },
  { numero: "04", nome: "Daniela Alves", nota: "6,0" },
  { numero: "05", nome: "Eduardo Ferreira", nota: "9,5" },
  { numero: "06", nome: "Fernanda Costa", nota: "7,0" },
  { numero: "07", nome: "Gabriel Martins", nota: "10,0" },
  { numero: "08", nome: "Isabella Oliveira", nota: "4,5" },
  { numero: "09", nome: "João Pedro", nota: "8,0" },
  { numero: "10", nome: "Juliana Rocha", nota: "-" },
  { numero: "11", nome: "Victória Akemi", nota: "-" },
  { numero: "12", nome: "Maria Antonieta", nota: "5,5" },
];

const QUESTOES = [
  {
    numero: 1,
    enunciado: "Resolução de equações do 1º grau",
    tipo: "Múltipla escolha",
    acertos: 11,
  },
  {
    numero: 2,
    enunciado: "Sistemas de equações lineares",
    tipo: "Múltipla escolha",
    acertos: 9,
  },
  {
    numero: 3,
    enunciado: "Função afim: gráfico e coeficientes",
    tipo: "Dissertativa",
    acertos: 7,
  },
  {
    numero: 4,
    enunciado: "Inequações do 1º grau",
    tipo: "Múltipla escolha",
    acertos: 8,
  },
  {
    numero: 5,
    enunciado: "Fatoração de expressões algébricas",
    tipo: "Dissertativa",
    acertos: 5,
  },
  {
    numero: 6,
    enunciado: "Produtos notáveis",
    tipo: "Múltipla escolha",
    acertos: 10,
  },
];

const TOTAL_ALUNOS = ALUNOS.length;

const OPCOES_PERCENTUAL_DISSERTATIVA = [0, 0.25, 0.5, 0.75, 1];

function corDaNota(nota) {
  if (nota === "-") return COR.tintaFraca;
  const valor = Number(nota.replace(",", "."));
  if (valor >= 7) return COR.ok;
  if (valor >= 5) return COR.avisoTexto;
  return COR.perigo;
}

function corFundoDaNota(nota) {
  if (nota === "-") return COR.linhaSuave;
  const valor = Number(nota.replace(",", "."));
  if (valor >= 7) return COR.okFundo;
  if (valor >= 5) return COR.avisoFundo;
  return COR.perigoFundo;
}

function corDoPercentual(percentual) {
  if (percentual >= 70) return COR.ok;
  if (percentual >= 40) return COR.avisoTexto;
  return COR.perigo;
}

function percentualAcerto(acertos) {
  return Math.round((acertos / TOTAL_ALUNOS) * 100);
}

function recalcularNota(respostas) {
  if (!respostas || respostas.every((r) => r === null)) return "-";
  const soma = respostas.reduce(
    (acumulado, valor) => acumulado + (valor ?? 0),
    0,
  );
  return ((soma / respostas.length) * 10).toFixed(1).replace(".", ",");
}

function respostasDoAluno(aluno) {
  if (aluno.nota === "-") return QUESTOES.map(() => null);

  let restante = (Number(aluno.nota.replace(",", ".")) / 10) * QUESTOES.length;

  return QUESTOES.map(() => {
    const valor = Math.min(1, Math.max(0, Number(restante.toFixed(2))));
    restante -= valor;
    return valor;
  });
}

function DetalheAluno({
  aluno,
  onAjustarResposta,
  onMudarObservacao,
  salvo,
  onSalvar,
}) {
  return (
    <>
      <View style={styles.detalheCabecalho}>
        <View style={styles.detalheAvatar}>
          <Text style={styles.detalheAvatarTexto}>{aluno.nome.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.detalheNome}>{aluno.nome}</Text>
          <Text style={styles.detalheTurma}>9º Ano A</Text>
        </View>
        <Text style={[styles.detalheNota, { color: corDaNota(aluno.nota) }]}>
          {aluno.nota}
        </Text>
      </View>

      {aluno.nota === "-" ? (
        <Text style={styles.detalheVazioTexto}>
          Essa prova ainda não foi corrigida para este aluno.
        </Text>
      ) : (
        <>
          <Text style={styles.ajusteDica}>
            Achou que a IA errou? Nas objetivas é só tocar; nas dissertativas dá
            pra escolher a nota parcial.
          </Text>

          <View style={styles.respostasLista}>
            {QUESTOES.map((questao, indice) => {
              const valor = aluno.respostas[indice];

              if (questao.tipo === "Dissertativa") {
                const percentual = Math.round(valor * 100);
                return (
                  <View key={questao.numero} style={styles.dissertativaItem}>
                    <View style={styles.dissertativaCabecalho}>
                      <Text style={styles.respostaTexto} numberOfLines={1}>
                        Questão {questao.numero} · {questao.enunciado}
                      </Text>
                      <Text
                        style={[
                          styles.dissertativaPercentual,
                          { color: corDoPercentual(percentual) },
                        ]}
                      >
                        {percentual}%
                      </Text>
                    </View>

                    <View style={styles.dissertativaOpcoes}>
                      {OPCOES_PERCENTUAL_DISSERTATIVA.map((opcao) => {
                        const ativo = Math.abs(valor - opcao) < 0.01;
                        const cor = corDoPercentual(Math.round(opcao * 100));
                        return (
                          <TouchableOpacity
                            key={opcao}
                            style={[
                              styles.dissertativaChip,
                              ativo && {
                                backgroundColor: cor,
                                borderColor: cor,
                              },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => onAjustarResposta(indice, opcao)}
                          >
                            <Text
                              style={[
                                styles.dissertativaChipTexto,
                                ativo && styles.dissertativaChipTextoAtivo,
                              ]}
                            >
                              {Math.round(opcao * 100)}%
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              }

              const acertou = valor >= 1;
              return (
                <TouchableOpacity
                  key={questao.numero}
                  style={styles.respostaItem}
                  activeOpacity={0.6}
                  onPress={() => onAjustarResposta(indice, acertou ? 0 : 1)}
                >
                  <View
                    style={[
                      styles.respostaIcone,
                      {
                        backgroundColor: acertou
                          ? COR.okFundo
                          : COR.perigoFundo,
                      },
                    ]}
                  >
                    <Ionicons
                      name={acertou ? "checkmark" : "close"}
                      size={14}
                      color={acertou ? COR.ok : COR.perigo}
                    />
                  </View>
                  <Text style={styles.respostaTexto} numberOfLines={1}>
                    Questão {questao.numero} · {questao.enunciado}
                  </Text>
                  <Ionicons
                    name="create-outline"
                    size={14}
                    color={COR.chevron}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      <View style={styles.observacoesBox}>
        <Text style={styles.observacoesTitulo}>Observações do professor</Text>
        <TextInput
          value={aluno.observacao}
          onChangeText={onMudarObservacao}
          placeholder="Escreva um comentário sobre o desempenho do aluno..."
          placeholderTextColor={COR.tintaFraca}
          style={styles.observacoesInput}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.botaoSalvar, salvo && styles.botaoSalvarFeito]}
        activeOpacity={0.85}
        onPress={onSalvar}
      >
        <Ionicons
          name={salvo ? "checkmark" : "save-outline"}
          size={15}
          color={COR.branco}
        />
        <Text style={styles.botaoSalvarTexto}>
          {salvo ? "Salvo!" : "Salvar"}
        </Text>
      </TouchableOpacity>
    </>
  );
}

export default function Editar() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();

  const [abaAtiva, setAbaAtiva] = useState("resumo");
  const [alunoSelecionadoNumero, setAlunoSelecionadoNumero] = useState(null);
  const [concluida, setConcluida] = useState(false);
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false);
  const [menuAtividadeAberto, setMenuAtividadeAberto] = useState(false);
  const [alunoRecemSalvo, setAlunoRecemSalvo] = useState(null);

  const [alunos, setAlunos] = useState(() =>
    ALUNOS.map((aluno) => ({
      ...aluno,
      respostas: respostasDoAluno(aluno),
      observacao: "",
    })),
  );

  const alunoSelecionado =
    alunos.find((a) => a.numero === alunoSelecionadoNumero) ?? null;

  const corrigidos = alunos.filter((a) => a.nota !== "-").length;
  const mediaTurma = corrigidos
    ? (
        alunos
          .filter((a) => a.nota !== "-")
          .reduce((soma, a) => soma + Number(a.nota.replace(",", ".")), 0) /
        corrigidos
      )
        .toFixed(1)
        .replace(".", ",")
    : "-";

  const ESTATISTICAS = [
    {
      valor: String(TOTAL_ALUNOS),
      rotulo: "alunos",
      icone: "people",
      cor: COR.marcador,
      fundo: COR.emAndamentoFundo,
    },
    {
      valor: mediaTurma,
      rotulo: "média da turma",
      icone: "checkmark-circle",
      cor: COR.ok,
      fundo: COR.okFundo,
    },
    {
      valor: String(corrigidos),
      rotulo: "corrigidos",
      icone: "ribbon",
      cor: COR.avisoTexto,
      fundo: COR.avisoFundo,
    },
  ];

  const questaoMaisDificil = QUESTOES.reduce(
    (maisDificil, questao) =>
      questao.acertos < maisDificil.acertos ? questao : maisDificil,
    QUESTOES[0],
  );

  function abrirAluno(numero) {
    setAlunoSelecionadoNumero(numero);
    setAbaAtiva("individual");
  }

  function confirmarConclusao() {
    setConcluida(true);
    setModalConcluirAberto(false);
  }

  function ajustarResposta(indice, valor) {
    setAlunos((atuais) =>
      atuais.map((aluno) => {
        if (aluno.numero !== alunoSelecionadoNumero) return aluno;
        const respostas = [...aluno.respostas];
        respostas[indice] = valor;
        return { ...aluno, respostas, nota: recalcularNota(respostas) };
      }),
    );
  }

  function mudarObservacao(texto) {
    setAlunos((atuais) =>
      atuais.map((aluno) =>
        aluno.numero === alunoSelecionadoNumero
          ? { ...aluno, observacao: texto }
          : aluno,
      ),
    );
  }

  function salvarAluno(numero) {
    setAlunoRecemSalvo(numero);
    setTimeout(() => {
      setAlunoRecemSalvo((atual) => (atual === numero ? null : atual));
    }, 1600);
  }

  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile paddingBottom={18} />}

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
            ehTelaLarga && { maxWidth: 1100 },
          ]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.voltarLinha}
              >
                <Ionicons name="arrow-back" size={18} color={COR.tintaForte} />
                <Text style={styles.tituloPaginaDesktop}>Editar correção</Text>
              </TouchableOpacity>
            </View>
          )}

          <View
            style={[
              styles.atividadeCard,
              ehDesktop && styles.atividadeCardDesktop,
            ]}
          >
            <View style={styles.atividadeCardLinha}>
              <View style={styles.atividadeIcone}>
                <MaterialCommunityIcons
                  name="function-variant"
                  size={20}
                  color={COR.marcador}
                />
              </View>

              <View style={styles.atividadeTextos}>
                <View style={styles.atividadeTituloLinha}>
                  <Text style={styles.atividadeTitulo}>Prova de Álgebra</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: concluida
                          ? COR.okFundo
                          : COR.emAndamentoFundo,
                      },
                    ]}
                  >
                    <Ionicons
                      name={concluida ? "checkmark-circle" : "sync-outline"}
                      size={12}
                      color={concluida ? COR.ok : COR.marcador}
                    />
                    <Text
                      style={[
                        styles.statusBadgeTexto,
                        { color: concluida ? COR.ok : COR.marcador },
                      ]}
                    >
                      {concluida ? "Concluída" : "Em correção"}
                    </Text>
                  </View>
                </View>

                <Text style={styles.atividadeSubtitulo}>9º Ano A</Text>
                <View style={styles.atividadeDataLinha}>
                  <Ionicons
                    name="calendar-outline"
                    size={11}
                    color={COR.tintaFraca}
                  />
                  <Text style={styles.atividadeData}>19/03/2026</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.botaoMenu}
                activeOpacity={0.7}
                hitSlop={8}
                onPress={() => setMenuAtividadeAberto(true)}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={COR.tintaFraca}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.atividadeBotoesLinha}>
              {concluida ? (
                <TouchableOpacity
                  style={styles.botaoReabrir}
                  activeOpacity={0.85}
                  onPress={() => setConcluida(false)}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={15}
                    color={COR.marcador}
                  />
                  <Text style={styles.botaoReabrirTexto}>Reabrir correção</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.botaoConcluir}
                  activeOpacity={0.85}
                  onPress={() => setModalConcluirAberto(true)}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={15}
                    color={COR.branco}
                  />
                  <Text style={styles.botaoConcluirTexto}>
                    Concluir correção
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.abasLinha}>
            {ABAS.map((aba) => {
              const ativa = aba.chave === abaAtiva;
              return (
                <TouchableOpacity
                  key={aba.chave}
                  onPress={() => setAbaAtiva(aba.chave)}
                  style={[styles.abaItem, ativa && styles.abaItemAtiva]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={aba.icone}
                    size={14}
                    color={ativa ? COR.marcador : COR.tintaFraca}
                  />
                  <Text
                    style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}
                  >
                    {aba.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {abaAtiva === "resumo" && (
            <>
              <View style={styles.estatisticasLinha}>
                {ESTATISTICAS.map((item) => (
                  <View key={item.rotulo} style={styles.estatisticaCard}>
                    <View
                      style={[
                        styles.estatisticaIcone,
                        { backgroundColor: item.fundo },
                      ]}
                    >
                      <Ionicons name={item.icone} size={18} color={item.cor} />
                    </View>
                    <Text style={styles.estatisticaValor}>{item.valor}</Text>
                    <Text style={styles.estatisticaRotulo}>{item.rotulo}</Text>
                  </View>
                ))}
              </View>

              <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
                <Text style={[styles.cartaoTitulo, { marginBottom: 16 }]}>
                  Notas dos alunos
                </Text>

                {ehDesktop ? (
                  <View style={styles.tabela}>
                    <View style={styles.tabelaCabecalho}>
                      <Text
                        style={[styles.tabelaCabecalhoTexto, styles.colNumero]}
                      >
                        Nº
                      </Text>
                      <Text
                        style={[styles.tabelaCabecalhoTexto, styles.colAluno]}
                      >
                        Aluno
                      </Text>
                      <Text
                        style={[styles.tabelaCabecalhoTexto, styles.colNota]}
                      >
                        Nota
                      </Text>
                    </View>

                    {alunos.map((aluno, indice) => (
                      <TouchableOpacity
                        key={aluno.numero}
                        style={[
                          styles.tabelaLinha,
                          indice % 2 === 1 && styles.tabelaLinhaAlternada,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => abrirAluno(aluno.numero)}
                      >
                        <Text style={[styles.tabelaNumero, styles.colNumero]}>
                          {aluno.numero}
                        </Text>
                        <Text
                          style={[styles.tabelaAluno, styles.colAluno]}
                          numberOfLines={1}
                        >
                          {aluno.nome}
                        </Text>
                        <Text
                          style={[
                            styles.tabelaNota,
                            styles.colNota,
                            { color: corDaNota(aluno.nota) },
                          ]}
                        >
                          {aluno.nota}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.listaNotasMobile}>
                    {alunos.map((aluno) => (
                      <TouchableOpacity
                        key={aluno.numero}
                        style={styles.notaCardMobile}
                        activeOpacity={0.7}
                        onPress={() => abrirAluno(aluno.numero)}
                      >
                        <View style={styles.notaCardEsquerda}>
                          <View style={styles.notaNumero}>
                            <Text style={styles.notaNumeroTexto}>
                              {aluno.numero}
                            </Text>
                          </View>
                          <Text style={styles.notaCardNome} numberOfLines={1}>
                            {aluno.nome}
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.notaBadge,
                            { backgroundColor: corFundoDaNota(aluno.nota) },
                          ]}
                        >
                          <Text
                            style={[
                              styles.notaBadgeTexto,
                              { color: corDaNota(aluno.nota) },
                            ]}
                          >
                            {aluno.nota}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.cartaoRodape}>
                  <Ionicons
                    name="information-circle-outline"
                    size={13}
                    color={COR.tintaFraca}
                  />
                  <Text style={styles.cartaoRodapeTexto}>
                    Toque em um aluno para ver os detalhes individuais
                  </Text>
                </View>
              </View>
            </>
          )}

          {abaAtiva === "pergunta" && (
            <>
              <View style={styles.destaqueCard}>
                <View style={styles.destaqueIcone}>
                  <Ionicons name="alert-circle" size={18} color={COR.perigo} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.destaqueTitulo}>
                    Questão {questaoMaisDificil.numero} teve mais dificuldade
                  </Text>
                  <Text style={styles.destaqueDescricao} numberOfLines={1}>
                    {questaoMaisDificil.enunciado} ·{" "}
                    {percentualAcerto(questaoMaisDificil.acertos)}% de acerto
                  </Text>
                </View>
              </View>

              <View style={[styles.cartao, ehDesktop && styles.cartaoDesktop]}>
                <Text style={styles.cartaoTitulo}>Desempenho por questão</Text>
                <Text style={styles.cartaoSubtitulo}>
                  Percentual de acerto de cada questão nesta turma
                </Text>

                <View style={styles.listaQuestoes}>
                  {QUESTOES.map((questao) => {
                    const percentual = percentualAcerto(questao.acertos);
                    const cor = corDoPercentual(percentual);
                    return (
                      <View key={questao.numero} style={styles.questaoItem}>
                        <View style={styles.questaoNumero}>
                          <Text style={styles.questaoNumeroTexto}>
                            {questao.numero}
                          </Text>
                        </View>

                        <View style={{ flex: 1, minWidth: 0 }}>
                          <View style={styles.questaoCabecalhoLinha}>
                            <Text
                              style={styles.questaoEnunciado}
                              numberOfLines={1}
                            >
                              {questao.enunciado}
                            </Text>
                            <Text
                              style={[styles.questaoPercentual, { color: cor }]}
                            >
                              {percentual}%
                            </Text>
                          </View>

                          <View style={styles.questaoBarraFundo}>
                            <View
                              style={[
                                styles.questaoBarraPreenchida,
                                {
                                  width: `${percentual}%`,
                                  backgroundColor: cor,
                                },
                              ]}
                            />
                          </View>

                          <View style={styles.questaoRodapeLinha}>
                            <View style={styles.questaoTipoPill}>
                              <Text style={styles.questaoTipoTexto}>
                                {questao.tipo}
                              </Text>
                            </View>
                            <Text style={styles.questaoAcertosTexto}>
                              {questao.acertos}/{TOTAL_ALUNOS} acertaram
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}

          {abaAtiva === "individual" && (
            <View style={ehDesktop && styles.individualLinhaDesktop}>
              <View
                style={[
                  styles.cartao,
                  ehDesktop && styles.cartaoDesktop,
                  ehDesktop && { flex: 1 },
                ]}
              >
                <Text style={styles.cartaoTitulo}>Selecione um aluno</Text>
                <Text style={styles.cartaoSubtitulo}>
                  {ehDesktop
                    ? "Toque em um nome para ver as respostas ao lado"
                    : "Toque em um nome para ver as respostas questão a questão"}
                </Text>

                <View style={styles.listaAlunos}>
                  {alunos.map((aluno) => {
                    const selecionado = alunoSelecionadoNumero === aluno.numero;
                    return (
                      <View key={aluno.numero}>
                        <TouchableOpacity
                          style={[
                            styles.alunoItem,
                            selecionado && styles.alunoItemAtivo,
                          ]}
                          activeOpacity={0.7}
                          onPress={() =>
                            setAlunoSelecionadoNumero(
                              selecionado ? null : aluno.numero,
                            )
                          }
                        >
                          <View style={styles.alunoAvatar}>
                            <Text style={styles.alunoAvatarTexto}>
                              {aluno.nome.charAt(0)}
                            </Text>
                          </View>
                          <Text style={styles.alunoNome} numberOfLines={1}>
                            {aluno.nome}
                          </Text>
                          <Text
                            style={[
                              styles.alunoNota,
                              { color: corDaNota(aluno.nota) },
                            ]}
                          >
                            {aluno.nota}
                          </Text>
                          {!ehDesktop && (
                            <Ionicons
                              name={selecionado ? "chevron-up" : "chevron-down"}
                              size={16}
                              color={COR.chevron}
                            />
                          )}
                        </TouchableOpacity>

                        {!ehDesktop && selecionado && (
                          <View style={styles.detalheInline}>
                            <DetalheAluno
                              aluno={aluno}
                              onAjustarResposta={ajustarResposta}
                              onMudarObservacao={mudarObservacao}
                              salvo={alunoRecemSalvo === aluno.numero}
                              onSalvar={() => salvarAluno(aluno.numero)}
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {ehDesktop && (
                <View
                  style={[styles.cartao, styles.cartaoDesktop, { flex: 1 }]}
                >
                  {alunoSelecionado ? (
                    <DetalheAluno
                      aluno={alunoSelecionado}
                      onAjustarResposta={ajustarResposta}
                      onMudarObservacao={mudarObservacao}
                      salvo={alunoRecemSalvo === alunoSelecionado.numero}
                      onSalvar={() => salvarAluno(alunoSelecionado.numero)}
                    />
                  ) : (
                    <View style={styles.detalheVazio}>
                      <Ionicons
                        name="person-outline"
                        size={26}
                        color={COR.chevron}
                      />
                      <Text style={styles.detalheVazioTexto}>
                        Selecione um aluno na lista ao lado para ver as
                        respostas
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={modalConcluirAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConcluirAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalIcone}>
              <Ionicons name="checkmark-done" size={24} color={COR.ok} />
            </View>

            <Text style={styles.modalTitulo}>Concluir esta correção?</Text>
            <Text style={styles.modalTexto}>
              Isso marca a atividade como corrigida e libera as notas. Você
              ainda vai poder reabrir e editar depois, se precisar.
            </Text>

            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                activeOpacity={0.8}
                onPress={() => setModalConcluirAberto(false)}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBotaoConfirmar}
                activeOpacity={0.8}
                onPress={confirmarConclusao}
              >
                <Text style={styles.modalBotaoConfirmarTexto}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={menuAtividadeAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAtividadeAberto(false)}
      >
        <Pressable
          style={styles.modalFundo}
          onPress={() => setMenuAtividadeAberto(false)}
        >
          <Pressable style={styles.menuCartao} onPress={() => {}}>
            <TouchableOpacity
              style={styles.menuOpcao}
              activeOpacity={0.7}
              onPress={() => {
                setMenuAtividadeAberto(false);
                router.push({
                  pathname: "/atividades",
                  params: { atividadeTitulo: "Prova de Álgebra" },
                });
              }}
            >
              <Ionicons
                name="document-text-outline"
                size={17}
                color={COR.marcador}
              />
              <Text style={styles.menuOpcaoTexto}>Ver atividade original</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
    color: COR.tintaForte,
  },

  atividadeCard: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
    marginBottom: 20,
  },
  atividadeCardDesktop: { padding: 20 },
  atividadeCardLinha: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 14,
  },
  atividadeIcone: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  atividadeTextos: { flex: 1, minWidth: 0 },
  atividadeTituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  atividadeTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 17,
    color: COR.tintaForte,
  },
  atividadeSubtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaMedia,
    marginTop: 3,
  },
  atividadeDataLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  atividadeData: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
  },
  botaoMenu: { padding: 4, flexShrink: 0 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RAIO.etiqueta,
  },
  statusBadgeTexto: { fontFamily: FONTE.bold, fontSize: 11 },

  atividadeBotoesLinha: { flexDirection: "row", gap: 10 },
  botaoConcluir: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COR.ok,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
  },
  botaoConcluirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },
  botaoReabrir: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COR.branco,
    borderWidth: 1.5,
    borderColor: COR.marcador,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
  },
  botaoReabrirTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.marcador,
  },

  abasLinha: {
    flexDirection: "row",
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 4,
    marginBottom: 20,
  },
  abaItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: RAIO.controle,
  },
  abaItemAtiva: { backgroundColor: COR.emAndamentoFundo },
  abaTexto: { fontFamily: FONTE.semi, fontSize: 13, color: COR.tintaFraca },
  abaTextoAtiva: { color: COR.marcador },

  estatisticasLinha: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  estatisticaCard: {
    flex: 1,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  estatisticaIcone: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  estatisticaValor: {
    fontFamily: FONTE.bold,
    fontSize: 19,
    color: COR.tintaForte,
  },
  estatisticaRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 3,
    textAlign: "center",
  },

  cartao: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
  },
  cartaoDesktop: { padding: 22 },
  cartaoTitulo: { fontFamily: FONTE.bold, fontSize: 16, color: COR.tintaForte },
  cartaoSubtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
    marginTop: 3,
    marginBottom: 14,
  },
  cartaoRodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  cartaoRodapeTexto: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },

  tabela: {
    borderRadius: RAIO.controle,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COR.linhaSuave,
  },
  tabelaCabecalho: {
    flexDirection: "row",
    backgroundColor: COR.marinho,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tabelaCabecalhoTexto: {
    fontFamily: FONTE.bold,
    fontSize: 11,
    color: COR.branco,
  },
  tabelaLinha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: COR.branco,
  },
  tabelaLinhaAlternada: { backgroundColor: COR.fundo },
  tabelaNumero: { fontFamily: FONTE.semi, fontSize: 12, color: COR.tintaMedia },
  tabelaAluno: { fontFamily: FONTE.semi, fontSize: 12, color: COR.tintaForte },
  tabelaNota: { fontFamily: FONTE.bold, fontSize: 12 },
  colNumero: { width: 32 },
  colAluno: { flex: 1, paddingRight: 8 },
  colNota: { width: 50, textAlign: "right" },

  listaNotasMobile: { gap: 10 },
  notaCardMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  notaCardEsquerda: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  notaNumero: {
    width: 32,
    height: 32,
    borderRadius: RAIO.controle,
    backgroundColor: COR.fundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notaNumeroTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12,
    color: COR.tintaMedia,
  },
  notaCardNome: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 14,
    color: COR.tintaForte,
  },
  notaBadge: {
    borderRadius: RAIO.controle,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  notaBadgeTexto: { fontFamily: FONTE.bold, fontSize: 14 },

  destaqueCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: COR.perigoFundo,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  destaqueIcone: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COR.branco,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  destaqueTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.tintaForte,
  },
  destaqueDescricao: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.perigo,
    marginTop: 2,
  },

  listaQuestoes: { gap: 16 },
  questaoItem: { flexDirection: "row", gap: 12 },
  questaoNumero: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  questaoNumeroTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12,
    color: COR.marcador,
  },
  questaoCabecalhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  questaoEnunciado: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.tintaForte,
  },
  questaoPercentual: { fontFamily: FONTE.bold, fontSize: 13 },
  questaoBarraFundo: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COR.linhaSuave,
    overflow: "hidden",
    marginBottom: 8,
  },
  questaoBarraPreenchida: { height: "100%", borderRadius: 3 },
  questaoRodapeLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  questaoTipoPill: {
    backgroundColor: COR.linhaSuave,
    borderRadius: RAIO.etiqueta,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  questaoTipoTexto: {
    fontFamily: FONTE.semi,
    fontSize: 10,
    color: COR.tintaMedia,
  },
  questaoAcertosTexto: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
  },

  individualLinhaDesktop: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
  },

  listaAlunos: { gap: 8 },
  alunoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alunoItemAtivo: {
    borderColor: COR.marcador,
    backgroundColor: COR.emAndamentoFundo,
  },
  alunoAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COR.linhaSuave,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alunoAvatarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 12,
    color: COR.marcador,
  },
  alunoNome: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 13,
    color: COR.tintaForte,
  },
  alunoNota: { fontFamily: FONTE.bold, fontSize: 13 },

  detalheInline: {
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: COR.fundo,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
  },
  detalheVazio: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 50,
  },
  detalheVazioTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaFraca,
    textAlign: "center",
    maxWidth: 220,
  },

  detalheCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  detalheAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COR.emAndamentoFundo,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detalheAvatarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    color: COR.marcador,
  },
  detalheNome: { fontFamily: FONTE.bold, fontSize: 14, color: COR.tintaForte },
  detalheTurma: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 2,
  },
  detalheNota: { fontFamily: FONTE.bold, fontSize: 18 },

  ajusteDica: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginBottom: 10,
    lineHeight: 15,
  },
  respostasLista: { gap: 10, marginBottom: 16 },

  dissertativaItem: {
    padding: 10,
    borderRadius: RAIO.controle,
    backgroundColor: COR.fundo,
  },
  dissertativaCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  dissertativaPercentual: { fontFamily: FONTE.bold, fontSize: 13 },
  dissertativaOpcoes: { flexDirection: "row", gap: 6 },
  dissertativaChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: RAIO.etiqueta,
    borderWidth: 1.5,
    borderColor: COR.linha,
    backgroundColor: COR.branco,
  },
  dissertativaChipTexto: {
    fontFamily: FONTE.bold,
    fontSize: 11,
    color: COR.tintaMedia,
  },
  dissertativaChipTextoAtivo: { color: COR.branco },

  respostaItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  respostaIcone: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  respostaTexto: {
    flex: 1,
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaForte,
  },

  observacoesBox: {
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    borderRadius: 12,
    padding: 12,
    backgroundColor: COR.fundo,
  },
  observacoesTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 12,
    color: COR.tintaForte,
    marginBottom: 6,
  },
  observacoesInput: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaForte,
    minHeight: 60,
    textAlignVertical: "top",
    padding: 0,
  },

  botaoSalvar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COR.marcador,
    borderRadius: RAIO.controle,
    paddingVertical: 12,
    marginTop: 14,
  },
  botaoSalvarFeito: { backgroundColor: COR.ok },
  botaoSalvarTexto: { fontFamily: FONTE.bold, fontSize: 13, color: COR.branco },

  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: COR.branco,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  modalIcone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COR.okFundo,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 16,
    color: COR.tintaForte,
    textAlign: "center",
  },
  modalTexto: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.tintaMedia,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 20,
  },
  modalAcoes: { flexDirection: "row", gap: 10, width: "100%" },
  modalBotaoCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    borderWidth: 1,
    borderColor: COR.linha,
  },
  modalBotaoCancelarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.tintaMedia,
  },
  modalBotaoConfirmar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: RAIO.controle,
    backgroundColor: COR.ok,
  },
  modalBotaoConfirmarTexto: {
    fontFamily: FONTE.bold,
    fontSize: 13,
    color: COR.branco,
  },

  menuCartao: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    padding: 8,
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
    color: COR.tintaForte,
  },
});
