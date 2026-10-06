import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
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
import IconeEdusync from "../../components/IconeEdusync";
import {
  buscarPerfil,
  listarAtividades,
  listarCorrecoes,
  listarTurmas,
} from "../../constants/api";

// ---------------------------------------------------------------------------
// O amarelo fica em UM botão só: o "Revisar", dentro do bloco escuro.
//
// É a ação mais urgente da tela — tem folha de aluno esperando. Amarelo sobre
// o azul-marinho do bloco salta à vista, e a letra continua marinho: contraste
// 8,6, se lê de longe e no projetor.
//
// O "Nova atividade" voltou a ser o que era (marinho no computador, branco com
// contorno no celular). Dois botões amarelos na mesma tela disputariam a
// atenção, e nenhum dos dois seria o destaque.
// ---------------------------------------------------------------------------
const AMARELO = "#EAB308";

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

// O cabeçalho fica melhor com o primeiro nome. "Bom dia, Ana Carolina Silva"
// ocupa duas linhas e não soa como alguém falando com você.
function primeiroNome(nome) {
  return (
    String(nome ?? "")
      .trim()
      .split(/\s+/)[0] || ""
  );
}

const DIAS = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function dataDeHoje() {
  const hoje = new Date();
  return `${DIAS[hoje.getDay()]}, ${hoje.getDate()} de ${MESES[hoje.getMonth()]}`;
}

function quandoFoi(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";

  const dias = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(data).setHours(0, 0, 0, 0)) /
      86400000,
  );

  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  if (dias < 30) return `Há ${dias} dias`;
  return data.toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// Uma correção está pendente até o professor fechar a revisão dela. O que
// interessa na Home não é a folha solta, é a atividade que ainda tem folhas
// esperando — por isso as correções são agrupadas por atividade.
// ---------------------------------------------------------------------------
function pendentesPorAtividade(correcoes) {
  const porAtividade = new Map();

  for (const correcao of correcoes) {
    if (correcao.status === "concluida") continue;

    const atividade = correcao.atividade;
    if (!atividade) continue;

    const atual = porAtividade.get(atividade.id_atividade);

    if (atual) {
      atual.folhas += 1;
    } else {
      porAtividade.set(atividade.id_atividade, {
        id: atividade.id_atividade,
        atividade: atividade.nome,
        turma: atividade.turma || "",
        folhas: 1,
      });
    }
  }

  return [...porAtividade.values()].sort((a, b) => b.folhas - a.folhas);
}

