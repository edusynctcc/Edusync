import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

const FILTROS = ["Todas", "Em processamento", "Concluídas", "Pendentes"];

// status: "concluida" | "processando" | "pendente"
//
// ---------------------------------------------------------------------------
// API — GET /correcoes
// Aceita o filtro de status que os chips da tela usam:
//   GET /correcoes?status=pendente | em_andamento | concluida
//
//   const [correcoes, setCorrecoes] = useState([]);
//
//   useEffect(() => {
//     fetch("http://localhost:3000/correcoes", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then(setCorrecoes);
//   }, []);
//
// Vale recarregar toda vez que a tela ganhar foco (useFocusEffect do
// expo-router), senão o professor volta do Editar e a lista continua com o
// status antigo.
// ---------------------------------------------------------------------------
const CORRECOES = [
  {
    id: "1",
    titulo: "Prova de Álgebra",
    turma: "9º Ano A · Turma B",
    status: "concluida",
    corrigidos: 28,
    data: "19/03/2026",
    quando: "Hoje, 10:15",
    icone: "function-variant",
    corFundo: "#F1E9FB",
    corIcone: "#8B5CF6",
  },
  {
    id: "2",
    titulo: "Lista de Exercícios",
    turma: "8º Ano B",
    status: "processando",
    corrigidos: 14,
    data: "19/03/2026",
    quando: "Hoje, 09:50",
    icone: "format-list-bulleted",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
  {
    id: "3",
    titulo: "Trabalho de Geometria",
    turma: "9º Ano A",
    status: "pendente",
    corrigidos: 0,
    data: "18/03/2026",
    quando: "Ontem, 16:40",
    icone: "shape-outline",
    corFundo: "#FEF0E4",
    corIcone: "#F5A623",
  },
  {
    id: "4",
    titulo: "Prova Bimestral",
    turma: "7º Ano B",
    status: "concluida",
    corrigidos: 27,
    data: "16/03/2026",
    quando: "Há 3 dias",
    icone: "school-outline",
    corFundo: "#FCE7F3",
    corIcone: "#DB2777",
  },
  {
    id: "5",
    titulo: "Exercícios de Frações",
    turma: "6º Ano A",
    status: "pendente",
    corrigidos: 0,
    data: "15/03/2026",
    quando: "Há 4 dias",
    icone: "fraction-one-half",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
];

const CONFIG_STATUS = {
  concluida: { rotulo: "Concluída", cor: "#22C55E", corFundo: "#E7F8EF", icone: "checkmark-circle" },
  processando: { rotulo: "Processando", cor: "#3B82F6", corFundo: "#E8F0FE", icone: "sync-outline" },
  pendente: { rotulo: "Pendente", cor: "#F5A623", corFundo: "#FEF3C7", icone: "time-outline" },
};

function correcaoCombinaComFiltro(correcao, filtro) {
  if (filtro === "Todas") return true;
  if (filtro === "Em processamento") return correcao.status === "processando";
  if (filtro === "Concluídas") return correcao.status === "concluida";
  if (filtro === "Pendentes") return correcao.status === "pendente";
  return true;
}

export default function Correcoes() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  // Vindo de "Ver atividade", o título chega por parâmetro.
  const { atividadeTitulo } = useLocalSearchParams();
  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState(atividadeTitulo ? String(atividadeTitulo) : "");

  const totalConcluidas = CORRECOES.filter((c) => c.status === "concluida").length;
  const totalProcessando = CORRECOES.filter((c) => c.status === "processando").length;
  const totalPendentes = CORRECOES.filter((c) => c.status === "pendente").length;

  const RESUMO = [
    { valor: String(totalConcluidas), rotulo: "Concluídas", icone: "checkmark-circle", cor: "#22C55E" },
    { valor: String(totalProcessando), rotulo: "Em processamento", icone: "sync-outline", cor: "#3B82F6" },
    { valor: String(totalPendentes), rotulo: "Pendentes", icone: "time-outline", cor: "#F5A623" },
    { valor: String(CORRECOES.length), rotulo: "Total enviadas", icone: "layers-outline", cor: "#8B5CF6" },
  ];

  const correcoesFiltradas = CORRECOES.filter(
    (c) =>
      correcaoCombinaComFiltro(c, filtroAtivo) &&
      c.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
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
          style={[ehDesktop ? styles.miolo : { width: "100%" }, ehTelaLarga && { maxWidth: 1300 }]}
        >
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>Correções</Text>
              </TouchableOpacity>
            </View>
          )}

          {!ehDesktop && <Text style={styles.tituloPagina}>Correções</Text>}

          <View style={styles.buscaLinha}>
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar por atividade..."
                placeholderTextColor="#94A3B8"
                style={styles.buscaInput}
              />
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            {ehDesktop && (
              <TouchableOpacity
                style={styles.botaoScannerDesktop}
                onPress={() => router.push("/scanner")}
              >
                <Ionicons name="camera-outline" size={17} color="#FFFFFF" />
                <Text style={styles.botaoScannerDesktopTexto}>Ir para o Scanner</Text>
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
                  <Text style={[styles.filtroTexto, ativo && styles.filtroTextoAtivo]}>
                    {filtro}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.lista}>
            {correcoesFiltradas.map((item) => {
              const status = CONFIG_STATUS[item.status];

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.correcaoCard, !ehDesktop && styles.correcaoCardMobile]}
                  activeOpacity={0.85}
                  onPress={() => item.status === "concluida" && router.push("/editar")}
                >
                  <View style={styles.correcaoLinhaTopo}>
                    <View
                      style={[styles.correcaoIconeCirculo, { backgroundColor: item.corFundo }]}
                    >
                      <MaterialCommunityIcons name={item.icone} size={20} color={item.corIcone} />
                    </View>

                    <View style={styles.correcaoTextos}>
                      <Text style={styles.correcaoTitulo} numberOfLines={1}>
                        {item.titulo}
                      </Text>
                      <Text style={styles.correcaoTurma} numberOfLines={1}>
                        {item.turma}
                      </Text>
                    </View>

                    <View style={[styles.statusBadge, { backgroundColor: status.corFundo }]}>
                      <Ionicons name={status.icone} size={12} color={status.cor} />
                      <Text style={[styles.statusBadgeTexto, { color: status.cor }]}>
                        {status.rotulo}
                      </Text>
                    </View>
                  </View>

                  {item.status !== "pendente" && (
                    <View style={styles.correcaoContagemLinha}>
                      <Ionicons
                        name={item.status === "processando" ? "sync-outline" : "checkmark-circle-outline"}
                        size={13}
                        color={status.cor}
                      />
                      <Text style={[styles.correcaoContagemTexto, { color: status.cor }]}>
                        {item.status === "processando"
                          ? `${item.corrigidos} corrigidas até agora — a IA continua conforme chegam mais folhas escaneadas`
                          : `${item.corrigidos} corrigidas no total`}
                      </Text>
                    </View>
                  )}

                  <View style={styles.correcaoRodapeLinha}>
                    <Text style={styles.correcaoData}>
                      {item.data} · {item.quando}
                    </Text>

                    {item.status === "concluida" && (
                      <TouchableOpacity
                        style={styles.botaoVer}
                        onPress={() => router.push("/editar")}
                      >
                        <Text style={styles.botaoVerTexto}>Ver correção</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === "pendente" && (
                      <TouchableOpacity
                        style={styles.botaoVerSecundario}
                        onPress={() => router.push("/scanner")}
                      >
                        <Text style={styles.botaoVerSecundarioTexto}>Enviar agora</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {correcoesFiltradas.length === 0 && (
              <View style={styles.vazioBox}>
                <Ionicons name="document-text-outline" size={28} color="#94A3B8" />
                <Text style={styles.vazioTexto}>Nenhuma correção encontrada.</Text>
              </View>
            )}
          </View>

          <View style={[styles.resumoBox, ehDesktop && styles.resumoBoxDesktop]}>
            <Text style={[styles.resumoTitulo, ehDesktop && styles.resumoTituloDesktop]}>
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
                    <Ionicons name={item.icone} size={ehDesktop ? 20 : 16} color={item.cor} />
                  </View>
                  <View>
                    <Text style={[styles.resumoValor, ehDesktop && styles.resumoValorDesktop]}>
                      {item.valor}
                    </Text>
                    <Text style={[styles.resumoRotulo, ehDesktop && styles.resumoRotuloDesktop]}>
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
  tela: { flex: 1, backgroundColor: "#F4F6FA" },
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },

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
  tituloPagina: { fontSize: 18, fontWeight: "700", color: "#0B1E3D", marginBottom: 14, width: "100%" },
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

  buscaLinha: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
  buscaBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E7EBF3",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  buscaInput: { flex: 1, fontSize: 13, color: "#0B1E3D", padding: 0 },

  botaoScannerDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoScannerDesktopTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  filtrosLinha: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 16, flexWrap: "wrap" },
  filtroPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#EDF1F7",
  },
  filtroPillAtivo: { backgroundColor: "#3B82F6" },
  filtroTexto: { fontSize: 12.5, fontWeight: "600", color: "#64748B" },
  filtroTextoAtivo: { color: "#FFFFFF" },

  lista: { width: "100%", gap: 10, marginBottom: 20 },
  correcaoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 14,
  },
  correcaoCardMobile: { gap: 10 },
  correcaoLinhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  correcaoIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  correcaoTextos: { flex: 1, minWidth: 0 },
  correcaoTitulo: { fontSize: 13.5, fontWeight: "700", color: "#0B1E3D" },
  correcaoTurma: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusBadgeTexto: { fontSize: 10.5, fontWeight: "700" },

  correcaoContagemLinha: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },
  correcaoContagemTexto: { flex: 1, fontSize: 10.5, fontWeight: "600" },

  correcaoRodapeLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  correcaoData: { fontSize: 10, color: "#94A3B8" },
  botaoVer: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  botaoVerTexto: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "700" },
  botaoVerSecundario: {
    borderWidth: 1,
    borderColor: "#F5A623",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  botaoVerSecundarioTexto: { color: "#F5A623", fontSize: 11.5, fontWeight: "700" },

  vazioBox: { alignItems: "center", gap: 8, paddingVertical: 40, width: "100%" },
  vazioTexto: { fontSize: 13, color: "#94A3B8" },

  resumoBox: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 18,
    marginBottom: 20,
  },
  resumoBoxDesktop: { padding: 28 },
  resumoTitulo: { fontSize: 14, fontWeight: "700", color: "#0B1E3D", marginBottom: 14 },
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
    backgroundColor: "#F4F6FA",
  },
  resumoValor: { fontSize: 15, fontWeight: "700", color: "#0B1E3D" },
  resumoValorDesktop: { fontSize: 22 },
  resumoRotulo: { fontSize: 10.5, color: "#94A3B8" },
  resumoRotuloDesktop: { fontSize: 12.5, marginTop: 2 },
});