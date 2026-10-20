
const MODELO_PADRAO = 'gemini-3.8-flash';

function modeloAtual() {
  return process.env.GEMINI_MODEL || MODELO_PADRAO;
}

const TENTATIVAS = 3;
const ESPERA_MS = [1200, 3500];

const TEMPO_LIMITE_MS = 45000;
const TEMPO_POR_PAGINA_EXTRA_MS = 20000;
const TEMPO_LIMITE_MAX_MS = 120000;

function tempoLimite(paginas: number) {
  const calculado =
    TEMPO_LIMITE_MS + Math.max(0, paginas - 1) * TEMPO_POR_PAGINA_EXTRA_MS;
  return Math.min(calculado, TEMPO_LIMITE_MAX_MS);
}

function ehTemporario(status: number) {
  return (
    status === 0 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504
  );
}

function esperar(ms: number) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function urlDoModelo(modelo: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
}

export type QuestaoGabarito = {
  numero: number;
  pergunta: string;
  tipo: string;
  resposta_correta: string;
  peso: number;
  alternativas: { letra: string; texto: string }[];
};

export type PaginaDaFolha = {
  base64: string;
  mimeType: string;
};

export type LeituraQuestao = {
  numero: number;
  letra_marcada: string | null;
  palavras_encontradas: string[];
  resultado_encontrado: string | null;
  caminho_correto: boolean | null;
  resposta_aluno: string;
  confianca: 'alta' | 'media' | 'baixa';
  observacao: string;
};

export type LeituraFolha = {
  nome_aluno: string;
  questoes: LeituraQuestao[];
};

const FORMATO_JSON = `{
  "nome_aluno": "texto",
  "questoes": [
    {
      "numero": 1,
      "letra_marcada": "A" ou null,
      "palavras_encontradas": ["texto", "texto"],
      "resultado_encontrado": "texto" ou null,
      "caminho_correto": true/false ou null,
      "resposta_aluno": "texto",
      "confianca": "alta" ou "media" ou "baixa",
      "observacao": "texto"
    }
  ]
}`;

function instrucaoDePaginas(total: number) {
  if (total <= 1) return '';

  return `
==================== ATENÇÃO: SÃO ${total} PÁGINAS ====================

As ${total} imagens acima são páginas DA MESMA folha, do MESMO aluno, na ordem
em que aparecem. Não são provas diferentes.

- A numeração das questões CONTINUA de uma página para a outra. A questão 6
  que aparece na segunda imagem é a questão 6 da prova, e não a primeira dela.
  Use sempre o número impresso ao lado do enunciado.
- O nome do aluno costuma estar só na primeira página. Leia de lá.
- Todas as páginas levam no alto o mesmo código (EDU-…) e o mesmo número de
  chamada escrito à mão. Se uma página trouxer um código ou um número
  DIFERENTE das outras, diga isso na "observacao" da primeira questão dela —
  é sinal de que uma folha de outro aluno entrou no meio.
- Uma questão pode começar numa página e terminar na seguinte. Junte as duas
  partes numa resposta só.

`;
}

