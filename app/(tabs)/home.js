import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { COR, FONTE, RAIO } from "../../components/estilo";
import IconeEdusync from "../../components/IconeEdusync";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

function saudacao() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

// API — GET /auth/me
const NOME_PROFESSOR = "Ana";

// Correções esperando o professor. É uma LISTA porque o desktop mostra os
// itens e o celular só conta quantos são.
//
// API — GET /correcoes?status=pendente
// A resposta já é uma lista, então dá pra jogar direto aqui:
//
//   const [pendentes, setPendentes] = useState([]);
//
//   useEffect(() => {
//     fetch("http://localhost:3000/correcoes?status=pendente", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then(setPendentes);
//   }, []);
const PENDENTES = [
  { id: 1, atividade: "Prova de Álgebra", turma: "9º Ano A", folhas: 28 },
  { id: 2, atividade: "Lista de Exercícios", turma: "1ª Série B", folhas: 31 },
];

// Turmas do professor.
//
// API — GET /turmas
// O ícone é o mesmo em todas as linhas: marca o tipo do item, não a turma.
const TURMAS = [
  { id: "1", nome: "9º Ano A", serie: "9º ano · Ens. Fundamental", alunos: 28 },
  { id: "2", nome: "1ª Série B", serie: "1ª série · Ensino Médio", alunos: 32 },
  { id: "3", nome: "7º Ano C", serie: "7º ano · Ens. Fundamental", alunos: 25 },
];

// Últimas atividades criadas. Mesmos dados de atividades.js.
//
// API — GET /atividades?ordenar=recentes&limite=4
const ATIVIDADES_RECENTES = [
  { id: "1", titulo: "Prova de Álgebra", turma: "9º Ano A", quando: "Hoje" },
  { id: "2", titulo: "Lista de Exercícios", turma: "1ª Série B", quando: "Há 4 dias" },
  { id: "3", titulo: "Trabalho de Geometria", turma: "7º Ano C", quando: "Há 8 dias" },
  { id: "4", titulo: "Prova Bimestral", turma: "9º Ano A", quando: "Há 14 dias" },
];

// Atalhos do CELULAR. No desktop a lateral já faz esse papel.
//
// API — GET /auth/me
// Os totais são contagens que o back-end calcula (as mesmas do Perfil). Peça
// pra virem junto na resposta do /auth/me.
const ATALHOS_MOBILE = [
  { chave: "turmas", titulo: "Turmas", valor: "3", icone: "turmas", rota: "/turmas" },
  { chave: "atividades", titulo: "Atividades", valor: "6", icone: "atividades", rota: "/atividades" },
  { chave: "scanner", titulo: "Scanner", valor: "12", icone: "scanner", rota: "/scanner" },
  {
    chave: "correcoes",
    titulo: "Correções",
    selo: `${PENDENTES.length} pendentes`,
    icone: "correcoes",
    rota: "/correcoes",
  },
];

// Lista que a busca do celular percorre.
//
// API — GET /turmas + GET /atividades
// Monte o índice juntando as duas respostas:
//
//   const [indiceBusca, setIndiceBusca] = useState([]);
//
//   useEffect(() => {
//     async function carregar() {
//       const cabecalho = { Authorization: `Bearer ${token}` };
//       const [turmas, atividades] = await Promise.all([
//         fetch("http://localhost:3000/turmas", { headers: cabecalho }).then((r) => r.json()),
//         fetch("http://localhost:3000/atividades", { headers: cabecalho }).then((r) => r.json()),
//       ]);
//
//       setIndiceBusca([
//         ...turmas.map((t) => ({ tipo: "turma", titulo: t.nome, subtitulo: t.escola })),
//         ...atividades.map((a) => ({ tipo: "atividade", titulo: a.nome, subtitulo: a.descricao })),
//       ]);
//     }
//     carregar();
//   }, []);
const INDICE_BUSCA = [
  { tipo: "turma", titulo: "9º Ano A", subtitulo: "E.E. Marechal Rondon" },
  { tipo: "turma", titulo: "1ª Série B", subtitulo: "E.E. Marechal Rondon" },
  { tipo: "turma", titulo: "7º Ano C", subtitulo: "Colégio Santa Clara" },
  { tipo: "atividade", titulo: "Prova de Álgebra", subtitulo: "Prova sobre equações e funções" },
  { tipo: "atividade", titulo: "Lista de Exercícios", subtitulo: "Exercícios de sistemas lineares" },
  { tipo: "atividade", titulo: "Trabalho de Geometria", subtitulo: "Figuras planas e espaciais" },
  { tipo: "atividade", titulo: "Prova Bimestral", subtitulo: "Conteúdos do 1º bimestre" },
  { tipo: "atividade", titulo: "Exercícios de Frações", subtitulo: "Operações com frações" },
  { tipo: "atividade", titulo: "Projeto de Estatística", subtitulo: "Pesquisa e análise de dados" },
];

