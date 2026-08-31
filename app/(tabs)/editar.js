import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

const ABAS = [
  { chave: "resumo", rotulo: "Resumo", icone: "stats-chart-outline" },
  { chave: "pergunta", rotulo: "Pergunta", icone: "help-circle-outline" },
  { chave: "individual", rotulo: "Individual", icone: "person-outline" },
];

const ESTATISTICAS = [
  { valor: "32", rotulo: "alunos", icone: "people", corFundo: "#E8F0FE", corIcone: "#3B82F6" },
  { valor: "7,4", rotulo: "média da turma", icone: "checkmark-circle", corFundo: "#E7F8EF", corIcone: "#22C55E" },
  { valor: "12", rotulo: "corrigidos", icone: "ribbon", corFundo: "#F1E9FB", corIcone: "#8B5CF6" },
];

// Alunos e notas dessa correção, hoje fixos.
//
// ---------------------------------------------------------------------------
// API — GET /correcoes/:id
// É a chamada que enche a tela inteira: dados da atividade, lista de alunos,
// e as respostas de cada questão já corrigidas pela IA (com nota e
// comentário), pro professor revisar.
//
//   const { id } = useLocalSearchParams();
//   const [alunos, setAlunos] = useState([]);
//
//   useEffect(() => {
//     fetch(`http://localhost:3000/correcoes/${id}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then((correcao) => setAlunos(correcao.alunos));
//   }, [id]);
// ---------------------------------------------------------------------------
const ALUNOS = [
  { numero: "01", nome: "Ana Santos", nota: "8,5" },
  { numero: "02", nome: "Bruno Lima", nota: "7,5" },
  { numero: "03", nome: "Carlos Souza", nota: "4,0" },
  { numero: "04", nome: "Daniela Alves", nota: "6,0" },
  { numero: "05", nome: "Eduardo Ferreira", nota: "9,5" },
  { numero: "06", nome: "Fernanda Costa", nota: "7,0" },
  { numero: "07", nome: "Gabriel Martins", nota: "10,0" },
  { numero: "08", nome: "Isabella Oliveira", nota: "4,5" },
  { numero: "09", nome: "João pedro", nota: "8,0" },
  { numero: "10", nome: "Juliana Rocha", nota: "-" },
  { numero: "11", nome: "Victória Akemi", nota: "-" },
  { numero: "12", nome: "Maria Antonieta", nota: "5,5" },
];

function corDaNota(nota) {
  if (nota === "-") return "#94A3B8";
  const valor = Number(nota.replace(",", "."));
  if (valor >= 7) return "#22C55E";
  if (valor >= 5) return "#D4A017";
  return "#EF4444";
}

// Fundo claro por trás da nota.
function corFundoDaNota(nota) {
  if (nota === "-") return "#F1F5F9";
  const valor = Number(nota.replace(",", "."));
  if (valor >= 7) return "#E7F8EF";
  if (valor >= 5) return "#FEF3C7";
  return "#FEE2E2";
}

const TOTAL_ALUNOS = 32;

// Dados por questão (exemplo).
const QUESTOES = [
  {
    numero: 1,
    enunciado: "Resolução de equações do 1º grau",
    tipo: "Múltipla escolha",
    acertos: 28,
  },
  {
    numero: 2,
    enunciado: "Sistemas de equações lineares",
    tipo: "Múltipla escolha",
    acertos: 24,
  },
  {
    numero: 3,
    enunciado: "Função afim: gráfico e coeficientes",
    tipo: "Dissertativa",
    acertos: 19,
  },
  {
    numero: 4,
    enunciado: "Inequações do 1º grau",
    tipo: "Múltipla escolha",
    acertos: 21,
  },
  {
    numero: 5,
    enunciado: "Fatoração de expressões algébricas",
    tipo: "Dissertativa",
    acertos: 12,
  },
  {
    numero: 6,
    enunciado: "Produtos notáveis",
    tipo: "Múltipla escolha",
    acertos: 27,
  },
];

// Notas parciais possíveis numa questão dissertativa.
const OPCOES_PERCENTUAL_DISSERTATIVA = [0, 0.25, 0.5, 0.75, 1];

// Calcula a nota do aluno a partir das respostas (0 a 1 por questão).
function recalcularNota(respostas) {
  if (!respostas || respostas.every((r) => r === null)) return "-";
  const soma = respostas.reduce((acumulado, valor) => acumulado + (valor ?? 0), 0);
  return ((soma / respostas.length) * 10).toFixed(1).replace(".", ",");
}

