import { inflateRawSync } from 'zlib';
import { perguntarAoGemini, ParteDoPedido } from './iaService';

// ---------------------------------------------------------------------------
// LER UMA ATIVIDADE PRONTA DE UM ARQUIVO
//
// O professor que já tem a prova digitada manda o arquivo e o sistema devolve
// os enunciados e as alternativas já separados. Ele então define os critérios
// na tela: tipo, peso e gabarito.
//
// NADA É GRAVADO AQUI. Esta camada só lê e devolve uma proposta.
//
// ===========================================================================
// A REGRA QUE NÃO SE NEGOCIA: ESTA IMPORTAÇÃO NUNCA TRAZ GABARITO.
//
// Mesmo que o arquivo seja a cópia do professor com as respostas marcadas, e
// mesmo que o modelo consiga ler a marcação, o gabarito sai daqui vazio. O
// motivo é a assimetria do estrago:
//
//   enunciado lido errado  -> o professor vê na tela e corrige em dois toques
//   gabarito lido errado   -> a turma inteira é corrigida contra uma resposta
//                             inventada, e ninguém descobre
//
// Um "X" a lápis e um texto em negrito são a mesma coisa para o modelo. Não
// existe jeito de ele ter certeza, e o preço de errar é alto demais. Quem
// define o que é certo é o professor, sempre. O limparQuestao lá embaixo
// descarta qualquer campo de resposta que venha na resposta do modelo.
// ===========================================================================
// ---------------------------------------------------------------------------

export type AlternativaLida = { letra: string; texto: string };

export type QuestaoLida = {
  enunciado: string;
  tipo: 'alternativa' | 'dissertativa' | 'calculo';
  peso: number;
  alternativas: AlternativaLida[];
};

export type AtividadeLida = {
  titulo: string | null;
  disciplina: string | null;
  questoes: QuestaoLida[];
};

// Limites do banco, não escolhas de gosto (ver schema.prisma):
//   alternativa.texto  VARCHAR(255)
//   questao.peso       DECIMAL(4,2)
// Passar disso não dá erro de validação, dá erro 500 no insert.
const LIMITE_ALTERNATIVA = 255;
const PESO_MAXIMO = 99.99;
const MAXIMO_DE_QUESTOES = 60;
const LETRAS = ['A', 'B', 'C', 'D', 'E'];

// ---------------------------------------------------------------------------
// .docx SEM BIBLIOTECA NENHUMA
//
// Um .docx é um ZIP com XML dentro, e a parte que interessa é um arquivo só:
// word/document.xml. O Node já traz zlib, e ZIP sem criptografia é formato
// simples.
//
// Por que à mão em vez de `npm i mammoth`: a API já parou uma vez porque uma
// dependência nova não entrou. Sessenta linhas que eu testei valem mais do que
// mais um install para dar errado na sua máquina.
//
// Testado com .docx gerado pelo Word (via python-docx) e pelo LibreOffice, que
// escrevem o ZIP de jeitos diferentes. Não cobre ZIP64 nem entrada
// criptografada — um .docx de prova tem dezenas de KB.
// ---------------------------------------------------------------------------
const FIM_DO_INDICE = 0x06054b50;
const ENTRADA_DO_INDICE = 0x02014b50;

function acharFimDoIndice(zip: Buffer): number {
  // Tamanho variável (pode haver comentário no fim), então procura-se a
  // assinatura de trás para frente. 22 é o tamanho mínimo do bloco.
  const minimo = Math.max(0, zip.length - 22 - 0xffff);

  for (let i = zip.length - 22; i >= minimo; i--) {
    if (zip.readUInt32LE(i) === FIM_DO_INDICE) return i;
  }

  return -1;
}

function extrairDoZip(zip: Buffer, alvo: string): Buffer | null {
  const fim = acharFimDoIndice(zip);
  if (fim < 0) return null;

  const quantas = zip.readUInt16LE(fim + 10);
  let posicao = zip.readUInt32LE(fim + 16);

  for (let n = 0; n < quantas; n++) {
    if (posicao + 46 > zip.length) return null;
    if (zip.readUInt32LE(posicao) !== ENTRADA_DO_INDICE) return null;

    const compressao = zip.readUInt16LE(posicao + 10);
    const tamanhoComprimido = zip.readUInt32LE(posicao + 20);
    const tamanhoNome = zip.readUInt16LE(posicao + 28);
    const tamanhoExtra = zip.readUInt16LE(posicao + 30);
    const tamanhoComentario = zip.readUInt16LE(posicao + 32);
    const ondeComeca = zip.readUInt32LE(posicao + 42);

    const nome = zip.toString('utf8', posicao + 46, posicao + 46 + tamanhoNome);

    if (nome === alvo) {
      // O nome e o extra saem do cabeçalho local porque lá eles podem ter
      // outro tamanho; o tamanho dos dados vem do índice, que é sempre
      // correto (no cabeçalho local ele pode vir zerado).
      const nomeLocal = zip.readUInt16LE(ondeComeca + 26);
      const extraLocal = zip.readUInt16LE(ondeComeca + 28);
      const dados = ondeComeca + 30 + nomeLocal + extraLocal;

      const bruto = zip.subarray(dados, dados + tamanhoComprimido);

      if (compressao === 0) return Buffer.from(bruto);
      if (compressao === 8) return inflateRawSync(bruto);

      return null;
    }

    posicao += 46 + tamanhoNome + tamanhoExtra + tamanhoComentario;
  }

  return null;
}

