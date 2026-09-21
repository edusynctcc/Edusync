const URL_GEMINI = 'https://generativelanguage.googleapis.com/v1beta/interactions';

// Uma linha só. Se um dia der 404 de modelo, é aqui que se troca:
// gemini-3.8-flash (mais capaz) · gemini-3.6-flash · gemini-3.5-flash (mais antigo)
const MODELO = 'gemini-3.6-flash';

// A API versiona o formato por data. Sem este cabeçalho o corpo da resposta
// pode voltar num formato diferente do que este arquivo sabe ler.
const REVISAO_API = '2026-05-20';

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

// O formato que a IA é obrigada a devolver. Sem isto ela responde em texto
// livre e o JSON.parse quebra na metade das vezes.
const FORMATO_RESPOSTA = {
  type: 'text',
  mime_type: 'application/json',
  schema: {
    type: 'object',
    properties: {
      nome_aluno: { type: 'string' },
      questoes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            numero: { type: 'integer' },
            letra_marcada: { type: 'string', nullable: true },
            palavras_encontradas: { type: 'array', items: { type: 'string' } },
            resultado_encontrado: { type: 'string', nullable: true },
            caminho_correto: { type: 'boolean', nullable: true },
            resposta_aluno: { type: 'string' },
            confianca: { type: 'string', enum: ['alta', 'media', 'baixa'] },
            observacao: { type: 'string' },
          },
          required: ['numero', 'resposta_aluno', 'confianca'],
        },
      },
    },
    required: ['nome_aluno', 'questoes'],
  },
};

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

  return `Você está lendo a folha de respostas manuscrita de um aluno. Pode ser
uma foto tirada pelo professor ou um PDF escaneado.

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

==================== GABARITO DA ATIVIDADE ====================

${questoes}`;
}

// PDF e imagem entram por portas diferentes: o PDF vai como "document" e a
// foto como "image". Mandar PDF marcado como imagem faz a API recusar.
function montarEntradaDoArquivo(arquivoBase64: string, mimeType: string) {
  const ehPdf = mimeType === 'application/pdf';

  return {
    type: ehPdf ? 'document' : 'image',
    data: arquivoBase64,
    mime_type: mimeType,
  };
}

export async function lerFolha(
  arquivoBase64: string,
  mimeType: string,
  gabarito: QuestaoGabarito[]
): Promise<LeituraFolha> {
  const chave = process.env.GEMINI_API_KEY;

  if (!chave) {
    throw new Error('GEMINI_API_KEY não está no .env');
  }

  const resposta = await fetch(URL_GEMINI, {
    method: 'POST',
    headers: {
      'x-goog-api-key': chave,
      'Content-Type': 'application/json',
      'Api-Revision': REVISAO_API,
    },
    body: JSON.stringify({
      model: MODELO,
      // O arquivo vem primeiro e a instrução depois, como na documentação.
      input: [
        montarEntradaDoArquivo(arquivoBase64, mimeType),
        { type: 'text', text: montarPrompt(gabarito) },
      ],
      response_format: FORMATO_RESPOSTA,
      // temperatura 0: a mesma folha dá sempre a mesma leitura. Importante
      // para o TCC — resultado que muda a cada rodada não se defende.
      generation_config: { temperature: 0 },
    }),
  });

  if (!resposta.ok) {
    const corpo = await resposta.text();
    throw new Error(`Gemini respondeu ${resposta.status}: ${corpo.slice(0, 300)}`);
  }

  const dados: any = await resposta.json();

  // O texto vem dentro de steps[]. Pode haver passos antes do model_output,
  // então procuramos em vez de assumir a posição 0.
  const passo = (dados.steps || []).find((p: any) => p.type === 'model_output');
  const parte = (passo?.content || []).find((c: any) => c.type === 'text');
  const texto = parte?.text;

  if (!texto) {
    throw new Error('A IA não devolveu texto. Resposta: ' + JSON.stringify(dados).slice(0, 300));
  }

  try {
    return JSON.parse(texto) as LeituraFolha;
  } catch {
    throw new Error('A IA não devolveu um JSON válido: ' + texto.slice(0, 300));
  }
}