function montarPrompt(gabarito: QuestaoGabarito[], totalPaginas = 1) {
  const questoes = gabarito
    .map((q) => {
      const cabecalho = `QUESTÃO ${q.numero} (tipo: ${q.tipo})\nEnunciado: ${q.pergunta}`;

      if (q.tipo === 'alternativa') {
        const opcoes = q.alternativas
          .map((a) => `  ${a.letra}) ${a.texto}`)
          .join('\n');
        return `${cabecalho}\nAlternativas:\n${opcoes}`;
      }

      if (q.tipo === 'dissertativa') {
        const palavras = q.resposta_correta
          .split(';')
          .map((p) => p.trim())
          .filter(Boolean)
          .map((p) => `  - ${p}`)
          .join('\n');
        return `${cabecalho}\nConceitos que a resposta deve conter:\n${palavras}`;
      }

      return `${cabecalho}\nResultado esperado: ${q.resposta_correta}`;
    })
    .join('\n\n');

  const abertura =
    totalPaginas > 1
      ? `Você está lendo as ${totalPaginas} páginas da folha de respostas manuscrita de um aluno.`
      : 'Você está lendo a foto de uma folha de respostas manuscrita de um aluno.';

  return `${abertura}

Sua tarefa é APENAS LER o que está escrito. Você NÃO calcula nota, NÃO decide
se está certo ou errado, NÃO dá pontuação. Quem faz a conta é o sistema.
${instrucaoDePaginas(totalPaginas)}
Leia o nome do aluno no topo da folha.

Para cada questão abaixo, registre o que o aluno respondeu:

- tipo "alternativa": em "letra_marcada", ponha a letra que o aluno assinalou
  (A, B, C, D ou E). Se estiver em branco, rasurado ou ambíguo, use null.

- tipo "dissertativa": em "palavras_encontradas", liste quais conceitos da
  lista o aluno expressou na resposta dele. Copie os conceitos EXATAMENTE como
  aparecem na lista. Aceite sinônimo e formulação equivalente: se a lista pede
  "água" e o aluno escreveu "H2O", o conceito foi expressado. Se ele explicou
  a ideia com outras palavras, também conta. Não inclua conceito que ele não
  demonstrou entender.

- tipo "calculo": em "resultado_encontrado", ponha o resultado final que o
  aluno chegou. Em "caminho_correto", diga se as contas até ali fazem sentido,
  mesmo que o resultado final esteja errado.

Em "resposta_aluno", transcreva literalmente o que ele escreveu naquela
questão. Serve para o professor conferir sua leitura.

Em "confianca", seja honesto:
- "alta": letra limpa, resposta sem ambiguidade
- "media": deu para ler mas ficou alguma dúvida
- "baixa": borrado, rasurado, letra ruim, ou a questão está em branco

Em "observacao", uma frase curta só quando houver algo que o professor precisa
saber (rasura, resposta fora do lugar, duas alternativas marcadas). Caso
contrário, deixe vazio.

NUNCA invente uma resposta. Se não conseguir ler, use confianca "baixa" e
deixe resposta_aluno vazio. Um erro de leitura vale menos que um "não consegui".

Devolva uma entrada para CADA questão listada, mesmo as em branco${
    totalPaginas > 1
      ? ' e mesmo as que ficaram numa página que você não conseguiu ler'
      : ''
  }.

Responda SOMENTE com um JSON neste formato, sem texto antes ou depois:

${FORMATO_JSON}

==================== GABARITO DA ATIVIDADE ====================

${questoes}`;
}

function limparCercaDeCodigo(texto: string) {
  const limpo = texto.trim();
  if (!limpo.startsWith('```')) return limpo;
  return limpo
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
}

const URL_LISTA = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100';

const NAO_SERVE = /image|tts|embedding|veo|imagen|nano-banana|customtools|live/i;

const MAX_ALTERNATIVOS = 3;

let listaEmCache: string[] | null = null;

