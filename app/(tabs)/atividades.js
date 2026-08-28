
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  useWindowDimensions,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

const FILTROS = ["Todas", "Em aberto", "Concluídas"];

const ATIVIDADES = [
  {
    id: "1",
    titulo: "Prova de Álgebra",
    descricao: "Prova sobre equações e funções",
    data: "18/03/2026",
    quando: "Hoje",
    icone: "function-variant",
    biblioteca: "mci",
    corFundo: "#F1E9FB",
    corIcone: "#8B5CF6",
  },
  {
    id: "2",
    titulo: "Lista de Exercícios",
    descricao: "Exercícios de sistemas lineares",
    data: "14/03/2026",
    quando: "Há 4 dias",
    icone: "format-list-bulleted",
    biblioteca: "mci",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
  {
    id: "3",
    titulo: "Trabalho de Geometria",
    descricao: "Figuras planas e espaciais",
    data: "10/03/2026",
    quando: "Há 8 dias",
    icone: "shape-outline",
    biblioteca: "mci",
    corFundo: "#FEF0E4",
    corIcone: "#F5A623",
  },
  {
    id: "4",
    titulo: "Prova Bimestral",
    descricao: "Conteúdos do 1º bimestre",
    data: "04/03/2026",
    quando: "Há 14 dias",
    icone: "school-outline",
    biblioteca: "ion",
    corFundo: "#FCE7F3",
    corIcone: "#DB2777",
  },
  {
    id: "5",
    titulo: "Exercícios de Frações",
    descricao: "Operações com frações",
    data: "15/02/2026",
    quando: "Há um mês",
    icone: "fraction-one-half",
    biblioteca: "mci",
    corFundo: "#E8F0FE",
    corIcone: "#3B82F6",
  },
  {
    id: "6",
    titulo: "Projeto de Estatística",
    descricao: "Pesquisa e análise de dados",
    data: "16/02/2026",
    quando: "Há um mês",
    icone: "chart-line",
    biblioteca: "mci",
    corFundo: "#E7F8EF",
    corIcone: "#22C55E",
  },
];

const RESUMO = [
  { valor: "132", rotulo: "Downloads", icone: "checkmark-circle", cor: "#3B82F6" },
  { valor: "68%", rotulo: "Taxa média de atividade", icone: "trending-up", cor: "#22C55E" },
  { valor: "16", rotulo: "Atividades ativas", icone: "layers-outline", cor: "#3B82F6" },
  { valor: "7", rotulo: "Atividades criadas essa semana", icone: "time-outline", cor: "#F5A623" },
];

export default function Atividades() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState("");

  return (
    <View style={[styles.tela, ehDesktop && { paddingLeft: 300 }]}>
      {!ehDesktop && <CabecalhoMobile />}

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
                <Text style={styles.tituloPaginaDesktop}>Atividades</Text>
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

          <View style={styles.buscaLinha}>
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar atividade..."
                placeholderTextColor="#94A3B8"
                style={styles.buscaInput}
              />
            </View>
            <TouchableOpacity style={styles.turmaFiltro}>
              <Ionicons name="people-outline" size={14} color="#3B82F6" />
              <Text style={styles.turmaFiltroTexto}>Todas as turmas</Text>
              <Ionicons name="chevron-down" size={14} color="#3B82F6" />
            </TouchableOpacity>
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
            {ATIVIDADES.map((item) => (
              <View
                key={item.id}
                style={[styles.atividadeCard, !ehDesktop && styles.atividadeCardMobile]}
              >
                <View style={styles.atividadeLinhaTopo}>
                  <View
                    style={[styles.atividadeIconeCirculo, { backgroundColor: item.corFundo }]}
                  >
                    {item.biblioteca === "mci" ? (
                      <MaterialCommunityIcons
                        name={item.icone}
                        size={20}
                        color={item.corIcone}
                      />
                    ) : (
                      <Ionicons name={item.icone} size={20} color={item.corIcone} />
                    )}
                  </View>

                  <View style={styles.atividadeTextos}>
                    <Text style={styles.atividadeTitulo} numberOfLines={1}>
                      {item.titulo}
                    </Text>
                    <Text style={styles.atividadeDescricao} numberOfLines={1}>
                      {item.descricao}
                    </Text>
                  </View>

                  {ehDesktop && (
                    <View style={styles.atividadeAcao}>
                      <TouchableOpacity style={styles.botaoVer}>
                        <Text style={styles.botaoVerTexto}>Ver atividade</Text>
                      </TouchableOpacity>
                      <Text style={styles.atividadeData}>
                        {item.data} · {item.quando}
                      </Text>
                    </View>
                  )}
                </View>

                {!ehDesktop && (
                  <View style={styles.atividadeLinhaBaixoMobile}>
                    <Text style={styles.atividadeData}>
                      {item.data} · {item.quando}
                    </Text>
                    <TouchableOpacity style={styles.botaoVer}>
                      <Text style={styles.botaoVerTexto}>Ver atividade</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>

          <View style={[styles.resumoBox, ehDesktop && styles.resumoBoxDesktop]}>
            <Text style={[styles.resumoTitulo, ehDesktop && styles.resumoTituloDesktop]}>
              Resumo das atividades
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
            <TouchableOpacity
              style={[styles.botaoRelatorio, ehDesktop && styles.botaoRelatorioDesktop]}
              activeOpacity={0.85}
            >
              <Ionicons name="bar-chart-outline" size={16} color="#3B82F6" />
              <Text style={styles.resumoLink}>Ver relatório completo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BotaoFlutuante
        onPress={() => router.push("/criar-atividade")}
        style={ehDesktop ? { bottom: 32, right: 32 } : { bottom: 74, right: 14 }}
      />
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
  sinoClaro: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7EBF3",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },

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
  turmaFiltro: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  turmaFiltroTexto: { fontSize: 12, fontWeight: "600", color: "#3B82F6" },

  filtrosLinha: { flexDirection: "row", gap: 8, width: "100%", marginBottom: 16 },
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
  atividadeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 14,
  },
  atividadeCardMobile: { gap: 10 },
  atividadeLinhaTopo: { flexDirection: "row", alignItems: "center", gap: 12 },
  atividadeLinhaBaixoMobile: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  atividadeIconeCirculo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  atividadeTextos: { flex: 1, minWidth: 0 },
  atividadeTitulo: { fontSize: 13.5, fontWeight: "700", color: "#0B1E3D" },
  atividadeDescricao: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
  atividadeAcao: { alignItems: "flex-end", gap: 4, flexShrink: 0 },
  botaoVer: {
    backgroundColor: "#3B82F6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  botaoVerTexto: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "700" },
  atividadeData: { fontSize: 10, color: "#94A3B8" },

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
    marginBottom: 14,
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
  botaoRelatorio: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  botaoRelatorioDesktop: {
    alignSelf: "flex-start",
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  resumoLink: {
    textAlign: "center",
    fontSize: 12.5,
    fontWeight: "600",
    color: "#3B82F6",
  },
});