import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import BotaoFlutuante from "../../components/BotaoFlutuante";
import CabecalhoMobile from "../../components/CabecalhoMobile";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

const INICIAIS_PROFESSOR = "AS";

// API — GET /turmas
// Traz só as turmas do professor logado (o back-end filtra pelo token):
//
//   const [turmas, setTurmas] = useState([]);
//
//   useEffect(() => {
//     fetch("http://localhost:3000/turmas", {
//       headers: { Authorization: `Bearer ${token}` },
//     })
//       .then((r) => r.json())
//       .then(setTurmas);
//   }, []);
//
// Campo "alunos" (a contagem): o back-end pode mandar junto, ou você busca
// em GET /turmas/:id/alunos quando abrir a turma.
// ---------------------------------------------------------------------------
const TURMAS_INICIAIS = [
  {
    id: "1",
    nome: "9º Ano A",
    serie: "9º ano - Ensino Fundamental",
    escola: "E.E. Marechal Rondon",
    alunos: 28,
    cor: "#3B82F6",
  },
  {
    id: "2",
    nome: "1ª Série B",
    serie: "1ª série - Ensino Médio",
    escola: "E.E. Marechal Rondon",
    alunos: 32,
    cor: "#8B5CF6",
  },
  {
    id: "3",
    nome: "7º Ano C",
    serie: "7º ano - Ensino Fundamental",
    escola: "Colégio Santa Clara",
    alunos: 25,
    cor: "#22C55E",
  },
];

const CORES_TURMA = ["#3B82F6", "#8B5CF6", "#22C55E", "#F5A623", "#DB2777"];

function turmaVazia() {
  return { id: null, nome: "", serie: "", escola: "" };
}

