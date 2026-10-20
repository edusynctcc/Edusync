import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

function descobrirEnderecoDaApi() {
  if (Platform.OS === "web") return "http://localhost:3333";

  const host =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest?.debuggerHost ||
    "";

  const ip = host.split(":")[0];

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
  importacao: `${API_URL}/importacao`,
};

export function urlDaImagem(caminho) {
  const valor = String(caminho ?? "").trim();
  if (!valor) return "";

  if (/^(https?:|file:|data:|blob:)/i.test(valor)) return valor;

  return `${API_URL}${valor.startsWith("/") ? "" : "/"}${valor}`;
}

function mensagemDeErro(dados, padrao, status) {
  const detalhe = dados?.detalhe;

  const frase = dados?.erro
    ? dados.erro
    : status
      ? `${padrao} (HTTP ${status})`
      : padrao;

  return detalhe ? `${frase}\n\n${detalhe}` : frase;
}

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
    const erro = new Error(
      mensagemDeErro(dados, "Erro ao conectar com o servidor.", resposta.status)
    );
    erro.status = resposta.status;
    erro.dados = dados;
    throw erro;
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
  if (dados.token) await AsyncStorage.setItem("token", dados.token);
  return dados;
}

export async function verificarEmail(email, codigo) {
  const dados = await apiFetch(`${API_URL}/auth/verificar-email`, {
    method: "POST",
    body: { email, codigo },
  });
  await AsyncStorage.setItem("token", dados.token);
  return dados;
}

export async function loginComCodigo(email, codigo) {
  const dados = await apiFetch(`${API_URL}/auth/login-codigo`, {
    method: "POST",
    body: { email, codigo },
  });
  await AsyncStorage.setItem("token", dados.token);
  return dados;
}

export function reenviarCodigo(email, tipo) {
  return apiFetch(`${API_URL}/auth/reenviar-codigo`, {
    method: "POST",
    body: { email, tipo },
  });
}

export function esqueciSenha(email) {
  return apiFetch(`${API_URL}/auth/esqueci-senha`, {
    method: "POST",
    body: { email },
  });
}

export function redefinirSenha(email, codigo, nova_senha) {
  return apiFetch(`${API_URL}/auth/redefinir-senha`, {
    method: "POST",
    body: { email, codigo, nova_senha },
  });
}

export function atualizarSeguranca(login_2fa) {
  return apiFetch(`${API_URL}/auth/seguranca`, {
    method: "PUT",
    body: { login_2fa },
    autenticado: true,
  });
}

export function buscarPerfil() {
  return apiFetch(ENDPOINTS.me, { autenticado: true });
}

export function atualizarPerfil(nome, email, telefone, endereco) {
  return apiFetch(ENDPOINTS.me, {
    method: "PUT",
    body: { nome, email, telefone, endereco },
    autenticado: true,
  });
}

export function alterarSenha(senha_atual, nova_senha) {
  return apiFetch(`${API_URL}/auth/senha`, {
    method: "PUT",
    body: { senha_atual, nova_senha },
    autenticado: true,
  });
}

export function atualizarNotificacoes(notif_correcao) {
  return apiFetch(`${API_URL}/auth/notificacoes`, {
    method: "PUT",
    body: { notif_correcao },
    autenticado: true,
  });
}

export function atualizarFoto(foto) {
  return apiFetch(`${API_URL}/auth/foto`, {
    method: "PUT",
    body: { foto },
    autenticado: true,
  });
}

export function atualizarPreferencias(pref_peso_padrao, pref_tipo_padrao, pref_nota_minima) {
  return apiFetch(`${API_URL}/auth/preferencias`, {
    method: "PUT",
    body: { pref_peso_padrao, pref_tipo_padrao, pref_nota_minima },
    autenticado: true,
  });
}

