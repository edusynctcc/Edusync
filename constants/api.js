import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

// ---------------------------------------------------------------------------
// Onde está a API.
//
// No navegador, "localhost" é a própria máquina e funciona.
//
// No celular NÃO funciona: lá "localhost" é o telefone, não o seu computador.
// Só que o Expo já sabe o IP da máquina que está servindo o app — é por ele
// que o celular baixou o bundle. Reaproveitamos esse IP e trocamos a porta
// 8081 (Expo) pela 3333 (API).
//
// Fazendo assim ninguém precisa editar este arquivo quando o IP do Wi-Fi
// mudar, que é o tipo de coisa que quebra o app na hora da apresentação.
// ---------------------------------------------------------------------------
function descobrirEnderecoDaApi() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }

  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      const host = window.location.hostname || "localhost";
      const protocolo = window.location.protocol || "http:";
      return `${protocolo}//${host}:3333`;
    }
    return "http://localhost:3333";
  }

  const host =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";

  const ip = host.split(":")[0];

  // Sem IP (build de produção, por exemplo) cai no localhost e o erro que
  // aparece é de conexão, que ao menos diz a verdade.
  return ip ? `http://${ip}:3333` : "http://localhost:3333";
}

export const API_URL = descobrirEnderecoDaApi();

export const ENDPOINTS = {
  register: `${API_URL}/auth/register`,
  login: `${API_URL}/auth/login`,
  me: `${API_URL}/auth/me`,
  turmas: `${API_URL}/turmas`,
  atividades: `${API_URL}/atividades`,
  alunos: `${API_URL}/alunos`,
  questoes: `${API_URL}/questoes`,
  alternativas: `${API_URL}/alternativas`,
  correcoes: `${API_URL}/correcoes`,
};

async function apiFetch(
  url,
  { method = "GET", body, autenticado = false } = {},
) {
  const headers = { "Content-Type": "application/json" };

  if (autenticado) {
    const token = await AsyncStorage.getItem("token");
    headers.Authorization = `Bearer ${token}`;
  }

  const resposta = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.erro || "Erro ao conectar com o servidor.");
  }

  return dados;
}

export function registrar(nome, email, senha) {
  return apiFetch(ENDPOINTS.register, {
    method: "POST",
    body: { nome, email, senha },
  });
}

export async function login(email, senha) {
  const dados = await apiFetch(ENDPOINTS.login, {
    method: "POST",
    body: { email, senha },
  });
  await AsyncStorage.setItem("token", dados.token);
  return dados;
}

export function buscarPerfil() {
  return apiFetch(ENDPOINTS.me, { autenticado: true });
}

export function listarTurmas() {
  return apiFetch(ENDPOINTS.turmas, { autenticado: true });
}

export function criarTurma(nome, escola) {
  return apiFetch(ENDPOINTS.turmas, {
    method: "POST",
    body: { nome, escola },
    autenticado: true,
  });
}

export function buscarTurma(id) {
  return apiFetch(`${ENDPOINTS.turmas}/${id}`, { autenticado: true });
}

export function atualizarTurma(id, nome, escola) {
  return apiFetch(`${ENDPOINTS.turmas}/${id}`, {
    method: "PUT",
    body: { nome, escola },
    autenticado: true,
  });
}

export function excluirTurma(id) {
  return apiFetch(`${ENDPOINTS.turmas}/${id}`, {
    method: "DELETE",
    autenticado: true,
  });
}

export function listarAtividades() {
  return apiFetch(ENDPOINTS.atividades, { autenticado: true });
}

export function criarAtividade(nome, disciplina, descricao, id_turma) {
  return apiFetch(ENDPOINTS.atividades, {
    method: "POST",
    body: { nome, disciplina, descricao, id_turma },
    autenticado: true,
  });
}

export function buscarAtividade(id) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}`, { autenticado: true });
}

export function atualizarAtividade(id, nome, disciplina, descricao, id_turma) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}`, {
    method: "PUT",
    body: { nome, disciplina, descricao, id_turma },
    autenticado: true,
  });
}