function corDoPercentual(percentual) {
  if (percentual >= 70) return "#22C55E";
  if (percentual >= 40) return "#D4A017";
  return "#EF4444";
}

// Card de detalhe de um aluno, usado no mobile e no desktop.
function renderDetalheAluno(aluno, onAjustarResposta, onMudarObservacao, salvo, onSalvar) {
  return (
    <>
      <View style={styles.detalheAlunoCabecalho}>
        <View style={styles.detalheAlunoAvatar}>
          <Text style={styles.detalheAlunoAvatarTexto}>{aluno.nome.charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.detalheAlunoNome}>{aluno.nome}</Text>
          <Text style={styles.notasSubtitulo}>9º Ano A · Turma B</Text>
        </View>
        <Text style={[styles.detalheAlunoNota, { color: corDaNota(aluno.nota) }]}>
          {aluno.nota}
        </Text>
      </View>

      {aluno.nota === "-" ? (
        <Text style={styles.placeholderTexto}>
          Essa prova ainda não foi corrigida para este aluno.
        </Text>
      ) : (
        <>
          <Text style={styles.ajusteManualDica}>
            Achou que a IA errou em alguma questão? Nas objetivas é só tocar; nas dissertativas dá
            pra escolher a nota parcial.
          </Text>
          <View style={styles.respostasLista}>
            {QUESTOES.map((questao, indice) => {
              const valor = aluno.respostas[indice];

              // Dissertativa: o professor escolhe a nota parcial.
              if (questao.tipo === "Dissertativa") {
                const percentual = Math.round(valor * 100);
                return (
                  <View key={questao.numero} style={styles.respostaDissertativaItem}>
                    <View style={styles.respostaDissertativaCabecalho}>
                      <Text style={styles.respostaTexto} numberOfLines={1}>
                        Questão {questao.numero} · {questao.enunciado}
                      </Text>
                      <Text
                        style={[
                          styles.respostaDissertativaPercentual,
                          { color: corDoPercentual(percentual) },
                        ]}
                      >
                        {percentual}%
                      </Text>
                    </View>
                    <View style={styles.respostaDissertativaOpcoes}>
                      {OPCOES_PERCENTUAL_DISSERTATIVA.map((opcao) => {
                        const ativo = Math.abs(valor - opcao) < 0.01;
                        const cor = corDoPercentual(Math.round(opcao * 100));
                        return (
                          <TouchableOpacity
                            key={opcao}
                            style={[
                              styles.respostaDissertativaChip,
                              ativo && { backgroundColor: cor, borderColor: cor },
                            ]}
                            activeOpacity={0.7}
                            onPress={() => onAjustarResposta(indice, opcao)}
                          >
                            <Text
                              style={[
                                styles.respostaDissertativaChipTexto,
                                ativo && styles.respostaDissertativaChipTextoAtivo,
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

              // Objetiva continua simples: um toque alterna certo/errado.
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
                      styles.respostaIconeCirculo,
                      { backgroundColor: acertou ? "#E7F8EF" : "#FCE7E7" },
                    ]}
                  >
                    <Ionicons
                      name={acertou ? "checkmark" : "close"}
                      size={14}
                      color={acertou ? "#22C55E" : "#EF4444"}
                    />
                  </View>
                  <Text style={styles.respostaTexto} numberOfLines={1}>
                    Questão {questao.numero} · {questao.enunciado}
                  </Text>
                  <Ionicons name="create-outline" size={14} color="#CBD5E1" />
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
          placeholder="Toque aqui para escrever um comentário sobre o desempenho do aluno..."
          placeholderTextColor="#94A3B8"
          style={styles.observacoesInput}
          multiline
        />
      </View>

      <TouchableOpacity
        style={[styles.botaoSalvarAluno, salvo && styles.botaoSalvarAlunoSalvo]}
        activeOpacity={0.85}
        onPress={onSalvar}
      >
        <Ionicons name={salvo ? "checkmark" : "save-outline"} size={15} color="#FFFFFF" />
        <Text style={styles.botaoSalvarAlunoTexto}>{salvo ? "Salvo!" : "Salvar"}</Text>
      </TouchableOpacity>
    </>
  );
}

function percentualAcerto(acertos) {
  return Math.round((acertos / TOTAL_ALUNOS) * 100);
}

// Gera as respostas de exemplo de cada aluno.
function respostasDoAluno(aluno) {
  if (aluno.nota === "-") return QUESTOES.map(() => null);
  const nota = Number(aluno.nota.replace(",", "."));
  const acertosEstimados = Math.round((nota / 10) * QUESTOES.length);
  return QUESTOES.map((_, indice) => (indice < acertosEstimados ? 1 : 0));
}

export default function Editar() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState("resumo");
  // Número do aluno selecionado na aba Individual.
  const [alunoSelecionadoNumero, setAlunoSelecionadoNumero] = useState(null);
  const [concluida, setConcluida] = useState(false);
  const [modalConcluirAberto, setModalConcluirAberto] = useState(false);
  // Menu do "⋮" no card da atividade.
  const [menuAtividadeAberto, setMenuAtividadeAberto] = useState(false);
  // Lista de alunos em estado (nota, respostas e observação são editáveis).
  const [alunos, setAlunos] = useState(() =>
    ALUNOS.map((aluno) => ({ ...aluno, respostas: respostasDoAluno(aluno), observacao: "" }))
  );

  const alunoSelecionado =
    alunos.find((aluno) => aluno.numero === alunoSelecionadoNumero) ?? null;

  const questaoMaisDificil = QUESTOES.reduce((maisDificil, questao) =>
    questao.acertos < maisDificil.acertos ? questao : maisDificil
  , QUESTOES[0]);

  // Marca a correção inteira como concluída.
  //
  // API — PUT /correcoes/:id
  //
  //   await fetch(`http://localhost:3000/correcoes/${id}`, {
  //     method: "PUT",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify({ status: "concluida" }),
  //   });
  function confirmarConclusao() {
    setConcluida(true);
    setModalConcluirAberto(false);
  }

  // Professor ajustou uma questão à mão: 0 ou 1 na objetiva, parcial na
  // dissertativa. Recalcula a nota do aluno em seguida.
  //
  // API — PUT /respostas/:id
  // É o que registra a correção manual por cima do que a IA decidiu:
  //
  //   await fetch(`http://localhost:3000/respostas/${id_resposta}`, {
  //     method: "PUT",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify({ nota: valor, ajustado_manualmente: true }),
  //   });
  //
  // Esse ajustado_manualmente é útil pro TCC: com ele dá pra medir depois em
  // quantas questões a IA acertou sem precisar de correção do professor —
  // um dado bom pra seção de resultados da monografia.
  function ajustarResposta(indice, valor) {
    setAlunos((atuais) =>
      atuais.map((aluno) => {
        if (aluno.numero !== alunoSelecionadoNumero) return aluno;
        const respostas = [...aluno.respostas];
        respostas[indice] = valor;
        return { ...aluno, respostas, nota: recalcularNota(respostas) };
      })
    );
  }

  // Observação do professor sobre o aluno selecionado.
  function mudarObservacao(texto) {
    setAlunos((atuais) =>
      atuais.map((aluno) =>
        aluno.numero === alunoSelecionadoNumero ? { ...aluno, observacao: texto } : aluno
      )
    );
  }

  // Liga o feedback visual "Salvo!" no botão por um instante.
  //
  // API — PUT /correcoes/:id
  // É aqui que a observação do professor sobre esse aluno vai pro banco. Com
  // a API no ar, este botão deixa de ser só visual e passa a ser o envio:
  //
  //   await fetch(`http://localhost:3000/correcoes/${id}`, {
  //     method: "PUT",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify({ observacao: aluno.observacao }),
  //   });
  const [alunoRecemSalvo, setAlunoRecemSalvo] = useState(null);
  function salvarAluno(numero) {
    setAlunoRecemSalvo(numero);
    setTimeout(() => {
      setAlunoRecemSalvo((atual) => (atual === numero ? null : atual));
    }, 1600);
  }

  return (
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
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
          style={[ehDesktop ? styles.miolo : { width: "100%" }, ehTelaLarga && { maxWidth: 1100 }]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>Editar Correção</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Card com os dados da atividade */}
          <View style={[styles.atividadeCard, ehDesktop && styles.atividadeCardDesktop]}>
            <View style={styles.atividadeCardLinha}>
              <View style={styles.atividadeIconeCirculo}>
                <MaterialCommunityIcons name="function-variant" size={20} color="#8B5CF6" />
              </View>
              <View style={styles.atividadeCardTextos}>
                <View style={styles.atividadeCardTituloLinha}>
                  <Text style={styles.atividadeCardTitulo}>Prova de Álgebra</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: concluida ? "#E7F8EF" : "#E8F0FE" },
                    ]}
                  >
                    <Ionicons
                      name={concluida ? "checkmark-circle" : "sync-outline"}
                      size={12}
                      color={concluida ? "#22C55E" : "#3B82F6"}
                    />
                    <Text
                      style={[
                        styles.statusBadgeTexto,
                        { color: concluida ? "#22C55E" : "#3B82F6" },
                      ]}
                    >
                      {concluida ? "Concluída" : "Em correção"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.atividadeCardSubtitulo}>9º Ano A · Turma B</Text>
                <View style={styles.atividadeCardDataLinha}>
                  <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
                  <Text style={styles.atividadeCardData}>19/03/2026</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.botaoMenu}
                activeOpacity={0.7}
                onPress={() => setMenuAtividadeAberto(true)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* As notas e observações já salvam sozinhas assim que o
                professor mexe nelas — não precisa de um botão "Salvar"
                separado. Só sobrou a ação de concluir/reabrir a correção. */}
            <View style={styles.atividadeCardBotoesLinha}>
              {concluida ? (
                <TouchableOpacity
                  style={styles.botaoReabrir}
                  activeOpacity={0.85}
                  onPress={() => setConcluida(false)}
                >
                  <Ionicons name="refresh-outline" size={15} color="#3B82F6" />
                  <Text style={styles.botaoReabrirTexto}>Reabrir correção</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.botaoConcluir}
                  activeOpacity={0.85}
                  onPress={() => setModalConcluirAberto(true)}
                >
                  <Ionicons name="checkmark-done-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.botaoConcluirTexto}>Concluir correção</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Abas */}
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
                    color={ativa ? "#3B82F6" : "#94A3B8"}
                  />
                  <Text style={[styles.abaTexto, ativa && styles.abaTextoAtiva]}>
                    {aba.rotulo}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {abaAtiva === "resumo" && (
            <>
              {/* Estatísticas */}
              <View
                style={[
                  styles.estatisticasLinha,
                  ehDesktop && styles.estatisticasLinhaDesktop,
                ]}
              >
                {ESTATISTICAS.map((item) => (
                  <View key={item.rotulo} style={styles.estatisticaCard}>
                    <View
                      style={[styles.estatisticaIconeCirculo, { backgroundColor: item.corFundo }]}
                    >
                      <Ionicons name={item.icone} size={18} color={item.corIcone} />
                    </View>
                    <Text style={styles.estatisticaValor}>{item.valor}</Text>
                    <Text style={styles.estatisticaRotulo}>{item.rotulo}</Text>
                  </View>
                ))}
              </View>

              {/* Tabela de notas */}
              <View style={[styles.notasCard, ehDesktop && styles.notasCardDesktop]}>
                <Text style={[styles.notasTitulo, { marginBottom: 16 }]}>Notas dos alunos</Text>

                {ehDesktop ? (
                  <View style={styles.tabela}>
                    <View style={styles.tabelaCabecalho}>
                      <Text style={[styles.tabelaCabecalhoTexto, styles.colNumero]}>Nº</Text>
                      <Text style={[styles.tabelaCabecalhoTexto, styles.colAluno]}>ALUNO</Text>
                      <Text style={[styles.tabelaCabecalhoTexto, styles.colNota]}>NOTA</Text>
                    </View>

                    {alunos.map((aluno, indice) => (
                      <TouchableOpacity
                        key={aluno.numero}
                        style={[
                          styles.tabelaLinha,
                          indice % 2 === 1 && styles.tabelaLinhaAlternada,
                        ]}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.tabelaTextoNumero, styles.colNumero]}>
                          {aluno.numero}
                        </Text>
                        <Text style={[styles.tabelaTextoAluno, styles.colAluno]} numberOfLines={1}>
                          {aluno.nome}
                        </Text>
                        <Text
                          style={[
                            styles.tabelaTextoNota,
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
                  // No mobile a tabela vira lista de cartões.
                  <View style={styles.listaNotasMobile}>
                    {alunos.map((aluno) => (
                      <TouchableOpacity
                        key={aluno.numero}
                        style={styles.notaCardMobile}
                        activeOpacity={0.7}
                      >
                        <View style={styles.notaCardEsquerda}>
                          <View style={styles.notaNumeroCirculo}>
                            <Text style={styles.notaNumeroTexto}>{aluno.numero}</Text>
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
                            style={[styles.notaBadgeTexto, { color: corDaNota(aluno.nota) }]}
                          >
                            {aluno.nota}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <View style={styles.notasRodape}>
                  <Ionicons name="information-circle-outline" size={13} color="#94A3B8" />
                  <Text style={styles.notasRodapeTexto}>
                    Toque em um aluno para ver os detalhes individuais
                  </Text>
                </View>
              </View>
            </>
          )}

          {abaAtiva === "pergunta" && (
            <>
              {/* Destaque da questão com mais dificuldade */}
              <View style={styles.destaqueCard}>
                <View style={styles.destaqueIconeCirculo}>
                  <Ionicons name="alert-circle" size={18} color="#EF4444" />
                </View>
                <View style={styles.destaqueTextos}>
                  <Text style={styles.destaqueTitulo}>
                    Questão {questaoMaisDificil.numero} teve mais dificuldade
                  </Text>
                  <Text style={styles.destaqueDescricao} numberOfLines={1}>
                    {questaoMaisDificil.enunciado} · {percentualAcerto(questaoMaisDificil.acertos)}% de acerto
                  </Text>
                </View>
              </View>

              <View style={[styles.notasCard, ehDesktop && styles.notasCardDesktop]}>
                <Text style={styles.notasTitulo}>Desempenho por questão</Text>
                <Text style={styles.notasSubtitulo}>
                  Percentual de acerto de cada questão nesta turma
                </Text>

                <View style={styles.listaQuestoes}>
                  {QUESTOES.map((questao) => {
                    const percentual = percentualAcerto(questao.acertos);
                    const cor = corDoPercentual(percentual);
                    return (
                      <TouchableOpacity
                        key={questao.numero}
                        style={styles.questaoItem}
                        activeOpacity={0.7}
                      >
                        <View style={styles.questaoNumeroCirculo}>
                          <Text style={styles.questaoNumeroTexto}>{questao.numero}</Text>
                        </View>

                        <View style={styles.questaoConteudo}>
                          <View style={styles.questaoCabecalhoLinha}>
                            <Text style={styles.questaoEnunciado} numberOfLines={1}>
                              {questao.enunciado}
                            </Text>
                            <Text style={[styles.questaoPercentual, { color: cor }]}>
                              {percentual}%
                            </Text>
                          </View>

                          <View style={styles.questaoBarraFundo}>
                            <View
                              style={[
                                styles.questaoBarraPreenchida,
                                { width: `${percentual}%`, backgroundColor: cor },
                              ]}
                            />
                          </View>

                          <View style={styles.questaoRodapeLinha}>
                            <View style={styles.questaoTipoPill}>
                              <Text style={styles.questaoTipoTexto}>{questao.tipo}</Text>
                            </View>
                            <Text style={styles.questaoAcertosTexto}>
                              {questao.acertos}/{TOTAL_ALUNOS} acertaram
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
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
                  styles.notasCard,
                  ehDesktop && styles.notasCardDesktop,
                  ehDesktop && styles.individualColunaLista,
                ]}
              >
                <Text style={styles.notasTitulo}>Selecione um aluno</Text>
                <Text style={styles.notasSubtitulo}>
                  {ehDesktop
                    ? "Toque em um nome para ver as respostas ao lado"
                    : "Toque em um nome para ver as respostas questão a questão"}
                </Text>

                <View style={styles.listaAlunosIndividual}>
                  {alunos.map((aluno) => {
                    const selecionado = alunoSelecionadoNumero === aluno.numero;
                    return (
                      <View key={aluno.numero}>
                        <TouchableOpacity
                          style={[
                            styles.alunoIndividualItem,
                            selecionado && styles.alunoIndividualItemAtivo,
                          ]}
                          activeOpacity={0.7}
                          onPress={() =>
                            setAlunoSelecionadoNumero(selecionado ? null : aluno.numero)
                          }
                        >
                          <View style={styles.alunoIndividualAvatar}>
                            <Text style={styles.alunoIndividualAvatarTexto}>
                              {aluno.nome.charAt(0)}
                            </Text>
                          </View>
                          <Text style={styles.alunoIndividualNome} numberOfLines={1}>
                            {aluno.nome}
                          </Text>
                          <Text
                            style={[
                              styles.alunoIndividualNota,
                              { color: corDaNota(aluno.nota) },
                            ]}
                          >
                            {aluno.nota}
                          </Text>
                          {/* No desktop o detalhe abre numa coluna ao lado
                              (sempre visível), então a setinha de
                              expandir/recolher não faz sentido — só marca
                              o item ativo com a borda azul mesmo. */}
                          {!ehDesktop && (
                            <Ionicons
                              name={selecionado ? "chevron-up" : "chevron-down"}
                              size={16}
                              color="#94A3B8"
                            />
                          )}
                        </TouchableOpacity>

                        {/* Mobile: o detalhe abre em accordion, logo abaixo
                            do próprio aluno clicado — bem mais prático do
                            que abrir lá embaixo, depois da lista inteira. */}
                        {!ehDesktop && selecionado && (
                          <View style={styles.detalheAlunoInline}>
                            {renderDetalheAluno(
                              aluno,
                              ajustarResposta,
                              mudarObservacao,
                              alunoRecemSalvo === aluno.numero,
                              () => salvarAluno(aluno.numero)
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Desktop: coluna fixa ao lado da lista, sempre visível,
                  sem precisar rolar até o fim pra ver o detalhe. */}
              {ehDesktop && (
                <View
                  style={[styles.notasCard, styles.notasCardDesktop, styles.individualColunaDetalhe]}
                >
                  {alunoSelecionado ? (
                    renderDetalheAluno(
                      alunoSelecionado,
                      ajustarResposta,
                      mudarObservacao,
                      alunoRecemSalvo === alunoSelecionado.numero,
                      () => salvarAluno(alunoSelecionado.numero)
                    )
                  ) : (
                    <View style={styles.detalheVazio}>
                      <Ionicons name="person-outline" size={26} color="#CBD5E1" />
                      <Text style={styles.detalheVazioTexto}>
                        Selecione um aluno na lista ao lado para ver as respostas
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de confirmação antes de concluir a correção */}
      <Modal
        visible={modalConcluirAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setModalConcluirAberto(false)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconeCirculo}>
              <Ionicons name="checkmark-done" size={24} color="#22C55E" />
            </View>

            <Text style={styles.modalTitulo}>Concluir esta correção?</Text>
            <Text style={styles.modalTexto}>
              Isso marca a atividade como corrigida e libera as notas para os alunos. Você ainda
              vai poder reabrir e editar depois, se precisar.
            </Text>

            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                onPress={() => setModalConcluirAberto(false)}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBotaoConfirmar} onPress={confirmarConclusao}>
                <Text style={styles.modalBotaoConfirmarTexto}>Concluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Menu do "⋮" — por enquanto só tem o atalho pra ver a atividade
          original (título/disciplina/turma) na tela de Atividades */}
      <Modal
        visible={menuAtividadeAberto}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAtividadeAberto(false)}
      >
        <Pressable style={styles.modalFundo} onPress={() => setMenuAtividadeAberto(false)}>
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
              <Ionicons name="document-text-outline" size={17} color="#3B82F6" />
              <Text style={styles.menuOpcaoTexto}>Ver atividade original</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

  // Estilos do cabeçalho (no mobile quem desenha é o CabecalhoMobile).
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

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
  tituloPaginaDesktop: { fontSize: 20, fontWeight: "700", color: "#0B1E3D" },
  toolbarDesktop: { flexDirection: "row", alignItems: "center", gap: 8 },
  avatarPequenoClaro: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#0B1E3D",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarPequenoClaroTexto: { color: "#FFFFFF", fontSize: 11, fontWeight: "700" },
  usuarioNomeClaro: { fontSize: 13, fontWeight: "600", color: "#0B1E3D" },

  // ----- card da atividade -----
  atividadeCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 18,
    marginBottom: 20,
  },
  atividadeCardDesktop: { padding: 20 },
  atividadeCardLinha: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  atividadeIconeCirculo: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: "#F1E9FB",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  atividadeCardTextos: { flex: 1, minWidth: 0 },
  atividadeCardTituloLinha: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  atividadeCardTitulo: { fontSize: 16.5, fontWeight: "700", color: "#0B1E3D" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeTexto: { fontSize: 10.5, fontWeight: "700" },
  atividadeCardSubtitulo: { fontSize: 13, color: "#64748B", marginTop: 3 },
  atividadeCardDataLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  atividadeCardData: { fontSize: 12, color: "#94A3B8" },
  botaoMenu: { padding: 4, flexShrink: 0 },
  atividadeCardBotoesLinha: { flexDirection: "row", gap: 10 },
  botaoConcluir: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 13,
  },
  botaoConcluirTexto: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "700" },
  botaoReabrir: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 13,
  },
  botaoReabrirTexto: { color: "#3B82F6", fontSize: 13.5, fontWeight: "700" },

  // ----- menu do "⋮" no card da atividade -----
  menuCartao: {
    width: "100%",
    maxWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
  },
  menuOpcao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  menuOpcaoTexto: { fontSize: 14, fontWeight: "600", color: "#0B1E3D" },

  // ----- modal de confirmação (concluir correção) -----
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
  },
  modalIconeCirculo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#E7F8EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitulo: { fontSize: 16, fontWeight: "700", color: "#0B1E3D", textAlign: "center" },
  modalTexto: {
    fontSize: 12.5,
    color: "#64748B",
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalBotaoCancelarTexto: { fontSize: 13.5, fontWeight: "700", color: "#334155" },
  modalBotaoConfirmar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#22C55E",
  },
  modalBotaoConfirmarTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },

  // ----- abas -----
  abasLinha: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#EEF1F6",
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
    borderRadius: 10,
  },
  abaItemAtiva: { backgroundColor: "#E8F0FE" },
  abaTexto: { fontSize: 13.5, fontWeight: "600", color: "#94A3B8" },
  abaTextoAtiva: { color: "#3B82F6" },

  // ----- estatísticas -----
  estatisticasLinha: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 20 },
  estatisticasLinhaDesktop: { marginBottom: 22 },
  estatisticaCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  estatisticaIconeCirculo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  estatisticaValor: { fontSize: 19, fontWeight: "700", color: "#0B1E3D" },
  estatisticaRotulo: { fontSize: 11.5, color: "#94A3B8", marginTop: 3, textAlign: "center" },

  // ----- notas -----
  notasCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 18,
  },
  notasCardDesktop: { padding: 22 },
  notasCabecalhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  notasTitulo: { fontSize: 16, fontWeight: "700", color: "#0B1E3D" },
  placeholderTexto: { fontSize: 12.5, color: "#64748B", marginTop: 8 },
  botaoExportar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  botaoExportarTexto: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  tabela: { borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#EEF1F6" },
  tabelaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#3B82F6",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  tabelaCabecalhoTexto: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  tabelaLinha: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
  },
  tabelaLinhaAlternada: { backgroundColor: "#F8FAFC" },
  tabelaTextoNumero: { fontSize: 12.5, color: "#64748B", fontWeight: "600" },
  tabelaTextoAluno: { fontSize: 12.5, color: "#0B1E3D", fontWeight: "600" },
  tabelaTextoNota: { fontSize: 12.5, fontWeight: "700" },
  colNumero: { width: 32 },
  colAluno: { flex: 1, paddingRight: 8 },
  colNota: { width: 50, textAlign: "right" },

  // Lista de cartões que substitui a tabela no mobile.
  listaNotasMobile: { gap: 10 },
  notaCardMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  notaCardEsquerda: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, minWidth: 0 },
  notaNumeroCirculo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F4F6FA",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  notaNumeroTexto: { fontSize: 12.5, fontWeight: "700", color: "#64748B" },
  notaCardNome: { flex: 1, fontSize: 14.5, fontWeight: "600", color: "#0B1E3D" },
  notaBadge: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  notaBadgeTexto: { fontSize: 14.5, fontWeight: "700" },

  notasRodape: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 14,
  },
  notasRodapeTexto: { fontSize: 11, color: "#94A3B8" },
  notasSubtitulo: { fontSize: 11.5, color: "#94A3B8", marginTop: 3, marginBottom: 14 },

  // ----- aba Pergunta -----
  destaqueCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FCE7E7",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  destaqueIconeCirculo: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  destaqueTextos: { flex: 1, minWidth: 0 },
  destaqueTitulo: { fontSize: 13, fontWeight: "700", color: "#0B1E3D" },
  destaqueDescricao: { fontSize: 11, color: "#B91C1C", marginTop: 2 },

  listaQuestoes: { gap: 16 },
  questaoItem: { flexDirection: "row", gap: 12 },
  questaoNumeroCirculo: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  questaoNumeroTexto: { fontSize: 12, fontWeight: "700", color: "#3B82F6" },
  questaoConteudo: { flex: 1, minWidth: 0 },
  questaoCabecalhoLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 6,
  },
  questaoEnunciado: { flex: 1, fontSize: 13.5, fontWeight: "600", color: "#0B1E3D" },
  questaoPercentual: { fontSize: 13.5, fontWeight: "700" },
  questaoBarraFundo: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EDF1F7",
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
    backgroundColor: "#EDF1F7",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  questaoTipoTexto: { fontSize: 10, fontWeight: "600", color: "#64748B" },
  questaoAcertosTexto: { fontSize: 10.5, color: "#94A3B8" },

  // ----- aba Individual -----
  listaAlunosIndividual: { gap: 8 },
  alunoIndividualItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  alunoIndividualItemAtivo: { borderColor: "#3B82F6", backgroundColor: "#E8F0FE" },
  alunoIndividualAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#EDF1F7",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  alunoIndividualAvatarTexto: { fontSize: 12, fontWeight: "700", color: "#3B82F6" },
  alunoIndividualNome: { flex: 1, fontSize: 13.5, fontWeight: "600", color: "#0B1E3D" },
  alunoIndividualNota: { fontSize: 13.5, fontWeight: "700" },

  // No mobile o detalhe abre em accordion abaixo do aluno.
  detalheAlunoInline: {
    marginTop: 8,
    marginBottom: 4,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#F8FAFF",
    borderWidth: 1,
    borderColor: "#E7EBF3",
  },

  // No desktop lista e detalhe ficam lado a lado.
  individualLinhaDesktop: { flexDirection: "row", gap: 20, alignItems: "flex-start" },
  individualColunaLista: { flex: 1 },
  individualColunaDetalhe: { flex: 1 },
  detalheVazio: { alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 50 },
  detalheVazioTexto: {
    fontSize: 12.5,
    color: "#94A3B8",
    textAlign: "center",
    maxWidth: 220,
  },

  detalheAlunoCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  detalheAlunoAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  detalheAlunoAvatarTexto: { fontSize: 15, fontWeight: "700", color: "#3B82F6" },
  detalheAlunoNome: { fontSize: 14.5, fontWeight: "700", color: "#0B1E3D" },
  detalheAlunoNota: { fontSize: 18, fontWeight: "700" },

  ajusteManualDica: {
    fontSize: 10.5,
    color: "#94A3B8",
    marginBottom: 10,
    fontStyle: "italic",
  },
  respostasLista: { gap: 10, marginBottom: 16 },

  // ----- questão dissertativa (nota parcial) -----
  respostaDissertativaItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F8FAFF",
  },
  respostaDissertativaCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  respostaDissertativaPercentual: { fontSize: 13, fontWeight: "700" },
  respostaDissertativaOpcoes: { flexDirection: "row", gap: 6 },
  respostaDissertativaChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E7EBF3",
    backgroundColor: "#FFFFFF",
  },
  respostaDissertativaChipTexto: { fontSize: 10.5, fontWeight: "700", color: "#64748B" },
  respostaDissertativaChipTextoAtivo: { color: "#FFFFFF" },
  respostaItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  respostaIconeCirculo: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  respostaTexto: { flex: 1, fontSize: 12.5, color: "#0B1E3D" },

  observacoesBox: {
    borderWidth: 1,
    borderColor: "#EEF1F6",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
  },
  observacoesTitulo: { fontSize: 12, fontWeight: "700", color: "#0B1E3D", marginBottom: 6 },
  observacoesPlaceholder: { fontSize: 11.5, color: "#94A3B8" },
  observacoesInput: {
    fontSize: 12,
    color: "#0B1E3D",
    minHeight: 60,
    textAlignVertical: "top",
    padding: 0,
  },

  botaoSalvarAluno: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 14,
  },
  botaoSalvarAlunoSalvo: { backgroundColor: "#22C55E" },
  botaoSalvarAlunoTexto: { color: "#FFFFFF", fontSize: 13.5, fontWeight: "700" },
});