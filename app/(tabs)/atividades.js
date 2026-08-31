import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Modal,
  Platform,
  Pressable,
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

// Atividades listadas na tela, hoje fixas.
//
// ---------------------------------------------------------------------------
// API — GET /atividades
// Aceita filtrar por turma: GET /atividades?id_turma=3
//
//   const [atividades, setAtividades] = useState([]);
//
//   useEffect(() => {
//     fetch("http://localhost:3000/atividades", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then(setAtividades);
//   }, []);
// ---------------------------------------------------------------------------
const ATIVIDADES_INICIAIS = [
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
  // Vindo de "Ver atividade original", o título chega por parâmetro.
  const { atividadeTitulo } = useLocalSearchParams();
  const [filtroAtivo, setFiltroAtivo] = useState("Todas");
  const [busca, setBusca] = useState(atividadeTitulo ? String(atividadeTitulo) : "");

  // Lista em estado pra dar pra excluir e editar item.
  const [atividades, setAtividades] = useState(ATIVIDADES_INICIAIS);
  // Guarda o item cujo menu "editar/excluir" está aberto (null = fechado).
  const [menuAtivo, setMenuAtivo] = useState(null);
  // Guarda o item que está com o modal de confirmação de exclusão aberto.
  const [atividadeParaExcluir, setAtividadeParaExcluir] = useState(null);

  // Abre a tela de criar atividade em modo de edição.
  function irParaEdicao(item) {
    setMenuAtivo(null);
    router.push({
      pathname: "/criar-atividade",
      params: { modo: "editar", tituloInicial: item.titulo },
    });
  }

  // API — DELETE /atividades/:id
  //
  //   await fetch(`http://localhost:3000/atividades/${atividadeParaExcluir.id}`, {
  //     method: "DELETE",
  //     headers: { Authorization: `Bearer ${token}` },
  //   });
  //
  // Só depois que a resposta voltar OK é que vale tirar da lista na tela —
  // senão o item some aqui mas continua no banco.
  function confirmarExclusao() {
    setAtividades((atuais) => atuais.filter((a) => a.id !== atividadeParaExcluir.id));
    setAtividadeParaExcluir(null);
  }

  // Filtra a lista pelo texto digitado na busca.
  const atividadesFiltradas = atividades.filter((item) =>
    item.titulo.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
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
              {busca.length > 0 && (
                <TouchableOpacity onPress={() => setBusca("")} hitSlop={8}>
                  <Ionicons name="close-circle" size={16} color="#94A3B8" />
                </TouchableOpacity>
              )}
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
            {atividadesFiltradas.map((item) => (
              <View
                key={item.id}
                style={[styles.atividadeCard, !ehDesktop && styles.atividadeCardMobile]}
              >
                {/* Linha 1 (sempre): ícone + título/descrição */}
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

                  {/* Botão "..." — abre o menu de editar/excluir. Fica
                      separado do "Ver atividade" pra não confundir as duas
                      ações. */}
                  <TouchableOpacity
                    style={styles.botaoMenu}
                    activeOpacity={0.7}
                    hitSlop={8}
                    onPress={() => setMenuAtivo(item)}
                  >
                    <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                  </TouchableOpacity>

                  {/* No desktop, botão + data ficam nessa mesma linha, à direita */}
                  {ehDesktop && (
                    <View style={styles.atividadeAcao}>
                      <TouchableOpacity
                        style={styles.botaoVer}
                        activeOpacity={0.85}
                        onPress={() =>
                          router.push({
                            pathname: "/correcoes",
                            params: { atividadeTitulo: item.titulo },
                          })
                        }
                      >
                        <Text style={styles.botaoVerTexto}>Ver atividade</Text>
                      </TouchableOpacity>
                      <Text style={styles.atividadeData}>
                        {item.data} · {item.quando}
                      </Text>
                    </View>
                  )}
                </View>

                {/* No mobile, botão + data descem pra uma segunda linha,
                    embaixo, com largura total — evita espremer o texto */}
                {!ehDesktop && (
                  <View style={styles.atividadeLinhaBaixoMobile}>
                    <Text style={styles.atividadeData}>
                      {item.data} · {item.quando}
                    </Text>
                    <TouchableOpacity
                      style={styles.botaoVer}
                      activeOpacity={0.85}
                      onPress={() =>
                        router.push({
                          pathname: "/correcoes",
                          params: { atividadeTitulo: item.titulo },
                        })
                      }
                    >
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

      {/* Menu "editar/excluir" de uma atividade */}
      <Modal
        visible={!!menuAtivo}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuAtivo(null)}
      >
        <Pressable style={styles.modalFundo} onPress={() => setMenuAtivo(null)}>
          <Pressable style={styles.menuCartao} onPress={() => {}}>
            <Text style={styles.menuTituloAtividade} numberOfLines={1}>
              {menuAtivo?.titulo}
            </Text>

            <TouchableOpacity
              style={styles.menuOpcao}
              activeOpacity={0.7}
              onPress={() => irParaEdicao(menuAtivo)}
            >
              <Ionicons name="pencil-outline" size={17} color="#3B82F6" />
              <Text style={styles.menuOpcaoTexto}>Editar atividade</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuOpcao}
              activeOpacity={0.7}
              onPress={() => {
                setAtividadeParaExcluir(menuAtivo);
                setMenuAtivo(null);
              }}
            >
              <Ionicons name="trash-outline" size={17} color="#EF4444" />
              <Text style={[styles.menuOpcaoTexto, { color: "#EF4444" }]}>Excluir atividade</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal
        visible={!!atividadeParaExcluir}
        transparent
        animationType="fade"
        onRequestClose={() => setAtividadeParaExcluir(null)}
      >
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconeCirculo}>
              <Ionicons name="trash-outline" size={22} color="#EF4444" />
            </View>
            <Text style={styles.modalTitulo}>Excluir esta atividade?</Text>
            <Text style={styles.modalTexto}>
              "{atividadeParaExcluir?.titulo}" será removida e essa ação não pode ser desfeita.
            </Text>
            <View style={styles.modalAcoes}>
              <TouchableOpacity
                style={styles.modalBotaoCancelar}
                activeOpacity={0.8}
                onPress={() => setAtividadeParaExcluir(null)}
              >
                <Text style={styles.modalBotaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBotaoExcluir}
                activeOpacity={0.8}
                onPress={confirmarExclusao}
              >
                <Text style={styles.modalBotaoExcluirTexto}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  botaoMenu: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ----- menu editar/excluir + modal de confirmação -----
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  menuCartao: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 8,
  },
  menuTituloAtividade: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#94A3B8",
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
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

  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
  },
  modalIconeCirculo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitulo: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0B1E3D",
    marginBottom: 6,
    textAlign: "center",
  },
  modalTexto: {
    fontSize: 12.5,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 18,
    lineHeight: 18,
  },
  modalAcoes: { flexDirection: "row", gap: 10, width: "100%" },
  modalBotaoCancelar: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E7EBF3",
  },
  modalBotaoCancelarTexto: { fontSize: 13.5, fontWeight: "700", color: "#64748B" },
  modalBotaoExcluir: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#EF4444",
  },
  modalBotaoExcluirTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },

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