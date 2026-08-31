import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
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

const TIPOS_RESPOSTA = ["Dissertativa", "Objetiva", "Numérica", "Verdadeiro/Falso"];

let proximoId = 1;
function novaQuestao() {
  return {
    id: proximoId++,
    enunciado: "",
    valor: "",
    tipo: null,
    criterios: "",
    respostaEsperada: "",
  };
}

export default function CriarAtividade() {
  const { width } = useWindowDimensions();
  const ehDesktop = width >= 900;
  const router = useRouter();

  // Vindo de "Editar atividade", os dados chegam por parâmetro.
  const { modo, tituloInicial, disciplinaInicial } = useLocalSearchParams();
  const emEdicao = modo === "editar";

  const [titulo, setTitulo] = useState(
    typeof tituloInicial === "string" ? tituloInicial : ""
  );
  const [disciplina, setDisciplina] = useState(
    typeof disciplinaInicial === "string" ? disciplinaInicial : ""
  );
  const [questoes, setQuestoes] = useState([novaQuestao()]);

  function atualizarQuestao(id, campo, valor) {
    setQuestoes((atuais) =>
      atuais.map((q) => (q.id === id ? { ...q, [campo]: valor } : q))
    );
  }

  function adicionarQuestao() {
    setQuestoes((atuais) => [...atuais, novaQuestao()]);
  }

  return (
    <View style={[styles.tela, ehDesktop && { paddingTop: 76 }]}>
      {!ehDesktop && <CabecalhoMobile comSino />}

      <ScrollView
        style={styles.conteudo}
        contentContainerStyle={[
          styles.conteudoInterno,
          ehDesktop && styles.conteudoInternoDesktop,
        ]}
      >
        <View style={ehDesktop ? styles.miolo : null}>
          {ehDesktop ? (
            <View style={styles.cabecalhoDesktopLinha}>
              <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
                <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
                <Text style={styles.tituloPaginaDesktop}>
                  {emEdicao ? "Editar atividade" : "Criar atividade"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => router.back()} style={styles.voltarLinha}>
              <Ionicons name="arrow-back" size={18} color="#0B1E3D" />
              <Text style={styles.tituloPagina}>
                {emEdicao ? "Editar atividade" : "Criar atividade"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Informações gerais */}
          <View style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}>
            <View style={styles.secaoCabecalho}>
              <View style={styles.checkboxDecorativo} />
              <Text style={styles.secaoTitulo}>Informações gerais</Text>
            </View>

            <Text style={styles.rotulo}>
              Título da atividade <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={titulo}
              onChangeText={setTitulo}
              placeholder="Ex: Prova de História - Revolução Francesa"
              placeholderTextColor="#94A3B8"
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>
              Disciplina <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TextInput
              value={disciplina}
              onChangeText={setDisciplina}
              placeholder="Ex: História"
              placeholderTextColor="#94A3B8"
              style={styles.campoTexto}
            />

            <Text style={styles.rotulo}>
              Turmas <Text style={styles.obrigatorio}>*</Text>
            </Text>
            <TouchableOpacity style={styles.campoSelect}>
              <Text style={styles.campoSelectPlaceholder}>Selecione as turmas</Text>
              <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Aviso "Como funciona?" */}
          <View style={styles.avisoBox}>
            <Ionicons name="information-circle" size={18} color="#3B82F6" />
            <View style={styles.avisoTextos}>
              <Text style={styles.avisoTitulo}>Como funciona?</Text>
              <Text style={styles.avisoDescricao}>
                A IA utilizará essas informações para corrigir as imagens com respostas.
              </Text>
            </View>
          </View>

          {/* Questões da atividade */}
          <Text style={styles.secaoTituloGrande}>Questões da atividade</Text>
          <Text style={styles.secaoSubtitulo}>
            A IA usará essas informações para corrigir as imagens.
          </Text>

          {questoes.map((questao, indice) => (
            <View
              key={questao.id}
              style={[styles.secaoCard, ehDesktop && styles.secaoCardDesktop]}
            >
              <Text style={styles.numeroQuestao}>Questão {indice + 1}</Text>

              <Text style={styles.rotulo}>
                Enunciado da questão <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <View style={styles.barraFormatacao}>
                {["B", "I", "U"].map((letra) => (
                  <TouchableOpacity key={letra} style={styles.botaoFormatacao}>
                    <Text style={styles.botaoFormatacaoTexto}>{letra}</Text>
                  </TouchableOpacity>
                ))}
                <Ionicons name="list-outline" size={16} color="#64748B" style={styles.iconeFormatacao} />
                <Ionicons name="list-outline" size={16} color="#64748B" style={styles.iconeFormatacao} />
                <Ionicons name="image-outline" size={16} color="#64748B" style={styles.iconeFormatacao} />
              </View>
              <TextInput
                value={questao.enunciado}
                onChangeText={(v) => atualizarQuestao(questao.id, "enunciado", v)}
                placeholder="Digite o enunciado da questão..."
                placeholderTextColor="#94A3B8"
                style={[styles.campoTexto, styles.campoTextoArea]}
                multiline
              />

              <Text style={styles.rotulo}>Valor da questão</Text>
              <TextInput
                value={questao.valor}
                onChangeText={(v) => atualizarQuestao(questao.id, "valor", v)}
                placeholder="Ex: 2,0 pontos"
                placeholderTextColor="#94A3B8"
                style={styles.campoTexto}
                keyboardType="numeric"
              />

              <Text style={styles.rotulo}>
                Tipo de resposta esperada <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <View style={styles.tiposGrade}>
                {TIPOS_RESPOSTA.map((tipo) => {
                  const selecionado = questao.tipo === tipo;
                  return (
                    <TouchableOpacity
                      key={tipo}
                      onPress={() => atualizarQuestao(questao.id, "tipo", tipo)}
                      style={[styles.tipoPill, selecionado && styles.tipoPillAtivo]}
                    >
                      <Text
                        style={[styles.tipoPillTexto, selecionado && styles.tipoPillTextoAtivo]}
                      >
                        {tipo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.rotulo}>
                Critérios de correção (para IA) <Text style={styles.obrigatorio}>*</Text>
              </Text>
              <TextInput
                value={questao.criterios}
                onChangeText={(v) => atualizarQuestao(questao.id, "criterios", v)}
                placeholder={
                  "Ex: O aluno deve apresentar os conceitos de... relacionar com... citar exemplos de... usar dados corretos..."
                }
                placeholderTextColor="#94A3B8"
                style={[styles.campoTexto, styles.campoTextoArea]}
                multiline
              />

              <Text style={styles.rotulo}>
                Resposta esperada / Gabarito de referência (opcional)
              </Text>
              <TextInput
                value={questao.respostaEsperada}
                onChangeText={(v) => atualizarQuestao(questao.id, "respostaEsperada", v)}
                placeholder={
                  "Digite uma resposta modelo ou pontos-chave que devem aparecer na resposta do aluno..."
                }
                placeholderTextColor="#94A3B8"
                style={[styles.campoTexto, styles.campoTextoArea]}
                multiline
              />
            </View>
          ))}

          <TouchableOpacity style={styles.botaoAdicionarQuestao} onPress={adicionarQuestao}>
            <Ionicons name="add" size={18} color="#3B82F6" />
            <Text style={styles.botaoAdicionarQuestaoTexto}>Adicionar questão</Text>
          </TouchableOpacity>

          {/* -------------------------------------------------------------
              API — POST /atividades (criar) ou PUT /atividades/:id (editar),
                    e depois POST /atividades/:id/questoes

              Os dois botões abaixo ainda não têm onPress. É aqui que entra
              o salvamento — em duas etapas, porque a atividade precisa
              existir antes das questões terem um id_atividade pra apontar:

              async function publicarAtividade() {
                const cabecalho = {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                };

                // 1. cria (ou atualiza) a atividade
                const resposta = await fetch(
                  emEdicao
                    ? `http://localhost:3000/atividades/${id}`
                    : "http://localhost:3000/atividades",
                  {
                    method: emEdicao ? "PUT" : "POST",
                    headers: cabecalho,
                    body: JSON.stringify({
                      nome: titulo,
                      descricao,
                      id_turma: turmaSelecionada,
                    }),
                  }
                );

                const atividade = await resposta.json();

                // 2. manda as questões em lote (o gabarito que a IA vai usar)
                await fetch(
                  `http://localhost:3000/atividades/${atividade.id_atividade}/questoes`,
                  {
                    method: "POST",
                    headers: cabecalho,
                    body: JSON.stringify({ questoes }),
                  }
                );

                router.replace("/atividades");
              }

              Depois é só ligar: onPress={publicarAtividade}
              ------------------------------------------------------------- */}
          <View style={[styles.acoesFinais, ehDesktop && styles.acoesFinaisDesktop]}>
            {/* "Salvar rascunho" só faz sentido pra atividade nova — uma
                que já existe não é mais rascunho */}
            {!emEdicao && (
              <TouchableOpacity
                style={[styles.botaoRascunho, ehDesktop && styles.botaoRascunhoDesktop]}
              >
                <Text style={styles.botaoRascunhoTexto} numberOfLines={1}>
                  Salvar rascunho
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.botaoPublicar, ehDesktop && styles.botaoPublicarDesktop]}
            >
              <Text style={styles.botaoPublicarTexto} numberOfLines={1}>
                {emEdicao ? "Salvar alterações" : "Publicar atividade"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: "#F4F6FA" },

  // Estilos do cabeçalho (no mobile quem desenha é o CabecalhoMobile).
  usuarioNomeLinha: { flexDirection: "row", alignItems: "center", gap: 4 },
  usuarioNome: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  conteudo: { flex: 1 },
  conteudoInterno: { padding: 20, paddingBottom: 60, alignItems: "center" },
  conteudoInternoDesktop: { alignItems: "center", paddingTop: 32, paddingBottom: 60 },
  miolo: { width: "92%", maxWidth: 760 },

  voltarLinha: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 },
  tituloPagina: { fontSize: 18, fontWeight: "700", color: "#0B1E3D" },

  cabecalhoDesktopLinha: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    minHeight: 40,
    marginBottom: 28,
  },
  tituloPaginaDesktop: { fontSize: 22, fontWeight: "700", color: "#0B1E3D" },
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

  secaoCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 16,
    marginBottom: 16,
  },
  secaoCardDesktop: {
    padding: 26,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: "#0B1E3D",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 1,
  },
  secaoCabecalho: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  checkboxDecorativo: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#3B82F6",
  },
  secaoTitulo: { fontSize: 14.5, fontWeight: "700", color: "#0B1E3D" },
  numeroQuestao: { fontSize: 12.5, fontWeight: "700", color: "#3B82F6", marginBottom: 12 },

  rotulo: { fontSize: 12.5, fontWeight: "600", color: "#334155", marginTop: 12, marginBottom: 6 },
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
  campoTextoArea: { minHeight: 80, textAlignVertical: "top" },
  campoSelect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
  },
  campoSelectPlaceholder: { fontSize: 13, color: "#94A3B8" },

  avisoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    width: "100%",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    borderRadius: 12,
    padding: 14,
    marginBottom: 22,
  },
  avisoTextos: { flex: 1 },
  avisoTitulo: { fontSize: 12.5, fontWeight: "700", color: "#1D4ED8" },
  avisoDescricao: { fontSize: 11.5, color: "#3B5A8A", marginTop: 2, lineHeight: 15 },

  secaoTituloGrande: { fontSize: 16, fontWeight: "700", color: "#0B1E3D", width: "100%" },
  secaoSubtitulo: { fontSize: 12, color: "#94A3B8", marginBottom: 14, width: "100%" },

  barraFormatacao: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderBottomWidth: 0,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "#F8FAFC",
  },
  botaoFormatacao: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  botaoFormatacaoTexto: { fontSize: 12, fontWeight: "700", color: "#334155" },
  iconeFormatacao: { marginLeft: 2 },

  tiposGrade: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tipoPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  tipoPillAtivo: { backgroundColor: "#3B82F6", borderColor: "#3B82F6" },
  tipoPillTexto: { fontSize: 12.5, fontWeight: "600", color: "#334155" },
  tipoPillTextoAtivo: { color: "#FFFFFF" },

  botaoAdicionarQuestao: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    borderWidth: 1.5,
    borderColor: "#3B82F6",
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  botaoAdicionarQuestaoTexto: { color: "#3B82F6", fontSize: 13.5, fontWeight: "700" },

  acoesFinais: { flexDirection: "row", gap: 12, width: "100%" },
  acoesFinaisDesktop: {
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E7EBF3",
    paddingTop: 24,
    marginTop: 4,
  },
  botaoRascunho: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  botaoRascunhoDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    paddingHorizontal: 24,
  },
  botaoRascunhoTexto: { fontSize: 13.5, fontWeight: "700", color: "#334155" },
  botaoPublicar: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "#3B82F6",
  },
  botaoPublicarDesktop: {
    flexGrow: 0,
    flexShrink: 0,
    flexBasis: "auto",
    paddingHorizontal: 32,
  },
  botaoPublicarTexto: { fontSize: 13.5, fontWeight: "700", color: "#FFFFFF" },
});