export default function Turmas() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();
  // Vindo da busca do Home, o nome da turma chega por parâmetro.
  const { turmaBusca } = useLocalSearchParams();

  const [turmas, setTurmas] = useState(TURMAS_INICIAIS);
  const [busca, setBusca] = useState(turmaBusca ? String(turmaBusca) : "");
  const [modalAberto, setModalAberto] = useState(false);
  const [turmaEmEdicao, setTurmaEmEdicao] = useState(turmaVazia());

  const editando = turmaEmEdicao.id !== null;

  const turmasFiltradas = turmas.filter((t) =>
    `${t.nome} ${t.escola}`.toLowerCase().includes(busca.toLowerCase())
  );

  function abrirCriar() {
    setTurmaEmEdicao(turmaVazia());
    setModalAberto(true);
  }

  function abrirEditar(turma) {
    setTurmaEmEdicao(turma);
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
  }

  // Salva a turma do modal: cria uma nova ou atualiza a existente.
  //
  // API — POST /turmas  (criar)  e  PUT /turmas/:id  (editar)
  //
  //   const rota = editando
  //     ? `http://localhost:3000/turmas/${turmaEmEdicao.id}`
  //     : "http://localhost:3000/turmas";
  //
  //   const resposta = await fetch(rota, {
  //     method: editando ? "PUT" : "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       Authorization: `Bearer ${token}`,
  //     },
  //     body: JSON.stringify({
  //       nome: turmaEmEdicao.nome,
  //       escola: turmaEmEdicao.escola,
  //     }),
  //   });
  //
  //   const turmaSalva = await resposta.json();
  //   // depois de salvar, recarregue a lista com o GET /turmas
  function salvarTurma() {
    if (!turmaEmEdicao.nome.trim()) return;

    if (editando) {
      setTurmas((atuais) =>
        atuais.map((t) => (t.id === turmaEmEdicao.id ? { ...t, ...turmaEmEdicao } : t))
      );
    } else {
      const nova = {
        ...turmaEmEdicao,
        id: String(Date.now()),
        alunos: 0,
        cor: CORES_TURMA[turmas.length % CORES_TURMA.length],
      };
      setTurmas((atuais) => [nova, ...atuais]);
    }
    setModalAberto(false);
  }

  // API — DELETE /turmas/:id
  //
  //   await fetch(`http://localhost:3000/turmas/${turmaEmEdicao.id}`, {
  //     method: "DELETE",
  //     headers: { Authorization: `Bearer ${token}` },
  //   });
  //
  // Atenção: se a turma já tiver atividades e correções, o back-end vai
  // recusar a exclusão por causa das chaves estrangeiras. Combine com quem
  // fizer o back-end o que acontece nesse caso (bloquear ou apagar em cascata).
  function excluirTurma() {
    setTurmas((atuais) => atuais.filter((t) => t.id !== turmaEmEdicao.id));
    setModalAberto(false);
  }

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
        <View style={ehDesktop ? styles.miolo : { width: "100%" }}>
          {ehDesktop && (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>Turmas</Text>
              </TouchableOpacity>
            </View>
          )}

          {!ehDesktop && <Text style={styles.tituloPagina}>Turmas</Text>}

          <View style={styles.buscaLinha}>
            <View style={styles.buscaBox}>
              <Ionicons name="search" size={16} color="#94A3B8" />
              <TextInput
                value={busca}
                onChangeText={setBusca}
                placeholder="Buscar turma ou escola..."
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
              <TouchableOpacity style={styles.botaoNovaTurmaDesktop} onPress={abrirCriar}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.botaoNovaTurmaDesktopTexto}>Nova turma</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.lista}>
            {turmasFiltradas.map((turma) => (
              <TouchableOpacity
                key={turma.id}
                style={styles.turmaCard}
                activeOpacity={0.85}
                onPress={() => abrirEditar(turma)}
              >
                <View style={[styles.turmaIconeCirculo, { backgroundColor: `${turma.cor}22` }]}>
                  <Ionicons name="people" size={20} color={turma.cor} />
                </View>

                <View style={styles.turmaTextos}>
                  <Text style={styles.turmaNome} numberOfLines={1}>
                    {turma.nome}
                  </Text>
                  <Text style={styles.turmaDetalhe} numberOfLines={1}>
                    {turma.serie} · {turma.escola}
                  </Text>
                  <Text style={styles.turmaAlunos}>{turma.alunos} alunos</Text>
                </View>

                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </TouchableOpacity>
            ))}

            {turmasFiltradas.length === 0 && (
              <View style={styles.vazioBox}>
                <Ionicons name="people-outline" size={28} color="#94A3B8" />
                <Text style={styles.vazioTexto}>Nenhuma turma encontrada.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {!ehDesktop && (
        <BotaoFlutuante onPress={abrirCriar} style={{ bottom: 74, right: 14 }} />
      )}

      {/* Modal: card único de criar/editar turma, por cima da tela */}
      <Modal visible={modalAberto} transparent animationType="fade" onRequestClose={fecharModal}>
        <View style={styles.modalFundo}>
          <View style={styles.modalCard}>
            <View style={styles.modalCabecalho}>
              <Text style={styles.modalTitulo}>
                {editando ? "Editar turma" : "Criar turma"}
              </Text>
              <TouchableOpacity onPress={fecharModal}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.rotulo}>
              Nome da turma <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={turmaEmEdicao.nome}
              onChangeText={(v) => setTurmaEmEdicao((atual) => ({ ...atual, nome: v }))}
              placeholder="Ex: 9º Ano A"
              placeholderTextColor="#94A3B8"
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>Série / Ano</Text>
            <TextInput
              value={turmaEmEdicao.serie}
              onChangeText={(v) => setTurmaEmEdicao((atual) => ({ ...atual, serie: v }))}
              placeholder="Ex: 9º ano - Ensino Fundamental"
              placeholderTextColor="#94A3B8"
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>Escola</Text>
            <TextInput
              value={turmaEmEdicao.escola}
              onChangeText={(v) => setTurmaEmEdicao((atual) => ({ ...atual, escola: v }))}
              placeholder="Ex: E.E. Marechal Rondon"
              placeholderTextColor="#94A3B8"
              style={styles.campoTexto}
            />

            {!editando && (
              <View style={styles.modalAvisoBox}>
                <Ionicons name="information-circle" size={16} color="#3B82F6" />
                <Text style={styles.modalAvisoTexto}>
                  Não precisa cadastrar os alunos aqui: a IA reconhece o nome de cada aluno ao
                  corrigir uma atividade e adiciona ele à turma automaticamente.
                </Text>
              </View>
            )}

            <View style={styles.modalAcoes}>
              {editando && (
                <TouchableOpacity style={styles.botaoExcluir} onPress={excluirTurma}>
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.botaoCancelar} onPress={fecharModal}>
                <Text style={styles.botaoCancelarTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botaoSalvar} onPress={salvarTurma}>
                <Text style={styles.botaoSalvarTexto}>
                  {editando ? "Salvar alterações" : "Criar turma"}
                </Text>
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

  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 40, alignItems: "center" },
  conteudoInternoDesktop: { alignItems: "center" },
  miolo: { width: "92%", maxWidth: 1000 },

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

  buscaLinha: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 16 },
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

  botaoNovaTurmaDesktop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#3B82F6",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  botaoNovaTurmaDesktopTexto: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  lista: { width: "100%", gap: 10 },
  turmaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 14,
  },
  turmaIconeCirculo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  turmaTextos: { flex: 1, minWidth: 0 },
  turmaNome: { fontSize: 14, fontWeight: "700", color: "#0B1E3D" },
  turmaDetalhe: { fontSize: 11.5, color: "#94A3B8", marginTop: 2 },
  turmaAlunos: { fontSize: 11, color: "#3B82F6", fontWeight: "600", marginTop: 4 },

  vazioBox: { alignItems: "center", gap: 8, paddingVertical: 40 },
  vazioTexto: { fontSize: 13, color: "#94A3B8" },

  // ----- modal criar/editar turma -----
  modalFundo: {
    flex: 1,
    backgroundColor: "rgba(11,30,61,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
  },
  modalCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  modalTitulo: { fontSize: 17, fontWeight: "700", color: "#0B1E3D" },

  rotulo: { fontSize: 12.5, fontWeight: "600", color: "#334155", marginTop: 14, marginBottom: 6 },
  obrigatorio: { color: "#EF4444" },
  campoTexto: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0B1E3D",
    backgroundColor: "#FFFFFF",
  },

  modalAvisoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  modalAvisoTexto: { flex: 1, fontSize: 11.5, color: "#3B5A8A", lineHeight: 15 },

  modalAcoes: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 22 },
  botaoExcluir: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    alignItems: "center",
    justifyContent: "center",
  },
  botaoCancelar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  botaoCancelarTexto: { fontSize: 13.5, fontWeight: "700", color: "#334155" },
  botaoSalvar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#3B82F6",
  },
  botaoSalvarTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },
});