function soltarEntidades(texto: string) {
  return texto
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&'); // por último, senão "&amp;lt;" viraria "<"
}

export function lerTextoDoDocx(arquivo: Buffer): string {
  const xml = extrairDoZip(arquivo, 'word/document.xml');

  if (!xml) {
    throw new Error(
      'Não consegui abrir esse .docx. Se ele foi salvo no formato .doc antigo, ' +
        'abra no Word e salve como .docx — ou mande a prova em PDF.'
    );
  }

  const texto = xml
    .toString('utf8')
    // Vira espaço em branco antes de as tags sumirem:
    .replace(/<w:tab[^>]*\/>/g, '\t')
    .replace(/<w:br[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    // O resto é marcação.
    .replace(/<[^>]+>/g, '');

  return soltarEntidades(texto)
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// O PEDIDO AO MODELO
// ---------------------------------------------------------------------------
const FORMATO_JSON = `{
  "titulo": "texto" ou null,
  "disciplina": "texto" ou null,
  "questoes": [
    {
      "enunciado": "texto",
      "tipo": "alternativa" | "dissertativa" | "calculo",
      "peso": 1,
      "alternativas": [ { "letra": "A", "texto": "texto" } ]
    }
  ]
}`;

const PROMPT = `Você está lendo uma PROVA ou LISTA DE EXERCÍCIOS que um professor já escreveu.

Sua tarefa é APENAS SEPARAR as questões que estão nela, do jeito que estão.
Você não resolve, não responde, não corrige, não melhora e não completa nada.

Para cada questão devolva:
- "enunciado": o texto da pergunta, como está escrito. Sem o número na frente.
- "tipo": "alternativa" se houver opções a/b/c/d para escolher;
          "calculo" se a questão pede uma conta, um valor ou um resultado
          numérico ("calcule", "determine", "quanto é", "qual o valor de");
          "dissertativa" nos outros casos (explique, justifique, descreva).
- "peso": o valor em pontos SE o texto disser ("2,0 pontos", "vale 1,5").
          Se não disser, use 1.
- "alternativas": as opções, com a letra em maiúscula. Lista vazia quando não
          for de alternativa.

REGRAS QUE IMPORTAM:

1. NUNCA diga qual alternativa é a correta, e nunca escreva uma resposta
   esperada — mesmo que o arquivo traga a resposta marcada, circulada,
   sublinhada, em negrito ou num gabarito no fim. Quem define o gabarito é o
   professor, na tela do sistema. Esta leitura é só do que foi perguntado.

2. NÃO inclua o que não é questão: cabeçalho da escola, nome do professor,
   linha para o aluno assinar, instruções gerais ("leia com atenção"),
   "boa prova", numeração de página, rodapé.

3. NÃO invente questão para completar a numeração. Se a prova pula da 3 para a
   5, devolva as duas que existem.

4. Mantenha a ordem em que aparecem.

5. Se a questão mencionar uma imagem, charge, gráfico ou mapa que você não
   consegue transcrever, devolva o enunciado assim mesmo. O professor anexa a
   figura depois.

6. Texto de alternativa longo demais: devolva como está, sem resumir.

Responda SOMENTE com um JSON neste formato, sem texto antes ou depois:

${FORMATO_JSON}`;

// ---------------------------------------------------------------------------
// LIMPEZA DO QUE VOLTOU
//
// O modelo devolve JSON, mas JSON não é garantia de conteúdo válido. Tudo o
// que vai para a tela passa por aqui.
// ---------------------------------------------------------------------------
function texto(valor: unknown, limite = 4000) {
  return String(valor ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limite);
}

function cortarEmAlternativa(bruto: string) {
  if (bruto.length <= LIMITE_ALTERNATIVA) return bruto;
  // Corta e avisa no próprio texto: o professor vê o "..." no campo e sabe
  // que precisa reescrever. Melhor do que o insert estourar na hora de salvar.
  return bruto.slice(0, LIMITE_ALTERNATIVA - 3) + '...';
}

const TIPOS_VALIDOS = ['alternativa', 'dissertativa', 'calculo'];

function limparQuestao(bruta: any): QuestaoLida | null {
  const enunciado = texto(bruta?.enunciado);
  if (!enunciado) return null;

  const alternativas: AlternativaLida[] = [];

  if (Array.isArray(bruta?.alternativas)) {
    bruta.alternativas.forEach((alt: any) => {
      if (alternativas.length >= LETRAS.length) return;

      const conteudo = texto(alt?.texto ?? alt);
      if (!conteudo) return;

      // A letra é renumerada em vez de confiar na que veio. Se o modelo
      // devolver A, B, D (pulando a C), a tela monta um gabarito com buraco.
      alternativas.push({
        letra: LETRAS[alternativas.length] as string,
        texto: cortarEmAlternativa(conteudo),
      });
    });
  }

  let tipo = String(bruta?.tipo ?? '').toLowerCase();
  if (!TIPOS_VALIDOS.includes(tipo)) tipo = '';

  // Uma alternativa sozinha não é escolha. Sem pelo menos duas, a questão não
  // pode ser do tipo "alternativa" — a tela exigiria marcar a correta entre
  // opções que não existem.
  if (alternativas.length < 2) {
    alternativas.length = 0;
    if (tipo === 'alternativa') tipo = '';
  } else {
    tipo = 'alternativa';
  }

  if (!tipo) {
    tipo = /\b(calcule|determine|quanto|qual o valor|resolva|efetue)\b/i.test(
      enunciado
    )
      ? 'calculo'
      : 'dissertativa';
  }

  // parseFloat e não Number + limpeza de caracteres: tirar tudo que não é
  // dígito transformaria -3 em 3, e um peso negativo passaria a valer 3. O
  // parseFloat devolve -3, que o teste `> 0` abaixo rejeita. Ele também
  // resolve "2,0 pontos", porque para no primeiro caractere que não serve.
  const pesoCru = parseFloat(String(bruta?.peso ?? 1).replace(',', '.'));
  const peso =
    Number.isFinite(pesoCru) && pesoCru > 0
      ? Math.min(pesoCru, PESO_MAXIMO)
      : 1;

  return {
    enunciado,
    tipo: tipo as QuestaoLida['tipo'],
    peso,
    alternativas,
    // Repare no que NÃO está aqui: letraCorreta, palavrasChave,
    // respostaEsperada. Se o modelo mandar, morre nesta linha — o objeto é
    // montado campo a campo, não espalhado a partir do que veio.
  };
}

const TIPOS_DE_TEXTO = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

export async function lerAtividadeDeArquivo(
  arquivo: Buffer,
  mimeType: string,
  nomeDoArquivo = ''
): Promise<AtividadeLida> {
  const ehDocx =
    mimeType === TIPOS_DE_TEXTO[0] || /\.docx$/i.test(nomeDoArquivo);
  const ehTextoPuro =
    TIPOS_DE_TEXTO.includes(mimeType) || /\.(txt|md)$/i.test(nomeDoArquivo);

  let partes: ParteDoPedido[];

  if (ehDocx) {
    const conteudo = lerTextoDoDocx(arquivo);

    if (!conteudo.trim()) {
      throw new Error('Esse .docx não tem texto — só imagem. Mande em PDF.');
    }

    partes = [{ text: `PROVA:\n\n${conteudo}` }, { text: PROMPT }];
  } else if (ehTextoPuro) {
    partes = [
      { text: `PROVA:\n\n${arquivo.toString('utf8')}` },
      { text: PROMPT },
    ];
  } else {
    // PDF, foto, print da tela: o modelo enxerga a página.
    partes = [
      { inline_data: { mime_type: mimeType, data: arquivo.toString('base64') } },
      { text: PROMPT },
    ];
  }

  const lido = await perguntarAoGemini(partes, 'atividade');

  const questoes = (Array.isArray(lido?.questoes) ? lido.questoes : [])
    .slice(0, MAXIMO_DE_QUESTOES)
    .map(limparQuestao)
    .filter((q: QuestaoLida | null): q is QuestaoLida => q !== null);

  if (questoes.length === 0) {
    throw new Error(
      'Não achei nenhuma questão nesse arquivo. Confira se é mesmo a prova — ' +
        'e se for uma foto, veja se o texto está legível.'
    );
  }

  return {
    titulo: texto(lido?.titulo, 150) || null,
    disciplina: texto(lido?.disciplina, 80) || null,
    questoes,
  };
}