export function excluirAtividade(id) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}`, {
    method: "DELETE",
    autenticado: true,
  });
}

export function listarAlunos(id_turma) {
  return apiFetch(`${ENDPOINTS.alunos}?id_turma=${id_turma}`, {
    autenticado: true,
  });
}

export function criarAluno(nome, matricula, numero_chamada, id_turma) {
  return apiFetch(ENDPOINTS.alunos, {
    method: "POST",
    body: { nome, matricula, numero_chamada, id_turma },
    autenticado: true,
  });
}

export function buscarAluno(id) {
  return apiFetch(`${ENDPOINTS.alunos}/${id}`, { autenticado: true });
}

export function atualizarAluno(id, nome, matricula, numero_chamada) {
  return apiFetch(`${ENDPOINTS.alunos}/${id}`, {
    method: "PUT",
    body: { nome, matricula, numero_chamada },
    autenticado: true,
  });
}

export function excluirAluno(id) {
  return apiFetch(`${ENDPOINTS.alunos}/${id}`, {
    method: "DELETE",
    autenticado: true,
  });
}

export function listarQuestoes(id_atividade) {
  return apiFetch(`${ENDPOINTS.questoes}?id_atividade=${id_atividade}`, {
    autenticado: true,
  });
}

export function criarQuestao(
  numero,
  pergunta,
  tipo,
  resposta_correta,
  peso,
  id_atividade,
) {
  return apiFetch(ENDPOINTS.questoes, {
    method: "POST",
    body: { numero, pergunta, tipo, resposta_correta, peso, id_atividade },
    autenticado: true,
  });
}

export function buscarQuestao(id) {
  return apiFetch(`${ENDPOINTS.questoes}/${id}`, { autenticado: true });
}

export function atualizarQuestao(
  id,
  numero,
  pergunta,
  tipo,
  resposta_correta,
  peso,
) {
  return apiFetch(`${ENDPOINTS.questoes}/${id}`, {
    method: "PUT",
    body: { numero, pergunta, tipo, resposta_correta, peso },
    autenticado: true,
  });
}

export function excluirQuestao(id) {
  return apiFetch(`${ENDPOINTS.questoes}/${id}`, {
    method: "DELETE",
    autenticado: true,
  });
}

export function listarAlternativas(id_questao) {
  return apiFetch(`${ENDPOINTS.alternativas}?id_questao=${id_questao}`, {
    autenticado: true,
  });
}

export function criarAlternativa(letra, texto, id_questao) {
  return apiFetch(ENDPOINTS.alternativas, {
    method: "POST",
    body: { letra, texto, id_questao },
    autenticado: true,
  });
}

export function buscarAlternativa(id) {
  return apiFetch(`${ENDPOINTS.alternativas}/${id}`, { autenticado: true });
}

export function atualizarAlternativa(id, letra, texto) {
  return apiFetch(`${ENDPOINTS.alternativas}/${id}`, {
    method: "PUT",
    body: { letra, texto },
    autenticado: true,
  });
}

export function excluirAlternativa(id) {
  return apiFetch(`${ENDPOINTS.alternativas}/${id}`, {
    method: "DELETE",
    autenticado: true,
  });
}

// ===========================================================================
// CORREÇÃO DE FOLHA
//
// O upload não passa pelo apiFetch de propósito. O apiFetch força
// Content-Type: application/json e faz JSON.stringify no corpo — para enviar
// arquivo isso não serve. O FormData precisa montar o próprio Content-Type,
// com o boundary do multipart. Se definirmos o header na mão, o servidor não
// consegue separar as partes e o arquivo chega vazio, sem erro nenhum — que é
// o pior tipo de bug, o que parece que funcionou.
// ===========================================================================
export async function enviarCorrecao({ arquivo, id_atividade }) {
  const token = await AsyncStorage.getItem("token");
  const formulario = new FormData();

  // Web e celular esperam formatos diferentes aqui. No navegador vai o objeto
  // File de verdade; no celular, a descrição { uri, name, type }.
  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error(
        "O arquivo se perdeu. Escolha a folha de novo no Scanner.",
      );
    }
    formulario.append("imagem", arquivo.objetoWeb, arquivo.nome);
  } else {
    formulario.append("imagem", {
      uri: arquivo.uri,
      name: arquivo.nome,
      type: arquivo.mime,
    });
  }

  formulario.append("id_atividade", String(id_atividade));

  const resposta = await fetch(ENDPOINTS.correcoes, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(dados.erro || "Não consegui enviar a folha para correção.");
  }

  return dados;
}

// Segundo tempo: o professor confirmou de quem é a folha. Aqui vai só o código
// da leitura e o id do aluno — a nota já está guardada no servidor, calculada
// por ele. Nenhuma nota trafega a partir do celular.
export function confirmarCorrecao({ id_leitura, id_aluno }) {
  return apiFetch(`${ENDPOINTS.correcoes}/confirmar`, {
    method: "POST",
    body: { id_leitura, id_aluno },
    autenticado: true,
  });
}

// ===========================================================================
// REVISÃO — depois que a correção já está no banco
// ===========================================================================

export function buscarCorrecao(id_correcao) {
  return apiFetch(`${ENDPOINTS.correcoes}/${id_correcao}`, {
    autenticado: true,
  });
}

// O professor discordou da IA. Manda só a nota nova; o servidor confere se ela
// cabe no peso da questão e recalcula o total sozinho.
export function ajustarResposta(id_correcao, id_resposta, nota) {
  return apiFetch(
    `${ENDPOINTS.correcoes}/${id_correcao}/respostas/${id_resposta}`,
    {
      method: "PUT",
      body: { nota },
      autenticado: true,
    },
  );
}

export function concluirCorrecao(id_correcao, { observacao, reabrir } = {}) {
  return apiFetch(`${ENDPOINTS.correcoes}/${id_correcao}/concluir`, {
    method: "PUT",
    body: { observacao, reabrir },
    autenticado: true,
  });
}

// Lista as correções já gravadas. Sem parâmetro vem tudo; com limite vem só as
// mais recentes, que é o que o Scanner mostra embaixo dos botões.
export function listarCorrecoes({ limite, id_atividade } = {}) {
  const partes = [];
  if (limite) partes.push(`limite=${limite}`);
  if (id_atividade) partes.push(`id_atividade=${id_atividade}`);

  const consulta = partes.length ? `?${partes.join("&")}` : "";

  return apiFetch(`${ENDPOINTS.correcoes}${consulta}`, { autenticado: true });
}

// Fecha (ou reabre) todas as correções de uma atividade de uma vez.
export function concluirAtividade(id_atividade, { reabrir } = {}) {
  return apiFetch(`${ENDPOINTS.correcoes}/atividade/${id_atividade}/concluir`, {
    method: "PUT",
    body: { reabrir },
    autenticado: true,
  });
}
