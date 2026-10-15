import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
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
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import { listarCorrecoes } from "../../constants/api";
import {
  semAcento,
  visualDaDisciplina,
} from "../../constants/disciplinas";

// "Em processamento" saiu da lista de propósito. No sistema de verdade a IA
// termina de corrigir antes de gravar, então nenhuma correção fica nesse
// estado — o filtro nunca acharia nada e só ocuparia espaço.
const FILTROS = ["Todas", "Aguardando você", "Concluídas"];

// ---------------------------------------------------------------------------
// Mesma regra de ícone do Scanner e da tela de Atividades: ele sai da
// disciplina, não do banco. Assim a mesma atividade aparece igual nas três.
// ---------------------------------------------------------------------------




const CONFIG_STATUS = {
  concluida: {
    rotulo: "Concluída",
    cor: COR.ok,
    corFundo: COR.okFundo,
    icone: "checkmark-circle",
  },
  pendente: {
    rotulo: "Aguardando você",
    cor: COR.avisoTexto,
    corFundo: COR.avisoFundo,
    icone: "time-outline",
  },
};

// "Hoje, 10:15" diz mais que "20/09/2026 10:15" quando foi hoje. Depois de uma
// semana o contrário é verdade, e aí volta a data cheia.
function quando(dataIso) {
  if (!dataIso) return "";

  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return "";

  const hora = data.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const soODia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dias = Math.round((soODia(new Date()) - soODia(data)) / 86400000);

  if (dias === 0) return `Hoje, ${hora}`;
  if (dias === 1) return `Ontem, ${hora}`;
  if (dias < 7) return `Há ${dias} dias`;

  return data.toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// A API devolve uma correção por aluno. A tela mostra por atividade — então o
// agrupamento acontece aqui.
//
// Correção cuja atividade foi apagada é descartada: sem atividade não há
// cartão onde encaixar, e mostrar um cartão "sem nome" confunde mais do que
// esconder.
//
// ATENÇÃO: é exatamente por causa deste `continue` que o resumo lá embaixo
// tem que contar a partir dos GRUPOS, e não da lista crua que veio da API.
// Contar da lista crua incluiria essas correções órfãs, e o resumo diria um
// número de folhas que não existe em cartão nenhum da tela.
// ---------------------------------------------------------------------------
function agruparPorAtividade(correcoes) {
  const mapa = new Map();

  for (const c of correcoes) {
    if (!c.atividade) continue;

    const chave = c.atividade.id_atividade;
    if (!mapa.has(chave)) {
      mapa.set(chave, { atividade: c.atividade, alunos: [] });
    }
    mapa.get(chave).alunos.push(c);
  }

  return [...mapa.values()].map((grupo) => {
    const alunos = [...grupo.alunos].sort(
      (a, b) =>
        (a.aluno?.numero_chamada ?? 999) - (b.aluno?.numero_chamada ?? 999),
    );

    const concluidas = alunos.filter((a) => a.status === "concluida").length;

    // A atividade só é "concluída" quando todas as folhas dela já passaram
    // pela revisão. Uma sozinha pendente mantém o cartão em aberto.
    const status = concluidas === alunos.length ? "concluida" : "pendente";

    const maisRecente = alunos.reduce((maior, a) => {
      if (!a.corrigido_em) return maior;
      if (!maior) return a.corrigido_em;
      return a.corrigido_em > maior ? a.corrigido_em : maior;
    }, null);

    return {
      ...grupo,
      alunos,
      total: alunos.length,
      concluidas,
      // A média e o peso_total saíram junto com o PDF: eram só o que o
      // relatório precisava, e esta tela nunca os mostrou. Quem quer a média
      // da turma abre a atividade — o Editar correção tem ela no Resumo.
      status,
      quando: quando(maisRecente),
    };
  });
}

function grupoCombinaComFiltro(grupo, filtro) {
  if (filtro === "Todas") return true;
  if (filtro === "Concluídas") return grupo.status === "concluida";
  if (filtro === "Aguardando você") return grupo.status === "pendente";
  return true;
}

export default function Correcoes() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  const { atividadeTitulo } = useLocalSearchParams();

  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState(
    atividadeTitulo ? String(atividadeTitulo) : "",
  );

  const [correcoes, setCorrecoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // Recarrega a cada foco: a professora volta da revisão e o status precisa
  // estar atualizado, sem precisar fechar o app.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        setCarregando(true);
        setErro("");
        try {
          const lista = await listarCorrecoes();
          if (ativo) setCorrecoes(lista);
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

  const grupos = agruparPorAtividade(correcoes);
  const procurado = semAcento(busca);

  const gruposFiltrados = grupos.filter(
    (g) =>
      grupoCombinaComFiltro(g, filtroAtivo) &&
      semAcento(g.atividade.nome).includes(procurado),
  );

  // ---------------------------------------------------------------------------
  // O RESUMO CONTA O QUE ESTÁ NA TELA.
  //
  // Duas coisas estavam erradas aqui, e as duas pelo mesmo motivo: a conta
  // saía da lista crua da API (`correcoes`) em vez dos cartões montados.
  //
  // 1. Correção de atividade apagada entrava na conta. O agrupamento descarta
  //    essas (não há cartão onde encaixar), mas `correcoes.length` continuava
  //    contando — o resumo dizia "16 folhas corrigidas" com 15 nos cartões, e
  //    não havia como descobrir de onde vinha a diferença.
  //
  // 2. Filtrar ou buscar não mexia em número nenhum. Você clicava em
  //    "Aguardando você", a lista encolhia para um cartão, e o resumo
  //    continuava dizendo "1 atividade concluída" — que não estava em lugar
  //    nenhum da tela. É o que faz um resumo parecer quebrado mesmo quando a
  //    soma está certa: ele contradiz o que está logo acima dele.
  //
  // Agora tudo sai de `gruposFiltrados`, que é literalmente o que foi
  // desenhado. O resumo não pode discordar da lista porque é a mesma fonte.
  // ---------------------------------------------------------------------------
  const filtrando = filtroAtivo !== "Todas" || busca.trim().length > 0;

  const totalConcluidas = gruposFiltrados.filter(
    (g) => g.status === "concluida",
  ).length;
  const totalPendentes = gruposFiltrados.filter(
    (g) => g.status === "pendente",
  ).length;
  const totalFolhas = gruposFiltrados.reduce((s, g) => s + g.total, 0);
  const folhasRevisadas = gruposFiltrados.reduce((s, g) => s + g.concluidas, 0);

  const RESUMO = [
    {
      valor: String(totalConcluidas),
      rotulo: "Atividades concluídas",
      icone: "checkmark-circle",
      cor: COR.ok,
    },
    {
      valor: String(totalPendentes),
      rotulo: "Aguardando você",
      icone: "time-outline",
      cor: COR.avisoTexto,
    },
    {
      valor: String(folhasRevisadas),
      rotulo: "Folhas revisadas",
      icone: "create-outline",
      cor: COR.marcador,
    },
    {
      valor: String(totalFolhas),
      rotulo: "Folhas corrigidas",
      icone: "layers-outline",
      cor: COR.marcador,
    },
  ];

  // Esta tela não gera mais relatório. O lugar de salvar em PDF é dentro da
  // atividade (Editar correção), onde o professor escolhe se quer as notas, o
  // desempenho por questão ou os dois. Aqui só dava para gerar as notas, e
  // duas portas para a mesma coisa — uma delas sem as opções — é o tipo de
  // escolha que o professor faz errado uma vez e não entende por quê.
  return (
    <View style={styles.tela}>
      {!ehDesktop && <CabecalhoMobile comSino />}

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
                <Text style={styles.tituloPaginaDesktop}>Correções</Text>
              </TouchableOpacity>
            </View>
          )}

          {!ehDesktop && <Text style={styles.tituloPagina}>Correções</Text>}

          <View style={styles.buscaLinha}>
            <View
              style={[styles.buscaBox, ehDesktop && styles.buscaBoxDesktop]}
            >
              <Ionicons name="search" size={16} color={COR.tintaFraca} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar por atividade..."
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

            {ehDesktop && (
              <TouchableOpacity
                style={styles.botaoScannerDesktop}
                onPress={() => router.push("/scanner")}
              >
                <Ionicons name="camera-outline" size={19} color={COR.branco} />
                <Text style={styles.botaoScannerDesktopTexto}>
                  Ir para o Scanner
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filtrosLinha}>
            {FILTROS.map((filtro) => {
              const ativo = filtro === filtroAtivo;
              return (
                <TouchableOpacity
                  key={filtro}
                  onPress={() => setFiltroAtivo(filtro)}
                  style={[
                    styles.filtroPill,
                    ehDesktop && styles.filtroPillDesktop,
                    ativo && styles.filtroPillAtivo,
                  ]}
                >
                  <Text
                    style={[
                      styles.filtroTexto,
                      ehDesktop && styles.filtroTextoDesktop,
                      ativo && styles.filtroTextoAtivo,
                    ]}
                  >
                    {filtro}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {!!erro && <Text style={styles.erroFaixa}>{erro}</Text>}

          {carregando ? (
            <View style={styles.vazioBox}>
              <ActivityIndicator color={COR.marcador} />
              <Text style={styles.vazioTexto}>Carregando correções...</Text>
            </View>
          ) : (
            <View style={[styles.lista, ehDesktop && styles.listaDesktop]}>
              {gruposFiltrados.map((grupo) => {
                const status = CONFIG_STATUS[grupo.status];
                const visual = visualDaDisciplina(grupo.atividade.disciplina);

                // O cartão INTEIRO abre a atividade, e por isso ele próprio é
                // o TouchableOpacity. Antes havia uma View por fora e só o
                // topo respondia ao toque, porque o rodapé pertencia ao botão
                // de PDF; sem ele, não há mais razão para uma parte do cartão
                // responder e a outra não — nem para a camada a mais.
                return (
                  <TouchableOpacity
                    key={grupo.atividade.id_atividade}
                    activeOpacity={0.85}
                    onPress={() =>
                      router.push({
                        pathname: "/editar",
                        params: {
                          id_atividade: grupo.atividade.id_atividade,
                        },
                      })
                    }
                    style={[
                      styles.correcaoCard,
                      ehDesktop && styles.correcaoCardDesktop,
                    ]}
                  >
                    <View
                      style={[
                        styles.correcaoLinhaTopo,
                        ehDesktop && styles.correcaoLinhaTopoDesktop,
                      ]}
                    >
                      <View
                        style={[
                          styles.correcaoIconeCirculo,
                          ehDesktop && styles.correcaoIconeCirculoDesktop,
                          { backgroundColor: visual.corFundo },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={visual.icone}
                          size={ehDesktop ? 24 : 20}
                          color={visual.corIcone}
                        />
                      </View>

                      <View style={styles.correcaoTextos}>
                        <Text
                          style={[
                            styles.correcaoTitulo,
                            ehDesktop && styles.correcaoTituloDesktop,
                          ]}
                          numberOfLines={1}
                        >
                          {grupo.atividade.nome}
                        </Text>
                        <Text
                          style={[
                            styles.correcaoTurma,
                            ehDesktop && styles.correcaoTurmaDesktop,
                          ]}
                          numberOfLines={1}
                        >
                          {grupo.atividade.turma}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          ehDesktop && styles.statusBadgeDesktop,
                          { backgroundColor: status.corFundo },
                        ]}
                      >
                        <Ionicons
                          name={status.icone}
                          size={ehDesktop ? 14 : 12}
                          color={status.cor}
                        />
                        <Text
                          style={[
                            styles.statusBadgeTexto,
                            ehDesktop && styles.statusBadgeTextoDesktop,
                            { color: status.cor },
                          ]}
                        >
                          {status.rotulo}
                        </Text>
                      </View>

                      {/* Depois da pastilha, no fim da linha, como em
                            Turmas. COR.tintaFraca é o mesmo cinza do
                            subtítulo, que é com o que a setinha de Turmas é
                            desenhada (medi no print: #8795A0 nos dois). */}
                      <Ionicons
                        name="chevron-forward"
                        size={ehDesktop ? 20 : 18}
                        color={COR.tintaFraca}
                      />
                    </View>

                    <View style={styles.correcaoContagemLinha}>
                      <Ionicons
                        name={
                          grupo.status === "concluida"
                            ? "checkmark-circle-outline"
                            : "time-outline"
                        }
                        size={ehDesktop ? 15 : 13}
                        color={status.cor}
                      />
                      <Text
                        style={[
                          styles.correcaoContagemTexto,
                          ehDesktop && styles.correcaoContagemTextoDesktop,
                          { color: status.cor },
                        ]}
                      >
                        {grupo.status === "concluida"
                          ? `${grupo.total} ${grupo.total === 1 ? "folha corrigida e revisada" : "folhas corrigidas e revisadas"} por você`
                          : `${grupo.concluidas} de ${grupo.total} revisadas — as outras esperam você`}
                      </Text>

                      {/* A data subiu para esta linha. Com o PDF fora, o
                            rodapé ficaria sendo uma faixa só para ela — e uma
                            faixa que não faz nada embaixo de um cartão que a
                            setinha diz ser todo clicável confunde. Agora o
                            cartão inteiro é uma coisa só. */}
                      <Text
                        style={[
                          styles.correcaoData,
                          ehDesktop && styles.correcaoDataDesktop,
                        ]}
                      >
                        {grupo.quando}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {gruposFiltrados.length === 0 && (
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
                    {correcoes.length === 0
                      ? "Nenhuma folha foi corrigida ainda."
                      : "Nenhuma correção encontrada com esse filtro."}
                  </Text>
                  {correcoes.length === 0 && (
                    <TouchableOpacity
                      style={styles.botaoVazio}
                      onPress={() => router.push("/scanner")}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={16}
                        color={COR.branco}
                      />
                      <Text style={styles.botaoVazioTexto}>
                        Corrigir a primeira folha
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          <View
            style={[styles.resumoBox, ehDesktop && styles.resumoBoxDesktop]}
          >
            <Text
              style={[
                styles.resumoTitulo,
                ehDesktop && styles.resumoTituloDesktop,
              ]}
            >
              Resumo das correções
            </Text>

            {/* Sem esta linha, um resumo filtrado parece um resumo errado:
                os números batem com a lista, mas quem vê "Resumo das
                correções" espera o total de tudo. */}
            <Text
              style={[styles.resumoSub, ehDesktop && styles.resumoSubDesktop]}
            >
              {filtrando
                ? "Contando só o que está na lista acima"
                : "Todas as suas correções"}
            </Text>

            <View style={styles.resumoGrade}>
              {RESUMO.map((item) => (
                <View
                  key={item.rotulo}
                  style={[
                    styles.resumoItem,
                    ehDesktop && styles.resumoItemDesktop,
                  ]}
                >
                  <View
                    style={[
                      styles.resumoIconeCirculo,
                      ehDesktop && styles.resumoIconeCirculoDesktop,
                    ]}
                  >
                    <Ionicons
                      name={item.icone}
                      size={ehDesktop ? 20 : 16}
                      color={item.cor}
                    />
                  </View>
                  <View>
                    <Text
                      style={[
                        styles.resumoValor,
                        ehDesktop && styles.resumoValorDesktop,
                      ]}
                    >
                      {item.valor}
                    </Text>
                    <Text
                      style={[
                        styles.resumoRotulo,
                        ehDesktop && styles.resumoRotuloDesktop,
                      ]}
                    >
                      {item.rotulo}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 14,
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

  botaoScannerDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  botaoScannerDesktopTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 14.5,
    fontWeight: "700",
  },

  // -------------------------------------------------------------------------
  // Tamanhos só do computador.
  //
  // Esta tela desenha o mesmo JSX nas duas larguras, então cada estilo daqui
  // entra empilhado por cima do compartilhado:
  // [styles.correcaoTitulo, ehDesktop && styles.correcaoTituloDesktop].
  // O primeiro define, o segundo corrige, e o celular não passa por aqui.
  //
  // Mesmo arranjo do AUMENTO_DESKTOP da Home. Para ajustar o web, é só este
  // bloco.
  // -------------------------------------------------------------------------
  buscaBoxDesktop: { paddingHorizontal: 14, paddingVertical: 13 },
  buscaInputDesktop: { fontSize: 14.5 },
  filtroPillDesktop: { paddingHorizontal: 19, paddingVertical: 10 },
  filtroTextoDesktop: { fontSize: 14 },

  listaDesktop: { gap: 12 },
  // Sem borderRadius: só o espaçamento interno muda entre celular e
  // computador, o canto não.
  correcaoCardDesktop: { padding: 18 },
  correcaoLinhaTopoDesktop: { gap: 16 },
  correcaoIconeCirculoDesktop: { width: 48, height: 48, borderRadius: 16 },
  correcaoTituloDesktop: { fontSize: 15.5 },
  correcaoTurmaDesktop: { fontSize: 13, marginTop: 3 },
  statusBadgeDesktop: { paddingHorizontal: 11, paddingVertical: 7, gap: 5 },
  statusBadgeTextoDesktop: { fontSize: 12 },
  correcaoContagemTextoDesktop: { fontSize: 12.5 },
  correcaoDataDesktop: { fontSize: 12 },
  vazioTextoDesktop: { fontSize: 14.5 },

  filtrosLinha: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filtroPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COR.linhaSuave,
  },
  filtroPillAtivo: { backgroundColor: COR.marinho },
  filtroTexto: {
    fontFamily: FONTE.semi,
    fontSize: 12.5,
    fontWeight: "600",
    color: COR.tintaMedia,
  },
  filtroTextoAtivo: { color: COR.branco },

  erroFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },

  lista: { width: "100%", gap: 10, marginBottom: 20 },
  correcaoCard: {
    backgroundColor: COR.branco,
    // RAIO.superficie, o raio de cartão do app, em vez do 14 escrito à mão
    // que estava aqui (e do 16 que estava no estilo de computador — o mesmo
    // cartão mudava de canto ao abrir no notebook). Medi no print de Turmas:
    // 12px. Mudando em estilo.js, todos os cartões acompanham.
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 14,
  },
  correcaoLinhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  correcaoIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  correcaoTextos: { flex: 1, minWidth: 0 },
  correcaoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 13.5,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  correcaoTurma: {
    fontFamily: FONTE.regular,
    fontSize: 11.5,
    color: COR.tintaFraca,
    marginTop: 2,
  },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: RAIO.controle,
    flexShrink: 0,
  },
  statusBadgeTexto: {
    fontFamily: FONTE.bold,
    fontSize: 10.5,
    fontWeight: "700",
  },

  correcaoContagemLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  correcaoContagemTexto: {
    flex: 1,
    fontFamily: FONTE.semi,
    fontSize: 10.5,
    fontWeight: "600",
  },

  correcaoData: {
    fontFamily: FONTE.regular,
    fontSize: 10,
    color: COR.tintaFraca,
  },

  vazioBox: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
    width: "100%",
  },
  vazioTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaFraca,
    textAlign: "center",
  },
  botaoVazio: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 4,
  },
  botaoVazioTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 12.5,
    fontWeight: "700",
  },

  resumoBox: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 18,
    marginBottom: 20,
  },
  resumoBoxDesktop: { padding: 28 },
  resumoTitulo: {
    fontFamily: FONTE.bold,
    fontSize: 14,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  resumoTituloDesktop: { fontSize: 17 },
  resumoSub: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 3,
    marginBottom: 14,
  },
  resumoSubDesktop: { fontSize: 12.5, marginBottom: 22 },
  resumoGrade: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
    columnGap: 12,
  },
  resumoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    width: "46%",
  },
  resumoItemDesktop: { width: "23%", gap: 12 },
  resumoIconeCirculo: { alignItems: "center", justifyContent: "center" },
  resumoIconeCirculoDesktop: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COR.fundo,
  },
  resumoValor: {
    fontFamily: FONTE.bold,
    fontSize: 15,
    fontWeight: "700",
    color: COR.tintaForte,
  },
  resumoValorDesktop: { fontSize: 22 },
  resumoRotulo: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
  },
  resumoRotuloDesktop: { fontSize: 12.5, marginTop: 2 },
});