const DIAS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function dataDeHoje() {
  const hoje = new Date();
  return `${DIAS[hoje.getDay()]}, ${hoje.getDate()} de ${MESES[hoje.getMonth()]}`;
}

export default function Home() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const [buscaHome, setBuscaHome] = useState("");
  const router = useRouter();

  const buscaNormalizada = buscaHome.trim().toLowerCase();
  const resultadosBusca = buscaNormalizada
    ? INDICE_BUSCA.filter((item) => item.titulo.toLowerCase().includes(buscaNormalizada))
    : [];

  const temPendentes = PENDENTES.length > 0;

  function abrirResultado(item) {
    setBuscaHome("");
    if (item.tipo === "turma") {
      router.push({ pathname: "/turmas", params: { turmaBusca: item.titulo } });
    } else {
      router.push({ pathname: "/atividades", params: { atividadeTitulo: item.titulo } });
    }
  }

  if (ehDesktop) {
    return (
      <View style={styles.telaDesktop}>
        <ScrollView style={styles.conteudo} contentContainerStyle={styles.conteudoDesktop}>
          <View style={styles.miolo}>
            <View style={styles.cabecalhoLinha}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.dataDesktop}>{dataDeHoje()}</Text>
                <Text style={styles.saudacaoDesktop}>
                  {saudacao()}, {NOME_PROFESSOR}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.botaoNovaDesktop}
                activeOpacity={0.85}
                onPress={() => router.push("/criar-atividade")}
              >
                <Ionicons name="add" size={16} color={COR.branco} />
                <Text style={styles.botaoNovaDesktopTexto}>Nova atividade</Text>
              </TouchableOpacity>
            </View>

            {temPendentes ? (
              <View style={styles.blocoPendentes}>
                <Text style={styles.blocoTitulo}>
                  {PENDENTES.length} {PENDENTES.length === 1 ? "correção" : "correções"} para revisar
                </Text>

                {PENDENTES.map((item, indice) => (
                  <View
                    key={item.id}
                    style={[styles.blocoLinha, indice === 0 && styles.blocoLinhaPrimeira]}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.blocoNome} numberOfLines={1}>
                        {item.atividade}
                      </Text>
                      <Text style={styles.blocoMeta} numberOfLines={1}>
                        {item.turma} · {item.folhas} folhas
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.botaoRevisar}
                      activeOpacity={0.8}
                      onPress={() => router.push("/correcoes")}
                    >
                      <Text style={styles.botaoRevisarTexto}>Revisar</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.blocoVazio}>
                <Text style={styles.blocoVazioTitulo}>Nada para revisar</Text>
                <TouchableOpacity activeOpacity={0.7} onPress={() => router.push("/scanner")}>
                  <Text style={styles.blocoVazioLink}>Escanear uma folha</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.secao}>
              <View style={styles.secaoCabecalho}>
                <Text style={styles.secaoTitulo}>Suas turmas</Text>
                <TouchableOpacity activeOpacity={0.6} onPress={() => router.push("/turmas")}>
                  <Text style={styles.verTodas}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              {TURMAS.map((turma) => (
                <TouchableOpacity
                  key={turma.id}
                  style={styles.linhaTurma}
                  activeOpacity={0.55}
                  onPress={() => router.push({ pathname: "/turmas", params: { turmaBusca: turma.nome } })}
                >
                  <IconeEdusync
                    nome="turmas"
                    tamanho={17}
                    cor={COR.tintaFraca}
                    style={styles.iconeTurma}
                  />
                  <Text style={styles.turmaNome} numberOfLines={1}>
                    {turma.nome}
                  </Text>
                  <Text style={styles.turmaSerie} numberOfLines={1}>
                    {turma.serie}
                  </Text>
                  <Text style={styles.turmaAlunos}>{turma.alunos} alunos</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.secao}>
              <View style={styles.secaoCabecalho}>
                <Text style={styles.secaoTitulo}>Atividades recentes</Text>
                <TouchableOpacity activeOpacity={0.6} onPress={() => router.push("/atividades")}>
                  <Text style={styles.verTodas}>Ver todas</Text>
                </TouchableOpacity>
              </View>

              {ATIVIDADES_RECENTES.map((atividade) => (
                <TouchableOpacity
                  key={atividade.id}
                  style={styles.linhaAtividade}
                  activeOpacity={0.55}
                  onPress={() =>
                    router.push({
                      pathname: "/atividades",
                      params: { atividadeTitulo: atividade.titulo },
                    })
                  }
                >
                  <Text style={styles.atividadeQuando}>{atividade.quando}</Text>
                  <Text style={styles.atividadeTitulo} numberOfLines={1}>
                    {atividade.titulo}
                  </Text>
                  <Text style={styles.atividadeTurma} numberOfLines={1}>
                    · {atividade.turma}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.tela}>

      <ScrollView style={styles.conteudo} contentContainerStyle={styles.conteudoMobile}>
        <View style={styles.saudacaoBloco}>
          <Text style={styles.dataMobile}>{dataDeHoje()}</Text>
          <Text style={styles.saudacaoMobile}>
            {saudacao()}, {NOME_PROFESSOR}
          </Text>
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
              <Text style={styles.resultadoVazio}>Nada encontrado para "{buscaHome}"</Text>
            ) : (
              resultadosBusca.map((item) => (
                <TouchableOpacity
                  key={`${item.tipo}-${item.titulo}`}
                  style={styles.resultadoItem}
                  activeOpacity={0.6}
                  onPress={() => abrirResultado(item)}
                >
                  <Ionicons
                    name={item.tipo === "turma" ? "people-outline" : "document-text-outline"}
                    size={16}
                    color={COR.tintaMedia}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.resultadoTitulo} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.resultadoSubtitulo} numberOfLines={1}>
                      {item.tipo === "turma" ? "Turma" : "Atividade"} · {item.subtitulo}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={15} color={COR.chevron} />
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={styles.destaque}>
          <Text style={styles.destaqueNumero}>
            {temPendentes
              ? `${PENDENTES.length} ${PENDENTES.length === 1 ? "correção" : "correções"}`
              : "Nada pendente"}
          </Text>

          <Text style={styles.destaqueSub}>
            {temPendentes
              ? `${PENDENTES[0].atividade} · ${PENDENTES[0].turma}`
              : "Escaneie uma folha para começar."}
          </Text>

          <TouchableOpacity
            style={styles.botaoPrimario}
            activeOpacity={0.85}
            onPress={() => router.push(temPendentes ? "/correcoes" : "/scanner")}
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
          {ATALHOS_MOBILE.map((item, indice) => (
            <TouchableOpacity
              key={item.chave}
              style={[styles.itemMobile, indice === ATALHOS_MOBILE.length - 1 && styles.linhaUltima]}
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
              ) : (
                <Text style={styles.itemNumero}>{item.valor}</Text>
              )}

              <Ionicons name="chevron-forward" size={16} color={COR.chevron} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.fundo },
  telaDesktop: { flex: 1, backgroundColor: COR.branco },

  conteudo: { flex: 1 },
  conteudoMobile: { padding: 18, paddingBottom: 40 },
  conteudoDesktop: { padding: 34, paddingBottom: 40, alignItems: "center" },
  miolo: { width: "100%", maxWidth: 940 },

  dataDesktop: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaFraca, marginBottom: 3 },
  saudacaoDesktop: { fontFamily: FONTE.semi, fontSize: 25, fontWeight: "600", color: COR.tintaForte, letterSpacing: -0.4 },
  saudacaoBloco: { marginBottom: 18, width: "100%" },
  dataMobile: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaFraca, marginBottom: 3 },
  saudacaoMobile: { fontFamily: FONTE.semi, fontSize: 21, fontWeight: "600", color: COR.tintaForte },
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
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexShrink: 0,
  },
  botaoNovaDesktopTexto: { fontFamily: FONTE.semi, color: COR.branco, fontSize: 13, fontWeight: "600" },

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
  blocoNome: { fontFamily: FONTE.media, fontSize: 14, fontWeight: "500", color: COR.branco },
  blocoMeta: { fontFamily: FONTE.regular, fontSize: 12, color: COR.marinhoClaro, marginTop: 2 },
  botaoRevisar: {
    backgroundColor: COR.branco,
    borderRadius: RAIO.controle,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexShrink: 0,
  },
  botaoRevisarTexto: { fontFamily: FONTE.semi, color: COR.marinho, fontSize: 12.5, fontWeight: "600" },

  blocoVazio: {
    width: "100%",
    backgroundColor: COR.marinho,
    borderRadius: RAIO.superficie,
    padding: 20,
    marginBottom: 30,
  },
  blocoVazioTitulo: { fontFamily: FONTE.semi, fontSize: 17, fontWeight: "600", color: COR.branco },
  blocoVazioLink: { fontFamily: FONTE.media, fontSize: 13, color: COR.marinhoClaro, marginTop: 6 },

  secao: { width: "100%", marginBottom: 26 },
  secaoCabecalho: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  secaoTitulo: { fontFamily: FONTE.semi, fontSize: 14, fontWeight: "600", color: COR.tintaForte },
  verTodas: { fontFamily: FONTE.regular, fontSize: 12, color: COR.tintaFraca },

  linhaTurma: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  iconeTurma: { marginRight: 11, flexShrink: 0 },
  turmaNome: { fontFamily: FONTE.semi, fontSize: 13.5, fontWeight: "600", color: COR.tintaForte, width: 110 },
  turmaSerie: { fontFamily: FONTE.regular, flex: 1, fontSize: 12.5, color: COR.tintaFraca },
  turmaAlunos: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaMedia, flexShrink: 0 },

  linhaAtividade: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COR.linhaSuave,
  },
  atividadeQuando: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaFraca, width: 92, flexShrink: 0 },
  atividadeTitulo: { fontFamily: FONTE.media, fontSize: 13.5, fontWeight: "500", color: COR.tintaForte, flexShrink: 1 },
  atividadeTurma: { fontFamily: FONTE.regular, flex: 1, fontSize: 12.5, color: COR.tintaFraca, marginLeft: 7 },

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
  buscaInput: { fontFamily: FONTE.regular, flex: 1, fontSize: 13.5, color: COR.tintaForte, padding: 0 },

  resultadosBox: {
    width: "100%",
    backgroundColor: COR.branco,
    borderRadius: RAIO.superficie,
    borderWidth: 1,
    borderColor: COR.linha,
    padding: 6,
    marginBottom: 18,
  },
  resultadoVazio: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaFraca, padding: 10, textAlign: "center" },
  resultadoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  resultadoTitulo: { fontFamily: FONTE.media, fontSize: 13.5, fontWeight: "500", color: COR.tintaForte },
  resultadoSubtitulo: { fontFamily: FONTE.regular, fontSize: 11, color: COR.tintaFraca, marginTop: 1 },

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
  destaqueSub: { fontFamily: FONTE.regular, fontSize: 12.5, color: COR.tintaMedia, marginTop: 3 },

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
  botaoPrimarioTexto: { fontFamily: FONTE.semi, color: COR.branco, fontSize: 13.5, fontWeight: "600" },

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
  botaoSecundarioTexto: { fontFamily: FONTE.semi, color: COR.tintaForte, fontSize: 13.5, fontWeight: "600" },

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
  itemTexto: { fontFamily: FONTE.media, flex: 1, fontSize: 14, fontWeight: "500", color: COR.tintaForte },
  itemNumero: { fontFamily: FONTE.semi, fontSize: 14, fontWeight: "600", color: COR.tintaForte },

  selo: { backgroundColor: COR.avisoFundo, borderRadius: RAIO.etiqueta, paddingHorizontal: 8, paddingVertical: 2 },
  seloTexto: { fontFamily: FONTE.media, fontSize: 11, fontWeight: "500", color: COR.avisoTexto },
});