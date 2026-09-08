import AsyncStorage from "@react-native-async-storage/async-storage";

export const API_URL = "http://localhost:3333";

export const ENDPOINTS = {
  register: `${API_URL}/auth/register`,
  login: `${API_URL}/auth/login`,
  me: `${API_URL}/auth/me`,
  turmas: `${API_URL}/turmas`,
  atividades: `${API_URL}/atividades`,
  alunos: `${API_URL}/alunos`,
  questoes: `${API_URL}/questoes`,
  alternativas: `${API_URL}/alternativas`,
};

async function apiFetch(url, { method = "GET", body, autenticado = false } = {}) {
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

// ---- Autenticação ----

export function registrar(nome, email, senha) {
  return apiFetch(ENDPOINTS.register, { method: "POST", body: { nome, email, senha } });
}

export async function login(email, senha) {
  const dados = await apiFetch(ENDPOINTS.login, { method: "POST", body: { email, senha } });
  await AsyncStorage.setItem("token", dados.token);
  return dados;
}

export function buscarPerfil() {
  return apiFetch(ENDPOINTS.me, { autenticado: true });
}

// ---- Turmas ----

export function listarTurmas() {
  return apiFetch(ENDPOINTS.turmas, { autenticado: true });
}

export function criarTurma(nome, escola) {
  return apiFetch(ENDPOINTS.turmas, { method: "POST", body: { nome, escola }, autenticado: true });
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
  return apiFetch(`${ENDPOINTS.turmas}/${id}`, { method: "DELETE", autenticado: true });
}

// ---- Atividades ----

export function listarAtividades() {
  return apiFetch(ENDPOINTS.atividades, { autenticado: true });
}

export function criarAtividade(nome, descricao, id_turma) {
  return apiFetch(ENDPOINTS.atividades, {
    method: "POST",
    body: { nome, descricao, id_turma },
    autenticado: true,
  });
}

export function buscarAtividade(id) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}`, { autenticado: true });
}

export function atualizarAtividade(id, nome, descricao, id_turma) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}`, {
    method: "PUT",
    body: { nome, descricao, id_turma },
    autenticado: true,
  });
}

export function excluirAtividade(id) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}`, { method: "DELETE", autenticado: true });
}

// ---- Alunos ----

export function listarAlunos(id_turma) {
  return apiFetch(`${ENDPOINTS.alunos}?id_turma=${id_turma}`, { autenticado: true });
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
  return apiFetch(`${ENDPOINTS.alunos}/${id}`, { method: "DELETE", autenticado: true });
}

// ---- Questões ----

export function listarQuestoes(id_atividade) {
  return apiFetch(`${ENDPOINTS.questoes}?id_atividade=${id_atividade}`, { autenticado: true });
}

export function criarQuestao(numero, pergunta, tipo, resposta_correta, peso, id_atividade) {
  return apiFetch(ENDPOINTS.questoes, {
    method: "POST",
    body: { numero, pergunta, tipo, resposta_correta, peso, id_atividade },
    autenticado: true,
  });
}

export function buscarQuestao(id) {
  return apiFetch(`${ENDPOINTS.questoes}/${id}`, { autenticado: true });
}

export function atualizarQuestao(id, numero, pergunta, tipo, resposta_correta, peso) {
  return apiFetch(`${ENDPOINTS.questoes}/${id}`, {
    method: "PUT",
    body: { numero, pergunta, tipo, resposta_correta, peso },
    autenticado: true,
  });
}

export function excluirQuestao(id) {
  return apiFetch(`${ENDPOINTS.questoes}/${id}`, { method: "DELETE", autenticado: true });
}

// ---- Alternativas ----

export function listarAlternativas(id_questao) {
  return apiFetch(`${ENDPOINTS.alternativas}?id_questao=${id_questao}`, { autenticado: true });
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
  return apiFetch(`${ENDPOINTS.alternativas}/${id}`, { method: "DELETE", autenticado: true });
}