export function listarAvisos() {
  return apiFetch(`${API_URL}/auth/avisos`, { autenticado: true });
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

export function travarAtividade(id, travada) {
  return apiFetch(`${ENDPOINTS.atividades}/${id}/status`, {
    method: "PUT",
    body: { travada },
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


function lerComoBlob(uri) {
  return new Promise((resolve, reject) => {
    const requisicao = new XMLHttpRequest();
    requisicao.onload = () => resolve(requisicao.response);
    requisicao.onerror = () =>
      reject(new Error("Não consegui ler essa imagem do aparelho."));
    requisicao.ontimeout = () =>
      reject(new Error("A leitura da imagem demorou demais."));
    requisicao.timeout = 15000;
    requisicao.responseType = "blob";
    requisicao.open("GET", uri, true);
    requisicao.send(null);
  });
}

function embrulhar(blob, nome, mime) {
  try {
    if (blob && mime && typeof File === "function") {
      const arquivo = new File([blob], nome, { type: mime });
      if (arquivo && (!blob.size || arquivo.size === blob.size)) return arquivo;
    }
  } catch (e) {
    console.warn("[EduSync] File não serviu:", e?.message || e);
  }
  return blob;
}

export async function enviarImagemDaQuestao(id_questao, arquivo) {
  const token = await AsyncStorage.getItem("token");

  const mime = arquivo?.mime || "image/jpeg";
  const extensao =
    mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const nome = `questao-${id_questao}.${extensao}`;

  let parte;

  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error("A imagem se perdeu. Escolha de novo.");
    }
    parte = arquivo.objetoWeb;
  } else {
    if (!arquivo?.uri) {
      throw new Error("A imagem se perdeu. Escolha de novo.");
    }
    parte = embrulhar(await lerComoBlob(arquivo.uri), nome, mime);
  }

  if (parte?.size === 0) {
    throw new Error("Essa imagem veio vazia. Escolha outra.");
  }

  const formulario = new FormData();
  formulario.append("imagem", parte);

  const resposta = await fetch(`${ENDPOINTS.questoes}/${id_questao}/imagem`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      mensagemDeErro(dados, "Não consegui enviar a imagem.", resposta.status)
    );
  }

  return dados;
}

export function removerImagemDaQuestao(id_questao) {
  return apiFetch(`${ENDPOINTS.questoes}/${id_questao}/imagem`, {
    method: "DELETE",
    autenticado: true,
  });
}


export async function lerListaDeChamada(id_turma, arquivo) {
  const token = await AsyncStorage.getItem("token");

  const nome = arquivo?.nome || "chamada";
  const mime = arquivo?.mime || "application/pdf";

  let parte;

  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error("O arquivo se perdeu. Escolha de novo.");
    }
    parte = arquivo.objetoWeb;
  } else {
    if (!arquivo?.uri) {
      throw new Error("O arquivo se perdeu. Escolha de novo.");
    }
    parte = embrulhar(await lerComoBlob(arquivo.uri), nome, mime);
  }

  if (parte?.size === 0) {
    throw new Error("Esse arquivo veio vazio. Escolha outro.");
  }

  const formulario = new FormData();
  formulario.append("arquivo", parte);
  formulario.append("id_turma", String(id_turma));

  const resposta = await fetch(`${ENDPOINTS.alunos}/importar/ler`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      mensagemDeErro(dados, "Não consegui ler essa lista.", resposta.status)
    );
  }

  return dados;
}

export function importarAlunos(id_turma, alunos) {
  return apiFetch(`${ENDPOINTS.alunos}/importar`, {
    method: "POST",
    body: { id_turma, alunos },
    autenticado: true,
  });
}


export async function lerAtividadeDeArquivo(arquivo) {
  const token = await AsyncStorage.getItem("token");

  const nome = arquivo?.nome || "atividade";
  const mime = arquivo?.mime || "application/pdf";

  let parte;

  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error("O arquivo se perdeu. Escolha de novo.");
    }
    parte = arquivo.objetoWeb;
  } else {
    if (!arquivo?.uri) {
      throw new Error("O arquivo se perdeu. Escolha de novo.");
    }
    parte = embrulhar(await lerComoBlob(arquivo.uri), nome, mime);
  }

  if (parte?.size === 0) {
    throw new Error("Esse arquivo veio vazio. Escolha outro.");
  }

  const formulario = new FormData();
  formulario.append("arquivo", parte);

  const resposta = await fetch(`${ENDPOINTS.importacao}/atividade`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formulario,
  });

  const dados = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new Error(
      mensagemDeErro(dados, "Não consegui ler essa atividade.", resposta.status)
    );
  }

  return dados;
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

export async function enviarCorrecao({ arquivo, id_atividade }) {
  const token = await AsyncStorage.getItem("token");
  const formulario = new FormData();

  if (Platform.OS === "web") {
    if (!arquivo?.objetoWeb) {
      throw new Error("O arquivo se perdeu. Escolha a folha de novo no Scanner.");
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
    throw new Error(
      mensagemDeErro(
        dados,
        "Não consegui enviar a folha para correção.",
        resposta.status
      )
    );
  }

  return dados;
}

export function confirmarCorrecao({ id_leitura, id_aluno }) {
  return apiFetch(`${ENDPOINTS.correcoes}/confirmar`, {
    method: "POST",
    body: { id_leitura, id_aluno },
    autenticado: true,
  });
}


export function buscarCorrecao(id_correcao) {
  return apiFetch(`${ENDPOINTS.correcoes}/${id_correcao}`, { autenticado: true });
}

export function ajustarResposta(id_correcao, id_resposta, nota) {
  return apiFetch(`${ENDPOINTS.correcoes}/${id_correcao}/respostas/${id_resposta}`, {
    method: "PUT",
    body: { nota },
    autenticado: true,
  });
}

export function concluirCorrecao(id_correcao, { observacao, reabrir } = {}) {
  return apiFetch(`${ENDPOINTS.correcoes}/${id_correcao}/concluir`, {
    method: "PUT",
    body: { observacao, reabrir },
    autenticado: true,
  });
}

export function listarCorrecoes({ limite, id_atividade } = {}) {
  const partes = [];
  if (limite) partes.push(`limite=${limite}`);
  if (id_atividade) partes.push(`id_atividade=${id_atividade}`);

  const consulta = partes.length ? `?${partes.join("&")}` : "";

  return apiFetch(`${ENDPOINTS.correcoes}${consulta}`, { autenticado: true });
}

export function desempenhoPorQuestao(id_atividade) {
  return apiFetch(
    `${ENDPOINTS.correcoes}/atividade/${id_atividade}/questoes`,
    { autenticado: true }
  );
}

export function concluirAtividade(id_atividade, { reabrir } = {}) {
  return apiFetch(`${ENDPOINTS.correcoes}/atividade/${id_atividade}/concluir`, {
    method: "PUT",
    body: { reabrir },
    autenticado: true,
  });
}