async function listarModelos(chave: string): Promise<string[]> {
  if (listaEmCache) return listaEmCache;

  try {
    const r = await fetch(URL_LISTA, { headers: { 'x-goog-api-key': chave } });
    if (!r.ok) return [];

    const d: any = await r.json();

    listaEmCache = (d.models || [])
      .filter((m: any) =>
        (m.supportedGenerationMethods || []).includes('generateContent')
      )
      .map((m: any) => String(m.name || '').replace(/^models\//, ''))
      .filter((nome: string) => nome && !NAO_SERVE.test(nome));

    return listaEmCache!;
  } catch {
    return [];
  }
}

function prioridade(nome: string) {
  if (/lite/i.test(nome)) return 0;
  if (/flash/i.test(nome)) return 1;
  return 2;
}

async function modelosAlternativos(chave: string, jaTentado: string) {
  const todos = await listarModelos(chave);

  return todos
    .filter((nome) => nome !== jaTentado)
    .sort((a, b) => prioridade(a) - prioridade(b) || a.localeCompare(b))
    .slice(0, MAX_ALTERNATIVOS);
}

function trocarDeModeloAjuda(status: number) {
  return status === 0 || status === 404 || status === 429 || status >= 500;
}

async function pedirAoGemini(
  modelo: string,
  corpo: string,
  chave: string,
  tentativas: number,
  limiteMs: number
): Promise<{ resposta: any; falha: { status: number; texto: string } | null }> {
  let falha: { status: number; texto: string } | null = null;

  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    const controlador = new AbortController();
    const relogio = setTimeout(() => controlador.abort(), limiteMs);

    let tentada: Response;

    try {
      tentada = await fetch(urlDoModelo(modelo), {
        method: 'POST',
        headers: {
          'x-goog-api-key': chave,
          'Content-Type': 'application/json',
        },
        body: corpo,
        signal: controlador.signal,
      });
    } catch (e: any) {
      const foiTempoLimite = e?.name === 'AbortError';

      falha = {
        status: 0,
        texto: foiTempoLimite
          ? `o Gemini não respondeu em ${limiteMs / 1000}s`
          : String(e?.message || e),
      };

      const espera = ESPERA_MS[tentativa];
      if (espera === undefined) break;

      console.warn(
        `[gemini] ${modelo} não respondeu na tentativa ${tentativa + 1} de ` +
          `${tentativas} (${falha.texto}). Repetindo em ${espera}ms.`
      );
      await esperar(espera);
      continue;
    } finally {
      clearTimeout(relogio);
    }

    if (tentada.ok) return { resposta: tentada, falha: null };

    falha = { status: tentada.status, texto: await tentada.text() };

    if (!ehTemporario(tentada.status)) break;

    const espera = ESPERA_MS[tentativa];
    if (espera === undefined) break;

    console.warn(
      `[gemini] ${modelo} respondeu ${tentada.status} na tentativa ` +
        `${tentativa + 1} de ${tentativas}. Repetindo em ${espera}ms.`
    );
    await esperar(espera);
  }

  return { resposta: null, falha };
}

function explicarErro(
  status: number,
  corpo: string,
  modelo = modeloAtual(),
  limiteMs = TEMPO_LIMITE_MS
) {
  if (status === 0) {
    return (
      `O Gemini não respondeu em ${limiteMs / 1000}s com o modelo "${modelo}" ` +
      `(sem erro, sem resposta) nas ${TENTATIVAS} tentativas. Costuma ser instabilidade ` +
      'de rede ou o servidor do Google engasgado — tente de novo. ' +
      `Detalhe: ${corpo.slice(0, 200)}`
    );
  }

  if (status === 401 || status === 403) {
    return (
      `A chave do Gemini foi recusada (${status}). ` +
      'Confira se GEMINI_API_KEY está no .env e se o servidor foi reiniciado ' +
      'depois de editar o arquivo — o .env só é lido quando a API sobe. ' +
      `Resposta do Google: ${corpo.slice(0, 200)}`
    );
  }

  if (status === 404) {
    return (
      `O modelo "${modelo}" não existe para esta chave (404). ` +
      'Liste os disponíveis com curl -H "x-goog-api-key: SUA_CHAVE" ' +
      'https://generativelanguage.googleapis.com/v1beta/models ' +
      'e ponha um deles em GEMINI_MODEL no .env. ' +
      `Resposta do Google: ${corpo.slice(0, 200)}`
    );
  }

  if (status === 413 || /too large|payload/i.test(corpo)) {
    return (
      'As páginas somadas ficaram grandes demais para uma chamada só. ' +
      'Mande menos páginas por folha, ou fotografe com qualidade um pouco ' +
      'menor. Resposta do Google: ' + corpo.slice(0, 200)
    );
  }

  if (status === 503) {
    return (
      `O modelo "${modelo}" está congestionado no Google agora (503). ` +
      `Já tentei ${TENTATIVAS} vezes. Toque em "Tentar de novo" — costuma passar em segundos. ` +
      'Se insistir, troque de modelo: liste os disponíveis com ' +
      'curl -H "x-goog-api-key: SUA_CHAVE" ' +
      'https://generativelanguage.googleapis.com/v1beta/models ' +
      'e ponha um deles em GEMINI_MODEL no .env. Os modelos menores costumam ' +
      'ter fila bem menor que o mais recente.'
    );
  }

  if (status === 429) {
    return (
      'A cota gratuita do Gemini estourou por agora (429). ' +
      'Espere alguns minutos e tente de novo.'
    );
  }

  if (status >= 500) {
    return (
      `O servidor do Google falhou (${status}) nas ${TENTATIVAS} tentativas. ` +
      'Não é problema do seu código — tente de novo em instantes.'
    );
  }

  return `Gemini respondeu ${status}: ${corpo.slice(0, 300)}`;
}

export async function lerFolha(
  paginas: PaginaDaFolha[],
  gabarito: QuestaoGabarito[]
): Promise<LeituraFolha> {
  const chave = process.env.GEMINI_API_KEY;

  if (!chave) {
    throw new Error(
      'O servidor não enxergou a GEMINI_API_KEY. Três coisas para conferir, ' +
        'nesta ordem: (1) a linha GEMINI_API_KEY está no edusync-api/.env; ' +
        "(2) o src/server.ts carrega o .env — a primeira linha dele tem que ser " +
        "import 'dotenv/config'; (3) a API foi reiniciada depois disso, " +
        'porque o .env só é lido quando ela sobe.'
    );
  }

  if (!paginas || paginas.length === 0) {
    throw new Error('Nenhuma página foi enviada para leitura.');
  }

  const escolhido = modeloAtual();
  const limiteMs = tempoLimite(paginas.length);

  const pesoTotal = paginas.reduce((soma, p) => soma + p.base64.length, 0);
  console.log(
    `[gemini] lendo ${paginas.length} ${paginas.length === 1 ? 'página' : 'páginas'} ` +
      `(~${Math.round((pesoTotal * 3) / 4 / 1024)} KB) com o modelo "${escolhido}", ` +
      `limite de ${limiteMs / 1000}s`
  );

  const corpo = JSON.stringify({
    contents: [
      {
        parts: [
          ...paginas.map((p) => ({
            inline_data: { mime_type: p.mimeType, data: p.base64 },
          })),
          { text: montarPrompt(gabarito, paginas.length) },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  let { resposta, falha } = await pedirAoGemini(
    escolhido,
    corpo,
    chave,
    TENTATIVAS,
    limiteMs
  );
  let modeloQueFalhou = escolhido;

  if (!resposta && falha && trocarDeModeloAjuda(falha.status)) {
    for (const alternativo of await modelosAlternativos(chave, escolhido)) {
      console.warn(
        `[gemini] "${escolhido}" não atendeu (${falha!.status}). ` +
          `Tentando "${alternativo}".`
      );

      const outra = await pedirAoGemini(alternativo, corpo, chave, 1, limiteMs);

      if (outra.resposta) {
        resposta = outra.resposta;
        console.log(
          `[gemini] deu certo com "${alternativo}". Para começar por ele da ` +
            `próxima vez, ponha GEMINI_MODEL="${alternativo}" no .env.`
        );
        break;
      }

      falha = outra.falha;
      modeloQueFalhou = alternativo;
    }
  }

  if (!resposta) {
    throw new Error(
      explicarErro(falha!.status, falha!.texto, modeloQueFalhou, limiteMs)
    );
  }

  const dados: any = await resposta.json();

  const partes = dados?.candidates?.[0]?.content?.parts || [];
  const texto = partes
    .map((p: any) => p?.text || '')
    .join('')
    .trim();

  if (!texto) {
    const motivo = dados?.candidates?.[0]?.finishReason;
    const bloqueio = dados?.promptFeedback?.blockReason;

    if (bloqueio) {
      throw new Error(
        `O Gemini recusou ${paginas.length === 1 ? 'a imagem' : 'as imagens'} ` +
          `(${bloqueio}). Tente outra foto da folha.`
      );
    }

    throw new Error(
      `A IA não devolveu texto${motivo ? ` (finishReason: ${motivo})` : ''}. ` +
        'Resposta: ' + JSON.stringify(dados).slice(0, 300)
    );
  }

  try {
    return JSON.parse(limparCercaDeCodigo(texto)) as LeituraFolha;
  } catch {
    throw new Error('A IA não devolveu um JSON válido: ' + texto.slice(0, 300));
  }
}