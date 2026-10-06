// ---------------------------------------------------------------------------
// A leitura da folha pela IA.
//
// ATENÇÃO AO QUE ESTA CAMADA FAZ E AO QUE ELA NÃO FAZ:
//   faz  -> lê o que está escrito na folha e devolve em JSON
//   NÃO  -> não calcula nota, não decide certo/errado, não dá pontuação
// A nota é calculada em notaService.ts, em código auditável. Isso é o que
// permite responder "como vocês garantem que a nota está certa?".
//
// Endpoint: o oficial e documentado do Gemini,
//   POST /v1beta/models/{modelo}:generateContent
//
// A chave vai no cabeçalho 'x-goog-api-key', e NÃO como ?key= na URL. As
// chaves novas do Google (as que começam com "AQ.") só são aceitas no
// cabeçalho — no parâmetro da URL elas respondem 401/404.
// ---------------------------------------------------------------------------

// O modelo pode ser trocado pelo .env sem mexer no código:
//   GEMINI_MODEL="gemini-2.5-flash"
//
// Lido dentro da função, e não no topo do arquivo, de propósito: se fosse no
// topo, ele seria lido no instante em que o arquivo é importado — que pode ser
// ANTES do dotenv.config() rodar. Aí a variável do .env não valeria nada e
// ninguém entenderia por quê.
const MODELO_PADRAO = 'gemini-3.8-flash';

function modeloAtual() {
  return process.env.GEMINI_MODEL || MODELO_PADRAO;
}

// Quantas vezes insistir quando a culpa é do servidor do Google, e quanto
// esperar entre uma tentativa e outra.
//
// O 503 ("high demand") é frequente nos modelos mais novos e some sozinho em
// segundos. Desistir na primeira recusa seria transformar um soluço do Google
// numa falha da apresentação.
const TENTATIVAS = 3;
const ESPERA_MS = [1200, 3500];

// -----------------------------------------------------------------------
// TEMPO LIMITE DESTA CHAMADA
//
// O fetch do Node não tem tempo limite próprio. Se a conexão for aceita mas o
// Google nunca responder (rede instável, proxy engasgado, sem erro nenhum de
// volta), o fetch fica pendurado PARA SEMPRE — nenhuma das defesas abaixo
// (TENTATIVAS, ESPERA_MS, ehTemporario) entra em ação, porque elas só tratam
// uma resposta de erro, e aqui não chega resposta nenhuma.
//
// É esse o motivo da imagem travar na leitura: o app tem timeout no envio,
// mas o servidor esperava pelo Gemini sem prazo nenhum.
// -----------------------------------------------------------------------
const TEMPO_LIMITE_MS = 45000;

// Erros que valem uma segunda chance: são do servidor, não do nosso pedido.
// Chave errada, modelo inexistente ou corpo malformado não melhoram com
// insistência — esses falham de primeira, para a mensagem chegar rápido.
//
// status 0 é o nosso próprio código para "não veio resposta nenhuma" (caiu no
// tempo limite ou a conexão falhou) — tratado como temporário pelo mesmo
// motivo que um 503: pode ser um soluço passageiro de rede.
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

// O desenho exato do JSON, escrito no próprio prompt. Junto com o
// responseMimeType "application/json" lá embaixo, é o que faz a resposta vir
// sempre no mesmo formato em vez de texto corrido.
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

function montarPrompt(gabarito: QuestaoGabarito[]) {
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

  return `Você está lendo a foto de uma folha de respostas manuscrita de um aluno.

Sua tarefa é APENAS LER o que está escrito. Você NÃO calcula nota, NÃO decide
se está certo ou errado, NÃO dá pontuação. Quem faz a conta é o sistema.

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

Devolva uma entrada para CADA questão listada, mesmo as em branco.

Responda SOMENTE com um JSON neste formato, sem texto antes ou depois:

${FORMATO_JSON}

==================== GABARITO DA ATIVIDADE ====================

${questoes}`;
}

