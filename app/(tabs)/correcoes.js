import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import { COR, FONTE, RAIO } from "../../components/estilo";
import * as Print from "expo-print";
import { listarCorrecoes } from "../../constants/api";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

// "Em processamento" saiu da lista de propósito. No sistema de verdade a IA
// termina de corrigir antes de gravar, então nenhuma correção fica nesse
// estado — o filtro nunca acharia nada e só ocuparia espaço.
const FILTROS = ["Todas", "Aguardando você", "Concluídas"];

// ---------------------------------------------------------------------------
// Mesma regra de ícone do Scanner e da tela de Atividades: ele sai da
// disciplina, não do banco. Assim a mesma atividade aparece igual nas três.
// ---------------------------------------------------------------------------
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

  const achou = POR_DISCIPLINA.find((grupo) =>
    grupo.termos.some((termo) => nome.includes(termo))
  );

  return achou
    ? { icone: achou.icone, corFundo: achou.corFundo, corIcone: achou.corIcone }
    : VISUAL_PADRAO;
}

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

function formatarNota(valor) {
  return Number(valor ?? 0).toFixed(1).replace(".", ",");
}

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
// A API devolve uma correção por aluno. A tela mostra por atividade, com os
// alunos dentro — então o agrupamento acontece aqui.
//
// Correção cuja atividade foi apagada é descartada: sem atividade não há
// cartão onde encaixar, e mostrar um cartão "sem nome" confunde mais do que
// esconder.
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
      (a, b) => (a.aluno?.numero_chamada ?? 999) - (b.aluno?.numero_chamada ?? 999)
    );

    const concluidas = alunos.filter((a) => a.status === "concluida").length;
    const soma = alunos.reduce((s, a) => s + Number(a.nota ?? 0), 0);

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
      media: alunos.length ? soma / alunos.length : 0,
      peso_total: alunos[0]?.peso_total ?? 10,
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

