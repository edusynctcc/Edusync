import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
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

const FILTROS = ["Todas", "Aguardando você", "Em processamento", "Concluídas"];

const CORRECOES = [
  {
    id: "1",
    titulo: "Prova de Álgebra",
    turma: "9º Ano A",
    status: "pendente",
    corrigidos: 28,
    data: "19/03/2026",
    quando: "Hoje, 10:15",
    icone: "function-variant",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
  {
    id: "2",
    titulo: "Lista de Exercícios",
    turma: "1ª Série B",
    status: "pendente",
    corrigidos: 31,
    data: "19/03/2026",
    quando: "Hoje, 09:50",
    icone: "format-list-bulleted",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
  {
    id: "3",
    titulo: "Trabalho de Geometria",
    turma: "7º Ano C",
    status: "processando",
    corrigidos: 14,
    data: "18/03/2026",
    quando: "Ontem, 16:40",
    icone: "shape-outline",
    corFundo: COR.avisoFundo,
    corIcone: COR.avisoTexto,
  },
  {
    id: "4",
    titulo: "Prova Bimestral",
    turma: "9º Ano A",
    status: "concluida",
    corrigidos: 27,
    data: "16/03/2026",
    quando: "Há 3 dias",
    icone: "school-outline",
    corFundo: COR.okFundo,
    corIcone: COR.ok,
  },
  {
    id: "5",
    titulo: "Exercícios de Frações",
    turma: "7º Ano C",
    status: "concluida",
    corrigidos: 25,
    data: "15/03/2026",
    quando: "Há 4 dias",
    icone: "fraction-one-half",
    corFundo: COR.emAndamentoFundo,
    corIcone: COR.marcador,
  },
];

const CONFIG_STATUS = {
  concluida: {
    rotulo: "Concluída",
    cor: COR.ok,
    corFundo: COR.okFundo,
    icone: "checkmark-circle",
  },
  processando: {
    rotulo: "Processando",
    cor: COR.marcador,
    corFundo: COR.emAndamentoFundo,
    icone: "sync-outline",
  },
  pendente: {
    rotulo: "Aguardando você",
    cor: COR.avisoTexto,
    corFundo: COR.avisoFundo,
    icone: "time-outline",
  },
};

function correcaoCombinaComFiltro(correcao, filtro) {
  if (filtro === "Todas") return true;
  if (filtro === "Em processamento") return correcao.status === "processando";
  if (filtro === "Concluídas") return correcao.status === "concluida";
  if (filtro === "Aguardando você") return correcao.status === "pendente";
  return true;
}

export default function Correcoes() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const ehTelaLarga = width >= 1300;
  const router = useRouter();
  const { atividadeTitulo } = useLocalSearchParams();
  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState(
    atividadeTitulo ? String(atividadeTitulo) : "",
  );

  const totalConcluidas = CORRECOES.filter(
    (c) => c.status === "concluida",
  ).length;
  const totalProcessando = CORRECOES.filter(
    (c) => c.status === "processando",
  ).length;
  const totalPendentes = CORRECOES.filter(
    (c) => c.status === "pendente",
  ).length;

  const RESUMO = [
    {
      valor: String(totalConcluidas),
      rotulo: "Concluídas",
      icone: "checkmark-circle",
      cor: COR.ok,
    },
    {
      valor: String(totalProcessando),
      rotulo: "Em processamento",
      icone: "sync-outline",
      cor: COR.marcador,
    },
    {
      valor: String(totalPendentes),
      rotulo: "Aguardando você",
      icone: "time-outline",
      cor: COR.avisoTexto,
    },
    {
      valor: String(CORRECOES.length),
      rotulo: "Total enviadas",
      icone: "layers-outline",
      cor: COR.marcador,
    },
  ];

  const correcoesFiltradas = CORRECOES.filter(
    (c) =>
      correcaoCombinaComFiltro(c, filtroAtivo) &&
      c.titulo.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <View style={styles.tela}>
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
                    style={[
                      styles.filtroTexto,
                      ativo && styles.filtroTextoAtivo,
                    ]}
                  >
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
                  style={[
                    styles.correcaoCard,
                    !ehDesktop && styles.correcaoCardMobile,
                  ]}
                  activeOpacity={0.85}
                  disabled={item.status === "processando"}
                  onPress={() => router.push("/editar")}
                >
                  <View style={styles.correcaoLinhaTopo}>
                    <View
                      style={[
                        styles.correcaoIconeCirculo,
                        { backgroundColor: item.corFundo },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={item.icone}
                        size={20}
                        color={item.corIcone}
                      />
                    </View>

                    <View style={styles.correcaoTextos}>
                      <Text style={styles.correcaoTitulo} numberOfLines={1}>
                        {item.titulo}
                      </Text>
                      <Text style={styles.correcaoTurma} numberOfLines={1}>
                        {item.turma}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.corFundo },
                      ]}
                    >
                      <Ionicons
                        name={status.icone}
                        size={12}
                        color={status.cor}
                      />
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
                        item.status === "processando"
                          ? "sync-outline"
                          : item.status === "pendente"
                            ? "time-outline"
                            : "checkmark-circle-outline"
                      }
                      size={13}
                      color={status.cor}
                    />
                    <Text
                      style={[
                        styles.correcaoContagemTexto,
                        { color: status.cor },
                      ]}
                    >
                      {item.status === "processando"
                        ? `${item.corrigidos} corrigidas até agora — a IA continua conforme chegam mais folhas escaneadas`
                        : item.status === "pendente"
                          ? `${item.corrigidos} corrigidas pela IA — esperando sua revisão`
                          : `${item.corrigidos} corrigidas e revisadas por você`}
                    </Text>
                  </View>

                  <View style={styles.correcaoRodapeLinha}>
                    <Text style={styles.correcaoData}>{item.quando}</Text>

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
                        style={styles.botaoVer}
                        onPress={() => router.push("/editar")}
                      >
                        <Text style={styles.botaoVerTexto}>Revisar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {correcoesFiltradas.length === 0 && (
              <View style={styles.vazioBox}>
                <Ionicons
                  name="document-text-outline"
                  size={28}
                  color={COR.tintaFraca}
                />
                <Text style={styles.vazioTexto}>
                  Nenhuma correção encontrada.
                </Text>
              </View>
            )}
          </View>

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

  correcaoRodapeLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  correcaoData: {
    fontFamily: FONTE.regular,
    fontSize: 10,
    color: COR.tintaFraca,
  },
  botaoVer: {
    backgroundColor: COR.marinho,
    borderRadius: RAIO.controle,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  botaoVerTexto: {
    color: COR.branco,
    fontFamily: FONTE.bold,
    fontSize: 11.5,
    fontWeight: "700",
  },

  vazioBox: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 40,
    width: "100%",
  },
  vazioTexto: {
    fontFamily: FONTE.regular,
    fontSize: 13,
    color: COR.tintaFraca,
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