// Às vezes o modelo devolve o JSON embrulhado em ```json ... ```. Em vez de
// quebrar por causa de três crases, limpamos antes de fazer o parse.
function limparCercaDeCodigo(texto: string) {
  const limpo = texto.trim();
  if (!limpo.startsWith('```')) return limpo;
  return limpo
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/```\s*$/, '')
    .trim();
}

// ---------------------------------------------------------------------------
// Descobrir outros modelos quando o escolhido não atende.
//
// Os nomes dos modelos do Gemini mudam: uns são aposentados, outros entram, e
// os mais novos vivem congestionados. Deixar um nome fixo no código significa
// que um dia, sem aviso, a correção para de funcionar.
//
// Então, quando o modelo configurado falha por motivo que trocar resolve, o
// próprio servidor pergunta ao Google quais existem para esta chave e tenta
// outro. Nada aqui é chute: a lista vem da API.
// ---------------------------------------------------------------------------
const URL_LISTA = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=100';

// Modelos que existem mas não servem para ler uma folha: geram imagem, falam,
// ou só viram vetor. O nome basta para descartar.
const NAO_SERVE = /image|tts|embedding|veo|imagen|nano-banana|customtools|live/i;

// Quantos alternativos tentar antes de desistir. Cada um custa uma chamada e
// alguns segundos — e alguém está esperando na frente da tela.
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
    // Se nem a lista deu, o erro original é o que interessa — não este.
    return [];
  }
}

// Ordem de preferência: primeiro os "lite" (menores, fila bem menor), depois
// os "flash" (rápidos e bons de leitura), e o resto por último. Modelo "pro"
// aqui seria caro e lento para uma tarefa que é, no fundo, transcrição.
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

// Vale trocar de modelo? Só quando a recusa é do modelo: ele não existe mais,
// está lotado, ou estourou a cota dele. Chave errada e pedido malformado
// falhariam igual em qualquer outro.
function trocarDeModeloAjuda(status: number) {
  return status === 0 || status === 404 || status === 429 || status >= 500;
}

// Uma rodada de tentativas contra UM modelo.
async function pedirAoGemini(
  modelo: string,
  corpo: string,
  chave: string,
  tentativas: number
): Promise<{ resposta: any; falha: { status: number; texto: string } | null }> {
  let falha: { status: number; texto: string } | null = null;

  for (let tentativa = 0; tentativa < tentativas; tentativa++) {
    // Um controlador novo a cada tentativa: o sinal de um abort() não pode
    // vazar para a tentativa seguinte.
    const controlador = new AbortController();
    const relogio = setTimeout(() => controlador.abort(), TEMPO_LIMITE_MS);

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
      // Cai aqui em duas situações: o abort() disparou (nome 'AbortError'),
      // ou a conexão falhou antes disso (DNS, rede caiu). Nos dois casos não
      // existe status HTTP — usamos 0 para os dois entrarem no mesmo fluxo de
      // nova tentativa / troca de modelo que um 503 entraria.
      const foiTempoLimite = e?.name === 'AbortError';

      falha = {
        status: 0,
        texto: foiTempoLimite
          ? `o Gemini não respondeu em ${TEMPO_LIMITE_MS / 1000}s`
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

    // Erro que não é do servidor não melhora insistindo: sai agora.
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

// Mensagem de erro que diz o que fazer, não só o que aconteceu. Quando algo
// falha no meio de uma apresentação, "401" não ajuda ninguém.
function explicarErro(status: number, corpo: string, modelo = modeloAtual()) {

  if (status === 0) {
    return (
      `O Gemini não respondeu em ${TEMPO_LIMITE_MS / 1000}s com o modelo "${modelo}" ` +
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
  imagemBase64: string,
  mimeType: string,
  gabarito: QuestaoGabarito[]
): Promise<LeituraFolha> {
  const chave = process.env.GEMINI_API_KEY;

  if (!chave) {
    // Esta mensagem já custou horas uma vez. A chave pode estar escrita no
    // .env e mesmo assim não chegar aqui: basta ninguém ter chamado o
    // dotenv.config() antes, ou a API não ter sido reiniciada depois da
    // edição. Por isso a mensagem diz onde procurar, não só o que faltou.
    throw new Error(
      'O servidor não enxergou a GEMINI_API_KEY. Três coisas para conferir, ' +
        'nesta ordem: (1) a linha GEMINI_API_KEY está no edusync-api/.env; ' +
        "(2) o src/server.ts carrega o .env — a primeira linha dele tem que ser " +
        "import 'dotenv/config'; (3) a API foi reiniciada depois disso, " +
        'porque o .env só é lido quando ela sobe.'
    );
  }

  const escolhido = modeloAtual();

  // Diz no terminal qual modelo está em uso, a cada folha. Parece bobo, mas
  // sem isso não dá para saber se a API releu o .env depois de uma troca —
  // e "reiniciei e não mudou nada" é fácil de confundir com "não reiniciei".
  console.log(`[gemini] lendo a folha com o modelo "${escolhido}"`);

  const corpo = JSON.stringify({
    contents: [
      {
        parts: [
          { inline_data: { mime_type: mimeType, data: imagemBase64 } },
          { text: montarPrompt(gabarito) },
        ],
      },
    ],
    generationConfig: {
      // temperatura 0: a mesma folha dá sempre a mesma leitura. Importante
      // para o TCC — resultado que muda a cada rodada não se defende.
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  let { resposta, falha } = await pedirAoGemini(escolhido, corpo, chave, TENTATIVAS);
  let modeloQueFalhou = escolhido;

  // O modelo configurado não atendeu por um motivo que trocar resolve. Em vez
  // de devolver erro e deixar a pessoa procurar nome de modelo na internet, o
  // servidor pergunta ao Google o que existe e tenta outro.
  if (!resposta && falha && trocarDeModeloAjuda(falha.status)) {
    for (const alternativo of await modelosAlternativos(chave, escolhido)) {
      console.warn(
        `[gemini] "${escolhido}" não atendeu (${falha!.status}). ` +
          `Tentando "${alternativo}".`
      );

      // Uma tentativa por alternativo: se este também estiver lotado, é mais
      // rápido passar para o próximo do que insistir neste.
      const outra = await pedirAoGemini(alternativo, corpo, chave, 1);

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
    throw new Error(explicarErro(falha!.status, falha!.texto, modeloQueFalhou));
  }

  const dados: any = await resposta.json();

  // O texto vem em candidates[0].content.parts[]. Pode vir dividido em mais de
  // uma parte, então juntamos todas em vez de assumir que só existe a [0].
  const partes = dados?.candidates?.[0]?.content?.parts || [];
  const texto = partes
    .map((p: any) => p?.text || '')
    .join('')
    .trim();

  if (!texto) {
    const motivo = dados?.candidates?.[0]?.finishReason;
    const bloqueio = dados?.promptFeedback?.blockReason;

    if (bloqueio) {
      throw new Error(`O Gemini recusou a imagem (${bloqueio}). Tente outra foto da folha.`);
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