export default function Home() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

  const [buscaHome, setBuscaHome] = useState("");
  const [professor, setProfessor] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [atividades, setAtividades] = useState([]);
  const [correcoes, setCorrecoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  // useFocusEffect e não useEffect: a Home é tela de aba e não é desmontada ao
  // navegar. Com useEffect([]) os números ficariam congelados no valor de
  // quando o app abriu, e corrigir uma folha não mudaria nada aqui.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      async function carregar() {
        setCarregando(true);
        setErro("");

        try {
          // Em paralelo, e cada uma com a sua própria rede de segurança: se a
          // lista de correções falhar, a Home ainda mostra turmas e
          // atividades em vez de virar uma tela de erro inteira.
          const [perfil, listaTurmas, listaAtividades, listaCorrecoes] =
            await Promise.all([
              buscarPerfil().catch(() => null),
              listarTurmas().catch(() => []),
              listarAtividades().catch(() => []),
              listarCorrecoes().catch(() => []),
            ]);

          if (!ativo) return;

          setProfessor(perfil);
          setTurmas(listaTurmas || []);
          setAtividades(listaAtividades || []);
          setCorrecoes(listaCorrecoes || []);
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

  const nome = primeiroNome(professor?.nome) || "professor";

  const pendentes = pendentesPorAtividade(correcoes);
  const temPendentes = pendentes.length > 0;

  const recentes = [...atividades]
    .sort((a, b) => b.id_atividade - a.id_atividade)
    .slice(0, 4);

  const nomeDaTurma = useCallback(
    (id_turma) => turmas.find((t) => t.id_turma === id_turma)?.nome || "",
    [turmas],
  );

  const atalhos = [
    {
      chave: "turmas",
      titulo: "Turmas",
      valor: String(turmas.length),
      icone: "turmas",
      rota: "/turmas",
    },
    {
      chave: "atividades",
      titulo: "Atividades",
      valor: String(atividades.length),
      icone: "atividades",
      rota: "/atividades",
    },
    {
      chave: "scanner",
      titulo: "Scanner",
      icone: "scanner",
      rota: "/scanner",
    },
    {
      chave: "correcoes",
      titulo: "Correções",
      selo: temPendentes
        ? `${pendentes.reduce((total, p) => total + p.folhas, 0)} a revisar`
        : null,
      valor: String(correcoes.length),
      icone: "correcoes",
      rota: "/correcoes",
    },
  ];

  // A busca é montada com o que existe no banco, não com uma lista fixa.
  const indiceBusca = [
    ...turmas.map((t) => ({
      tipo: "turma",
      id: t.id_turma,
      titulo: t.nome,
      subtitulo: t.escola || `${t.alunos ?? 0} alunos`,
    })),
    ...atividades.map((a) => ({
      tipo: "atividade",
      id: a.id_atividade,
      titulo: a.nome,
      subtitulo: a.disciplina || nomeDaTurma(a.id_turma) || "Atividade",
    })),
  ];

  const buscaNormalizada = buscaHome.trim().toLowerCase();
  const resultadosBusca = buscaNormalizada
    ? indiceBusca.filter((item) =>
        item.titulo.toLowerCase().includes(buscaNormalizada),
      )
    : [];

  function abrirResultado(item) {
    setBuscaHome("");
    router.push({
      pathname: item.tipo === "turma" ? "/turma" : "/atividade",
      params: { id: item.id },
    });
  }

  function abrirAtividade(id_atividade) {
    router.push({ pathname: "/atividade", params: { id: id_atividade } });
  }

  function abrirTurma(id_turma) {
    router.push({ pathname: "/turma", params: { id: id_turma } });
  }

  // -------------------------------------------------------------- desktop
  if (ehDesktop) {
    return (
      <View style={styles.telaDesktop}>
        <ScrollView
          style={styles.conteudo}
          contentContainerStyle={styles.conteudoDesktop}
        >
          <View style={styles.miolo}>
            <View style={styles.cabecalhoLinha}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.dataDesktop}>{dataDeHoje()}</Text>
                <Text style={styles.saudacaoDesktop}>
                  {saudacao()}, {nome}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.botaoNovaDesktop}
                activeOpacity={0.85}
                onPress={() => router.push("/criar-atividade")}
              >
                <Ionicons name="add" size={18} color={COR.branco} />
                <Text style={styles.botaoNovaDesktopTexto}>Nova atividade</Text>
              </TouchableOpacity>
            </View>

            {!!erro && <Text style={styles.erroFaixa}>{erro}</Text>}

            {carregando ? (
              <View style={styles.carregandoBloco}>
                <ActivityIndicator color={COR.marcador} />
                <Text
                  style={[
                    styles.carregandoTexto,
                    styles.carregandoTextoDesktop,
                  ]}
                >
                  Carregando...
                </Text>
              </View>
            ) : temPendentes ? (
              <View
                style={[styles.blocoPendentes, styles.blocoPendentesDesktop]}
              >
                <Text style={[styles.blocoTitulo, styles.blocoTituloDesktop]}>
                  {pendentes.length}{" "}
                  {pendentes.length === 1 ? "atividade" : "atividades"} com
                  folhas para revisar
                </Text>

                {pendentes.map((item, indice) => (
                  <View
                    key={item.id}
                    style={[
                      styles.blocoLinha,
                      styles.blocoLinhaDesktop,
                      indice === 0 && styles.blocoLinhaPrimeira,
                      indice === 0 && styles.blocoLinhaPrimeiraDesktop,
                    ]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[styles.blocoNome, styles.blocoNomeDesktop]}
                        numberOfLines={1}
                      >
                        {item.atividade}
                      </Text>
                      <Text
                        style={[styles.blocoMeta, styles.blocoMetaDesktop]}
                        numberOfLines={1}
                      >
                        {item.turma ? `${item.turma} · ` : ""}
                        {item.folhas} {item.folhas === 1 ? "folha" : "folhas"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.botaoRevisar, styles.botaoRevisarDesktop]}
                      activeOpacity={0.8}
                      onPress={() =>
                        router.push({
                          pathname: "/editar",
                          params: { id_atividade: item.id },
                        })
                      }
                    >
                      <Text
                        style={[
                          styles.botaoRevisarTexto,
                          styles.botaoRevisarTextoDesktop,
                        ]}
                      >
                        Revisar
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={[styles.blocoVazio, styles.blocoVazioDesktop]}>
                <Text
                  style={[
                    styles.blocoVazioTitulo,
                    styles.blocoVazioTituloDesktop,
                  ]}
                >
                  Nada para revisar
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push("/scanner")}
                >
                  <Text
                    style={[
                      styles.blocoVazioLink,
                      styles.blocoVazioLinkDesktop,
                    ]}
                  >
                    Escanear uma folha
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={[styles.secao, styles.secaoDesktop]}>
              <View style={styles.secaoCabecalho}>
                <Text style={[styles.secaoTitulo, styles.secaoTituloDesktop]}>
                  Suas turmas
                </Text>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => router.push("/turmas")}
                >
                  <Text style={[styles.verTodas, styles.verTodasDesktop]}>
                    Ver todas
                  </Text>
                </TouchableOpacity>
              </View>

              {turmas.slice(0, 4).map((turma) => (
                <TouchableOpacity
                  key={turma.id_turma}
                  style={[styles.linhaTurma, styles.linhaTurmaDesktop]}
                  activeOpacity={0.55}
                  onPress={() => abrirTurma(turma.id_turma)}
                >
                  <IconeEdusync
                    nome="turmas"
                    tamanho={20}
                    cor={COR.tintaFraca}
                    style={styles.iconeTurma}
                  />
                  <Text
                    style={[styles.turmaNome, styles.turmaNomeDesktop]}
                    numberOfLines={1}
                  >
                    {turma.nome}
                  </Text>
                  <Text
                    style={[styles.turmaSerie, styles.turmaSerieDesktop]}
                    numberOfLines={1}
                  >
                    {turma.escola || ""}
                  </Text>
                  <Text style={[styles.turmaAlunos, styles.turmaAlunosDesktop]}>
                    {turma.alunos ?? 0}{" "}
                    {(turma.alunos ?? 0) === 1 ? "aluno" : "alunos"}
                  </Text>
                </TouchableOpacity>
              ))}

              {!carregando && turmas.length === 0 && (
                <Text style={[styles.listaVazia, styles.listaVaziaDesktop]}>
                  Nenhuma turma cadastrada ainda.
                </Text>
              )}
            </View>

            <View style={[styles.secao, styles.secaoDesktop]}>
              <View style={styles.secaoCabecalho}>
                <Text style={[styles.secaoTitulo, styles.secaoTituloDesktop]}>
                  Atividades recentes
                </Text>
                <TouchableOpacity
                  activeOpacity={0.6}
                  onPress={() => router.push("/atividades")}
                >
                  <Text style={[styles.verTodas, styles.verTodasDesktop]}>
                    Ver todas
                  </Text>
                </TouchableOpacity>
              </View>

              {recentes.map((atividade) => (
                <TouchableOpacity
                  key={atividade.id_atividade}
                  style={[styles.linhaAtividade, styles.linhaAtividadeDesktop]}
                  activeOpacity={0.55}
                  onPress={() => abrirAtividade(atividade.id_atividade)}
                >
                  <Text
                    style={[
                      styles.atividadeQuando,
                      styles.atividadeQuandoDesktop,
                    ]}
                  >
                    {quandoFoi(atividade.criado_em)}
                  </Text>
                  <Text
                    style={[
                      styles.atividadeTitulo,
                      styles.atividadeTituloDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    {atividade.nome}
                  </Text>
                  <Text
                    style={[
                      styles.atividadeTurma,
                      styles.atividadeTurmaDesktop,
                    ]}
                    numberOfLines={1}
                  >
                    · {nomeDaTurma(atividade.id_turma)}
                  </Text>
                </TouchableOpacity>
              ))}

              {!carregando && recentes.length === 0 && (
                <Text style={[styles.listaVazia, styles.listaVaziaDesktop]}>
                  Nenhuma atividade criada ainda.
                </Text>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // --------------------------------------------------------------- mobile
  const primeiraPendente = pendentes[0];

  return (
    <View style={styles.tela}>
      <CabecalhoMobile />

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={styles.conteudoMobile}
      >
        <View style={styles.saudacaoBloco}>
          <Text style={styles.saudacaoMobile} numberOfLines={1}>
            {saudacao()}, {nome}
          </Text>
          <Text style={styles.dataMobile}>{dataDeHoje()}</Text>
        </View>

        <View style={styles.buscaBox}>
          <Ionicons name="search" size={16} color={COR.tintaFraca} />
          <TextInput
            value={buscaHome}
            onChangeText={setBuscaHome}
            placeholder="Buscar turma ou atividade"
            placeholderTextColor={COR.tintaFraca}
            style={styles.buscaInput}
          />
          {buscaHome.length > 0 && (
            <TouchableOpacity onPress={() => setBuscaHome("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={COR.tintaFraca} />
            </TouchableOpacity>
          )}
        </View>

        {buscaNormalizada.length > 0 && (
          <View style={styles.resultadosBox}>
            {resultadosBusca.length === 0 ? (
              <Text style={styles.resultadoVazio}>
                Nada encontrado para &quot;{buscaHome}&quot;
              </Text>
            ) : (
              resultadosBusca.map((item) => (
                <TouchableOpacity
                  key={`${item.tipo}-${item.id}`}
                  style={styles.resultadoItem}
                  activeOpacity={0.6}
                  onPress={() => abrirResultado(item)}
                >
                  <Ionicons
                    name={
                      item.tipo === "turma"
                        ? "people-outline"
                        : "document-text-outline"
                    }
                    size={16}
                    color={COR.tintaMedia}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultadoTitulo} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.resultadoSubtitulo} numberOfLines={1}>
                      {item.tipo === "turma" ? "Turma" : "Atividade"} ·{" "}
                      {item.subtitulo}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={15}
                    color={COR.chevron}
                  />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {!!erro && <Text style={styles.erroFaixa}>{erro}</Text>}

        <View style={styles.destaque}>
          {carregando ? (
            <View style={styles.carregandoLinha}>
              <ActivityIndicator size="small" color={COR.marcador} />
              <Text style={styles.destaqueSub}>Carregando...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.destaqueNumero}>
                {temPendentes
                  ? `${pendentes.reduce((t, p) => t + p.folhas, 0)} ${
                      pendentes.reduce((t, p) => t + p.folhas, 0) === 1
                        ? "folha"
                        : "folhas"
                    }`
                  : "Nada pendente"}
              </Text>

              <Text style={styles.destaqueSub}>
                {temPendentes
                  ? `${primeiraPendente.atividade}${
                      primeiraPendente.turma
                        ? ` · ${primeiraPendente.turma}`
                        : ""
                    }`
                  : "Escaneie uma folha para começar."}
              </Text>
            </>
          )}

          <TouchableOpacity
            style={styles.botaoPrimario}
            activeOpacity={0.85}
            onPress={() =>
              temPendentes
                ? router.push({
                    pathname: "/editar",
                    params: { id_atividade: primeiraPendente.id },
                  })
                : router.push("/scanner")
            }
          >
            <Text style={styles.botaoPrimarioTexto}>
              {temPendentes ? "Revisar agora" : "Escanear atividade"}
            </Text>
            <Ionicons name="arrow-forward" size={15} color={COR.branco} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.botaoSecundario}
          activeOpacity={0.7}
          onPress={() => router.push("/criar-atividade")}
        >
          <Ionicons name="add" size={17} color={COR.tintaForte} />
          <Text style={styles.botaoSecundarioTexto}>Nova atividade</Text>
        </TouchableOpacity>

        <Text style={styles.secaoTituloMobile}>Acesso rápido</Text>
        <View style={styles.listaMobile}>
          {atalhos.map((item, indice) => (
            <TouchableOpacity
              key={item.chave}
              style={[
                styles.itemMobile,
                indice === atalhos.length - 1 && styles.linhaUltima,
              ]}
              activeOpacity={0.6}
              onPress={() => router.push(item.rota)}
            >
              <IconeEdusync
                nome={item.icone}
                tamanho={19}
                cor={COR.tintaMedia}
                style={styles.itemIcone}
              />
              <Text style={styles.itemTexto}>{item.titulo}</Text>

              {item.selo ? (
                <View style={styles.selo}>
                  <Text style={styles.seloTexto}>{item.selo}</Text>
                </View>
              ) : item.valor ? (
                <Text style={styles.itemNumero}>{item.valor}</Text>
              ) : null}

              <Ionicons name="chevron-forward" size={16} color={COR.chevron} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Tamanhos só do desktop.
//
// Quase tudo nesta tela é compartilhado entre o celular e o computador. Com a
// barra lateral maior, o miolo ficou pequeno perto dela — mas aumentar os
// estilos compartilhados aumentaria o celular junto, onde o tamanho já está
// certo.
//
// Então os estilos de baixo são aplicados SÓ no ramo do desktop, empilhados
// por cima dos compartilhados: [styles.blocoNome, styles.blocoNomeDesktop].
// O primeiro define, o segundo corrige. O celular nem passa por aqui.
// ---------------------------------------------------------------------------
const AUMENTO_DESKTOP = {
  blocoPendentesDesktop: {
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 8,
    marginBottom: 34,
  },
  blocoTituloDesktop: { fontSize: 19.5, marginBottom: 6 },
  blocoLinhaDesktop: { gap: 16, paddingVertical: 16 },
  blocoLinhaPrimeiraDesktop: { paddingTop: 13 },
  blocoNomeDesktop: { fontSize: 15.5 },
  blocoMetaDesktop: { fontSize: 13, marginTop: 3 },
  botaoRevisarDesktop: { paddingHorizontal: 18, paddingVertical: 10 },
  botaoRevisarTextoDesktop: { fontSize: 13.5 },

  blocoVazioDesktop: { padding: 26, marginBottom: 34 },
  blocoVazioTituloDesktop: { fontSize: 19.5 },
  blocoVazioLinkDesktop: { fontSize: 14.5, marginTop: 7 },

  secaoDesktop: { marginBottom: 32 },
  secaoTituloDesktop: { fontSize: 16 },
  verTodasDesktop: { fontSize: 13.5 },
  listaVaziaDesktop: { fontSize: 14, paddingVertical: 17 },
  carregandoTextoDesktop: { fontSize: 14.5 },

  linhaTurmaDesktop: { paddingVertical: 15 },
  turmaNomeDesktop: { fontSize: 15, width: 140 },
  turmaSerieDesktop: { fontSize: 14 },
  turmaAlunosDesktop: { fontSize: 14 },

  linhaAtividadeDesktop: { paddingVertical: 15 },
  atividadeQuandoDesktop: { fontSize: 14, width: 112 },
  atividadeTituloDesktop: { fontSize: 15 },
  atividadeTurmaDesktop: { fontSize: 14, marginLeft: 8 },
};

const styles = StyleSheet.create({
  ...AUMENTO_DESKTOP,
  tela: { flex: 1, backgroundColor: COR.fundo },
  telaDesktop: { flex: 1, backgroundColor: COR.branco },

  conteudo: { flex: 1 },
  conteudoMobile: { padding: 18, paddingBottom: 40 },
  conteudoDesktop: { padding: 34, paddingBottom: 40, alignItems: "center" },
  miolo: { width: "92%", maxWidth: 1100 },

  dataDesktop: {
    fontFamily: FONTE.regular,
    fontSize: 14,
    color: COR.tintaFraca,
    marginBottom: 4,
  },
  saudacaoDesktop: {
    fontFamily: FONTE.media,
    fontSize: 29,
    fontWeight: "500",
    color: COR.tintaForte,
    letterSpacing: -0.4,
  },

  // No celular a data foi para o outro lado: a saudação fica à esquerda e a
  // data se encosta à direita, na mesma linha de base. Uma linha em vez de
  // duas, e o topo da tela respira mais.
  saudacaoBloco: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
    width: "100%",
  },
  dataMobile: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
    marginBottom: 3,
    flexShrink: 0,
  },
  saudacaoMobile: {
    fontFamily: FONTE.media,
    fontSize: 21,
    fontWeight: "500",
    color: COR.tintaForte,
    flexShrink: 1,
  },
  cabecalhoLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 16,
    width: "100%",
    marginBottom: 22,
  },

  botaoNovaDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexShrink: 0,
  },
  botaoNovaDesktopTexto: {
    fontFamily: FONTE.semi,
    color: COR.branco,
    fontSize: 14.5,
    fontWeight: "600",
  },

  erroFaixa: {
    width: "100%",
    fontFamily: FONTE.media,
    fontSize: 12,
    color: COR.perigo,
    backgroundColor: COR.perigoFundo,
    borderRadius: RAIO.controle,
    padding: 12,
    marginBottom: 16,
    lineHeight: 17,
  },
  carregandoBloco: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 26,
    marginBottom: 30,
  },
  carregandoLinha: { flexDirection: "row", alignItems: "center", gap: 10 },
  carregandoTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaFraca,
  },
  listaVazia: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
    paddingVertical: 14,
  },

  blocoPendentes: {
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.superficie,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
    marginBottom: 30,
  },
  blocoTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 17,
    fontWeight: "600",
    color: COR.branco,
    marginBottom: 4,
  },
  blocoLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.13)",
  },
  blocoLinhaPrimeira: { borderTopWidth: 0, paddingTop: 10 },
  blocoNome: {
    fontFamily: FONTE.media,
    fontSize: 14,
    fontWeight: "500",
    color: COR.branco,
  },
  blocoMeta: {
    fontFamily: FONTE.regular,
    fontSize: 12,
    color: COR.marinhoClaro,
    marginTop: 2,
  },
  // O destaque da tela. Amarelo sobre o bloco azul-marinho, letra marinho.
  botaoRevisar: {
    backgroundColor: AMARELO,
    borderRadius: RAIO.controle,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexShrink: 0,
  },
  botaoRevisarTexto: {
    fontFamily: FONTE.semi,
    color: COR.marinho,
    fontSize: 12.5,
    fontWeight: "600",
  },

  blocoVazio: {
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.superficie,
    padding: 20,
    marginBottom: 30,
  },
  blocoVazioTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 17,
    fontWeight: "600",
    color: COR.branco,
  },
  blocoVazioLink: {
    fontFamily: FONTE.media,
    fontSize: 13,
    color: COR.marinhoClaro,
    marginTop: 6,
  },

  secao: { width: "100%", marginBottom: 26 },
  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  secaoTitulo: {
    fontFamily: FONTE.semi,
    fontSize: 14,
    fontWeight: "600",
    color: COR.tintaForte,
  },
  verTodas: { fontFamily: FONTE.regular, fontSize: 12, color: COR.tintaFraca },

  linhaTurma: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  iconeTurma: { marginRight: 11, flexShrink: 0 },
  turmaNome: {
    fontFamily: FONTE.semi,
    fontSize: 13.5,
    fontWeight: "600",
    color: COR.tintaForte,
    width: 110,
  },
  turmaSerie: {
    fontFamily: FONTE.regular,
    flex: 1,
    fontSize: 12.5,
    color: COR.tintaFraca,
  },
  turmaAlunos: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    flexShrink: 0,
  },

  linhaAtividade: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  atividadeQuando: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
    width: 92,
    flexShrink: 0,
  },
  atividadeTitulo: {
    fontFamily: FONTE.media,
    fontSize: 13.5,
    fontWeight: "500",
    color: COR.tintaForte,
    flexShrink: 1,
  },
  atividadeTurma: {
    fontFamily: FONTE.regular,
    flex: 1,
    fontSize: 12.5,
    color: COR.tintaFraca,
    marginLeft: 7,
  },

  buscaBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    width: "100%",
    backgroundColor: "#E3E8EA",
    borderRadius: RAIO.controle,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 18,
  },
  buscaInput: {
    fontFamily: FONTE.regular,
    flex: 1,
    fontSize: 13.5,
    color: COR.tintaForte,
    padding: 0,
  },

  resultadosBox: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linha,
    padding: 6,
    marginBottom: 18,
  },
  resultadoVazio: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaFraca,
    padding: 10,
    textAlign: "center",
  },
  resultadoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  resultadoTitulo: {
    fontFamily: FONTE.media,
    fontSize: 13.5,
    fontWeight: "500",
    color: COR.tintaForte,
  },
  resultadoSubtitulo: {
    fontFamily: FONTE.regular,
    fontSize: 11,
    color: COR.tintaFraca,
    marginTop: 1,
  },

  destaque: {
    width: "100%",
    backgroundColor: COR.branco,
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.superficie,
    padding: 17,
    marginBottom: 14,
  },
  destaqueNumero: {
    fontFamily: FONTE.semi,
    fontSize: 27,
    fontWeight: "600",
    color: COR.tintaForte,
    letterSpacing: -0.7,
  },
  destaqueSub: {
    fontFamily: FONTE.regular,
    fontSize: 12.5,
    color: COR.tintaMedia,
    marginTop: 3,
  },

  botaoPrimario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COR.marcador,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
    marginTop: 15,
  },
  botaoPrimarioTexto: {
    fontFamily: FONTE.semi,
    color: COR.branco,
    fontSize: 13.5,
    fontWeight: "600",
  },

  botaoSecundario: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: COR.branco,
    borderWidth: 1,
    borderColor: COR.linha,
    borderRadius: RAIO.controle,
    paddingVertical: 13,
    marginBottom: 24,
  },
  botaoSecundarioTexto: {
    fontFamily: FONTE.semi,
    color: COR.tintaForte,
    fontSize: 13.5,
    fontWeight: "600",
  },

  secaoTituloMobile: {
    fontFamily: FONTE.semi,
    fontSize: 14,
    fontWeight: "600",
    color: COR.tintaForte,
    marginBottom: 2,
  },
  listaMobile: { width: "100%" },
  itemMobile: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 15,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  linhaUltima: { borderBottomWidth: 0 },
  itemIcone: { width: 20, textAlign: "center" },
  itemTexto: {
    fontFamily: FONTE.media,
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: COR.tintaForte,
  },
  itemNumero: {
    fontFamily: FONTE.semi,
    fontSize: 14,
    fontWeight: "600",
    color: COR.tintaForte,
  },

  selo: {
    backgroundColor: COR.avisoFundo,
    borderRadius: RAIO.etiqueta,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  seloTexto: {
    fontFamily: FONTE.media,
    fontSize: 11,
    fontWeight: "500",
    color: COR.avisoTexto,
  },
});
