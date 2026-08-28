
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
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

function corFundoDaNota(nota) {
  if (nota === "-") return "#F1F5F9";
  const valor = Number(nota.replace(",", "."));
  if (valor >= 7) return "#E7F8EF";
  if (valor >= 5) return "#FEF3C7";
  return "#FEE2E2";
}

const TOTAL_ALUNOS = 32;

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

function percentualAcerto(acertos) {
  return Math.round((acertos / TOTAL_ALUNOS) * 100);
}

function corDoPercentual(percentual) {
  if (percentual >= 70) return "#22C55E";
  if (percentual >= 40) return "#D4A017";
  return "#EF4444";
}

function respostasDoAluno(aluno) {
  if (aluno.nota === "-") return QUESTOES.map(() => null);
  const nota = Number(aluno.nota.replace(",", "."));
  const acertosEstimados = Math.round((nota / 10) * QUESTOES.length);
  return QUESTOES.map((_, indice) => indice < acertosEstimados);
}

export default function Editar() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState("resumo");
  const [alunoSelecionado, setAlunoSelecionado] = useState(null);

  const questaoMaisDificil = QUESTOES.reduce((maisDificil, questao) =>
    questao.acertos < maisDificil.acertos ? questao : maisDificil
  , QUESTOES[0]);

  return (
    <View style={[styles.tela, ehDesktop && { paddingLeft: 300 }]}>
      {!ehDesktop && <CabecalhoMobile comSino paddingBottom={18} />}

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

              <TouchableOpacity
                style={styles.toolbarDesktop}
                activeOpacity={0.8}
                onPress={() => router.push("/perfil")}
              >
                <View style={styles.avatarPequenoClaro}>
                  <Text style={styles.avatarPequenoClaroTexto}>{INICIAIS_PROFESSOR}</Text>
                </View>
                <View style={styles.usuarioNomeLinha}>
                  <Text style={styles.usuarioNomeClaro}>Ana Silva</Text>
                  <Ionicons name="chevron-down" size={14} color="#0B1E3D" />
                </View>
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
                <Text style={styles.atividadeCardTitulo}>Prova de Álgebra</Text>
                <Text style={styles.atividadeCardSubtitulo}>9º Ano A · Turma B</Text>
                <View style={styles.atividadeCardDataLinha}>
                  <Ionicons name="calendar-outline" size={11} color="#94A3B8" />
                  <Text style={styles.atividadeCardData}>19/03/2026</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.botaoMenu} activeOpacity={0.7}>
                <Ionicons name="ellipsis-vertical" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.botaoSalvar} activeOpacity={0.85}>
              <Ionicons name="save-outline" size={15} color="#FFFFFF" />
              <Text style={styles.botaoSalvarTexto}>Salvar Notas</Text>
            </TouchableOpacity>
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
                <View style={styles.notasCabecalhoLinha}>
                  <Text style={styles.notasTitulo}>Notas dos alunos</Text>
                  <TouchableOpacity style={styles.botaoExportar} activeOpacity={0.85}>
                    <Ionicons name="download-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.botaoExportarTexto}>Exportar</Text>
                    <Ionicons name="chevron-down" size={13} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {ehDesktop ? (
                  <View style={styles.tabela}>
                    <View style={styles.tabelaCabecalho}>
                      <Text style={[styles.tabelaCabecalhoTexto, styles.colNumero]}>Nº</Text>
                      <Text style={[styles.tabelaCabecalhoTexto, styles.colAluno]}>ALUNO</Text>
                      <Text style={[styles.tabelaCabecalhoTexto, styles.colNota]}>NOTA</Text>
                    </View>

                    {ALUNOS.map((aluno, indice) => (
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
                  <View style={styles.listaNotasMobile}>
                    {ALUNOS.map((aluno) => (
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
            <>
              <View style={[styles.notasCard, ehDesktop && styles.notasCardDesktop]}>
                <Text style={styles.notasTitulo}>Selecione um aluno</Text>
                <Text style={styles.notasSubtitulo}>
                  Toque em um nome para ver as respostas questão a questão
                </Text>

                <View style={styles.listaAlunosIndividual}>
                  {ALUNOS.map((aluno) => {
                    const selecionado = alunoSelecionado?.numero === aluno.numero;
                    return (
                      <TouchableOpacity
                        key={aluno.numero}
                        style={[
                          styles.alunoIndividualItem,
                          selecionado && styles.alunoIndividualItemAtivo,
                        ]}
                        activeOpacity={0.7}
                        onPress={() => setAlunoSelecionado(selecionado ? null : aluno)}
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
                        <Ionicons
                          name={selecionado ? "chevron-up" : "chevron-down"}
                          size={16}
                          color="#94A3B8"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {alunoSelecionado && (
                <View style={[styles.notasCard, ehDesktop && styles.notasCardDesktop, { marginTop: 20 }]}>
                  <View style={styles.detalheAlunoCabecalho}>
                    <View style={styles.detalheAlunoAvatar}>
                      <Text style={styles.detalheAlunoAvatarTexto}>
                        {alunoSelecionado.nome.charAt(0)}
                      </Text>
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.detalheAlunoNome}>{alunoSelecionado.nome}</Text>
                      <Text style={styles.notasSubtitulo}>9º Ano A · Turma B</Text>
                    </View>
                    <Text
                      style={[
                        styles.detalheAlunoNota,
                        { color: corDaNota(alunoSelecionado.nota) },
                      ]}
                    >
                      {alunoSelecionado.nota}
                    </Text>
                  </View>

                  {alunoSelecionado.nota === "-" ? (
                    <Text style={styles.placeholderTexto}>
                      Essa prova ainda não foi corrigida para este aluno.
                    </Text>
                  ) : (
                    <View style={styles.respostasLista}>
                      {QUESTOES.map((questao, indice) => {
                        const acertou = respostasDoAluno(alunoSelecionado)[indice];
                        return (
                          <View key={questao.numero} style={styles.respostaItem}>
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
                          </View>
                        );
                      })}
                    </View>
                  )}

                  <View style={styles.observacoesBox}>
                    <Text style={styles.observacoesTitulo}>Observações do professor</Text>
                    <Text style={styles.observacoesPlaceholder}>
                      Toque aqui para escrever um comentário sobre o desempenho do aluno...
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

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
  atividadeCardTitulo: { fontSize: 16.5, fontWeight: "700", color: "#0B1E3D" },
  atividadeCardSubtitulo: { fontSize: 13, color: "#64748B", marginTop: 3 },
  atividadeCardDataLinha: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  atividadeCardData: { fontSize: 12, color: "#94A3B8" },
  botaoMenu: { padding: 4, flexShrink: 0 },
  botaoSalvar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingVertical: 13,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
  },
  botaoSalvarTexto: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

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

  respostasLista: { gap: 10, marginBottom: 16 },
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
});