// ---------------------------------------------------------------------------
// O PDF é montado como HTML e mandado para a impressão do sistema, onde
// "Salvar como PDF" é uma das opções. É o mesmo caminho no navegador e no
// celular, e não precisa de servidor gerando arquivo.
//
// escapar() existe porque nome de aluno e de atividade vêm do banco: um "&"
// ou um "<" solto quebraria o HTML do relatório.
// ---------------------------------------------------------------------------
function escapar(texto) {
  return String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function montarHtmlDoResumo(grupos) {
  const hoje = new Date().toLocaleDateString("pt-BR");

  const folhas = grupos.reduce((s, g) => s + g.total, 0);
  const revisadas = grupos.reduce((s, g) => s + g.concluidas, 0);

  const titulo =
    grupos.length === 1
      ? `${escapar(grupos[0].atividade.nome)} — correções`
      : "Resumo das correções";

  const secoes = grupos
    .map((g) => {
      const linhas = g.alunos
        .map(
          (c) => `
          <tr>
            <td>${escapar(c.aluno?.nome || "Aluno")}</td>
            <td class="nota">${formatarNota(c.nota)} / ${formatarNota(c.peso_total)}</td>
            <td class="status">${c.status === "concluida" ? "revisada" : "aguardando revisão"}</td>
          </tr>`
        )
        .join("");

      // Com uma atividade só, o nome dela já está no título lá em cima —
      // repetir aqui só ocupa linha.
      const cabecalho =
        grupos.length === 1 ? "" : `<h2>${escapar(g.atividade.nome)}</h2>`;

      return `
        <section>
          ${cabecalho}
          <p class="sub">${escapar(g.atividade.turma)} · ${g.concluidas} de ${g.total} revisadas · média ${formatarNota(g.media)}</p>
          <table>
            <thead>
              <tr><th>Aluno</th><th class="nota">Nota</th><th class="status">Situação</th></tr>
            </thead>
            <tbody>${linhas}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>EduSync — Resumo das correções</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #17242E;
    margin: 32px;
  }
  header { border-bottom: 2px solid #0B1E3D; padding-bottom: 12px; margin-bottom: 22px; }
  h1 { font-size: 19px; margin: 0; color: #0B1E3D; }
  header p { margin: 4px 0 0; font-size: 12px; color: #8795A0; }
  section { margin-bottom: 26px; page-break-inside: avoid; }
  h2 { font-size: 14px; margin: 0 0 2px; }
  .sub { margin: 0 0 8px; font-size: 11px; color: #8795A0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #E9EEF0; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: .4px; color: #8795A0; }
  .nota { text-align: right; white-space: nowrap; }
  .status { text-align: right; color: #55646F; white-space: nowrap; }
  footer { margin-top: 30px; font-size: 10px; color: #8795A0; border-top: 1px solid #E9EEF0; padding-top: 10px; }
</style>
</head>
<body>
  <header>
    <h1>${titulo}</h1>
    <p>EduSync · gerado em ${hoje} · ${folhas} ${folhas === 1 ? "folha" : "folhas"} · ${revisadas} ${revisadas === 1 ? "revisada" : "revisadas"}</p>
  </header>
  ${secoes || "<p>Nenhuma correção no período.</p>"}
  <footer>
    As notas foram calculadas pelo sistema a partir do gabarito cadastrado e
    revisadas pelo professor. Documento gerado automaticamente pelo EduSync.
  </footer>
</body>
</html>`;
}

export default function Correcoes() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  const { atividadeTitulo } = useLocalSearchParams();

  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState(
    atividadeTitulo ? String(atividadeTitulo) : ""
  );

  const [correcoes, setCorrecoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [abertas, setAbertas] = useState({});
  const [gerando, setGerando] = useState(null);

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
    }, [])
  );

  const grupos = agruparPorAtividade(correcoes);

  const gruposFiltrados = grupos.filter(
    (g) =>
      grupoCombinaComFiltro(g, filtroAtivo) &&
      g.atividade.nome.toLowerCase().includes(busca.toLowerCase())
  );

  const totalConcluidas = grupos.filter((g) => g.status === "concluida").length;
  const totalPendentes = grupos.filter((g) => g.status === "pendente").length;
  const totalFolhas = correcoes.length;
  const folhasRevisadas = correcoes.filter((c) => c.status === "concluida").length;

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

  // ---------------------------------------------------------------------------
  // Gera o PDF de UMA atividade.
  //
  // No navegador o Print.printAsync do expo-print acaba mandando a própria
  // página para a impressora em vez do HTML que passamos — sai a tela do app,
  // com menu lateral e tudo. Por isso no web abrimos uma janela nova, escrevemos
  // o relatório nela e mandamos imprimir dali. No celular o expo-print funciona
  // como deveria.
  // ---------------------------------------------------------------------------
  async function salvarPdf(grupo) {
    if (gerando) return;

    setGerando(grupo.atividade.id_atividade);
    setErro("");

    const html = montarHtmlDoResumo([grupo]);

    try {
      if (Platform.OS === "web") {
        const janela = window.open("", "_blank");

        if (!janela) {
          setErro(
            "O navegador bloqueou a janela do relatório. Libere os pop-ups para este site e tente de novo."
          );
          return;
        }

        janela.document.write(html);
        janela.document.close();
        janela.focus();
        // Um instante para o navegador desenhar antes de abrir a impressão,
        // senão em alguns casos ele imprime a folha ainda em branco.
        setTimeout(() => janela.print(), 250);
      } else {
        await Print.printAsync({ html });
      }
    } catch (e) {
      if (e?.message && !/cancel|dismiss/i.test(e.message)) {
        setErro("Não consegui gerar o PDF: " + e.message);
      }
    } finally {
      setGerando(null);
    }
  }

  function alternar(id) {
    setAbertas((atual) => ({ ...atual, [id]: !atual[id] }));
  }

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
        <View
          style={[
            ehDesktop ? styles.miolo : { width: "100%" },
            ehTelaLarga && { maxWidth: 1300 },
          ]}
        >
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
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color={COR.tintaFraca} />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar por atividade..."
                placeholderTextColor={COR.tintaFraca}
                style={styles.buscaInput}
              />
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color={COR.tintaFraca} />
                </TouchableOpacity>
              )}
            </View>

            {ehDesktop && (
              <TouchableOpacity
                style={styles.botaoScannerDesktop}
                onPress={() => router.push("/scanner")}
              >
                <Ionicons name="camera-outline" size={17} color={COR.branco} />
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
                  style={[styles.filtroPill, ativo && styles.filtroPillAtivo]}
                >
                  <Text
                    style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}
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
            <View style={styles.lista}>
              {gruposFiltrados.map((grupo) => {
                const status = CONFIG_STATUS[grupo.status];
                const visual = visualDaDisciplina(grupo.atividade.disciplina);
                const aberta = !!abertas[grupo.atividade.id_atividade];

                return (
                  <View
                    key={grupo.atividade.id_atividade}
                    style={[styles.correcaoCard, !ehDesktop && styles.correcaoCardMobile]}
                  >
                    {/* O topo abre a atividade inteira; o rodapé continua
                        sendo do cartão (expandir e exportar). */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/editar",
                          params: { id_atividade: grupo.atividade.id_atividade },
                        })
                      }
                    >
                      <View style={styles.correcaoLinhaTopo}>
                        <View
                          style={[
                            styles.correcaoIconeCirculo,
                            { backgroundColor: visual.corFundo },
                          ]}
                        >
                          <MaterialCommunityIcons
                            name={visual.icone}
                            size={20}
                            color={visual.corIcone}
                          />
                        </View>

                        <View style={styles.correcaoTextos}>
                          <Text style={styles.correcaoTitulo} numberOfLines={1}>
                            {grupo.atividade.nome}
                          </Text>
                          <Text style={styles.correcaoTurma} numberOfLines={1}>
                            {grupo.atividade.turma}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: status.corFundo },
                          ]}
                        >
                          <Ionicons name={status.icone} size={12} color={status.cor} />
                          <Text
                            style={[styles.statusBadgeTexto, { color: status.cor }]}
                          >
                            {status.rotulo}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.correcaoContagemLinha}>
                        <Ionicons
                          name={
                            grupo.status === "concluida"
                              ? "checkmark-circle-outline"
                              : "time-outline"
                          }
                          size={13}
                          color={status.cor}
                        />
                        <Text
                          style={[styles.correcaoContagemTexto, { color: status.cor }]}
                        >
                          {grupo.status === "concluida"
                            ? `${grupo.total} ${grupo.total === 1 ? "folha corrigida e revisada" : "folhas corrigidas e revisadas"} por você`
                            : `${grupo.concluidas} de ${grupo.total} revisadas — as outras esperam você`}
                        </Text>
                      </View>

                    </TouchableOpacity>

                    <View style={styles.correcaoRodapeLinha}>
                        <Text style={styles.correcaoData}>
                          {grupo.quando}
                          {grupo.total > 0
                            ? ` · média ${formatarNota(grupo.media)}`
                            : ""}
                        </Text>

                        <View style={styles.acoesCartao}>
                          <TouchableOpacity
                            style={styles.botaoPdf}
                            activeOpacity={0.8}
                            disabled={!!gerando}
                            onPress={() => salvarPdf(grupo)}
                          >
                            <Ionicons
                              name="download-outline"
                              size={14}
                              color={COR.marcador}
                            />
                            <Text style={styles.botaoPdfTexto}>
                              {gerando === grupo.atividade.id_atividade
                                ? "Gerando..."
                                : "PDF"}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.verAlunos}
                            activeOpacity={0.7}
                            onPress={() => alternar(grupo.atividade.id_atividade)}
                          >
                            <Text style={styles.verAlunosTexto}>
                              {aberta
                                ? "Esconder alunos"
                                : grupo.total === 1
                                ? "Ver 1 aluno"
                                : `Ver ${grupo.total} alunos`}
                            </Text>
                            <Ionicons
                              name={aberta ? "chevron-up" : "chevron-down"}
                              size={14}
                              color={COR.marcador}
                            />
                          </TouchableOpacity>
                        </View>
                    </View>

                    {aberta && (
                      <View style={styles.listaAlunos}>
                        {grupo.alunos.map((c) => (
                          <TouchableOpacity
                            key={c.id_correcao}
                            style={styles.linhaAluno}
                            activeOpacity={0.7}
                            onPress={() =>
                              router.push({
                                pathname: "/revisar",
                                params: { id_correcao: c.id_correcao },
                              })
                            }
                          >
                            <Ionicons
                              name={
                                c.status === "concluida"
                                  ? "checkmark-done"
                                  : "time-outline"
                              }
                              size={14}
                              color={c.status === "concluida" ? COR.ok : COR.marcador}
                            />
                            <Text style={styles.nomeAluno} numberOfLines={1}>
                              {c.aluno?.nome || "Aluno"}
                            </Text>
                            <Text style={styles.notaAluno}>
                              {formatarNota(c.nota)}
                              <Text style={styles.notaAlunoPeso}>
                                {" "}
                                / {formatarNota(c.peso_total)}
                              </Text>
                            </Text>
                            <Ionicons
                              name="chevron-forward"
                              size={14}
                              color={COR.chevron}
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {gruposFiltrados.length === 0 && (
                <View style={styles.vazioBox}>
                  <Ionicons
                    name="document-text-outline"
                    size={28}
                    color={COR.tintaFraca}
                  />
                  <Text style={styles.vazioTexto}>
                    {correcoes.length === 0
                      ? "Nenhuma folha foi corrigida ainda."
                      : "Nenhuma correção encontrada com esse filtro."}
                  </Text>
                  {correcoes.length === 0 && (
                    <TouchableOpacity
                      style={styles.botaoVazio}
                      onPress={() => router.push("/scanner")}
                    >
                      <Ionicons name="camera-outline" size={16} color={COR.branco} />
                      <Text style={styles.botaoVazioTexto}>
                        Corrigir a primeira folha
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={[styles.resumoBox, ehDesktop && styles.resumoBoxDesktop]}>
            <Text
              style={[styles.resumoTitulo, ehDesktop && styles.resumoTituloDesktop]}
            >
              Resumo das correções
            </Text>
            <View style={styles.resumoGrade}>
              {RESUMO.map((item) => (
                <View
                  key={item.rotulo}
                  style={[styles.resumoItem, ehDesktop && styles.resumoItemDesktop]}
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
                      style={[styles.resumoValor, ehDesktop && styles.resumoValorDesktop]}
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
    fontSize: 20,
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

  buscaLinha: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
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
    gap: 6,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoScannerDesktopTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 13,
    fontWeight: "700",
  },

  acoesCartao: { flexDirection: "row", alignItems: "center", gap: 12 },
  botaoPdf: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: COR.linha,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  botaoPdfTexto: {
    fontFamily: FONTE.bold,
    fontSize: 11,
    fontWeight: "700",
    color: COR.marcador,
  },

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
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COR.linhaSuave,
    padding: 14,
  },
  correcaoCardMobile: { gap: 10 },
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
  statusBadgeTexto: { fontFamily: FONTE.bold, fontSize: 10.5, fontWeight: "700" },

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

  correcaoRodapeLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  correcaoData: { fontFamily: FONTE.regular, fontSize: 10, color: COR.tintaFraca },
  verAlunos: { flexDirection: "row", alignItems: "center", gap: 4 },
  verAlunosTexto: {
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    fontWeight: "700",
    color: COR.marcador,
  },

  listaAlunos: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: COR.linhaSuave,
  },
  linhaAluno: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  nomeAluno: {
    flex: 1,
    fontFamily: FONTE.media,
    fontSize: 12.5,
    color: COR.tintaForte,
  },
  notaAluno: { fontFamily: FONTE.bold, fontSize: 13, color: COR.tintaForte },
  notaAlunoPeso: {
    fontFamily: FONTE.regular,
    fontSize: 10.5,
    color: COR.tintaFraca,
  },

  vazioBox: { alignItems: "center", gap: 10, paddingVertical: 40, width: "100%" },
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
    marginBottom: 14,
  },
  resumoTituloDesktop: { fontSize: 17, marginBottom: 22 },
  resumoGrade: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
    columnGap: 12,
  },
  resumoItem: { flexDirection: "row", alignItems: "center", gap: 8, width: "46%" },
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
  resumoRotulo: { fontFamily: FONTE.regular, fontSize: 10.5, color: COR.tintaFraca },
  resumoRotuloDesktop: { fontSize: 12.5, marginTop: 2 },
});