import * as XLSX from 'xlsx';
import { perguntarAoGemini } from './iaService';

// ---------------------------------------------------------------------------
// LER A LISTA DE CHAMADA DE UM ARQUIVO
//
// Dois caminhos, conforme o que o professor mandar:
//
//   planilha (.xlsx, .csv)  -> lida aqui mesmo, sem IA. É tabela, tem linha e
//                              coluna, não precisa de modelo nenhum para isso.
//   PDF ou foto             -> lida pelo Gemini, que enxerga a página.
//
// NADA É GRAVADO AQUI. Esta camada devolve uma lista para a tela mostrar ao
// professor, e é ele quem confirma. O motivo é concreto: lista de chamada de
// escola tem aluno transferido riscado, observação no rodapé, linha de
// cabeçalho repetida no meio da página. Gravar direto seria cadastrar lixo.
// ---------------------------------------------------------------------------

export type AlunoLido = {
  nome: string;
  matricula: string | null;
  numero_chamada: number | null;
};

const FORMATO_JSON = `{
  "alunos": [
    { "numero_chamada": 1, "nome": "texto", "matricula": "texto" ou null }
  ]
}`;

const PROMPT = `Você está lendo uma LISTA DE CHAMADA de uma turma de escola.

Sua tarefa é APENAS TRANSCREVER os alunos que aparecem nela. Você não cadastra
nada, não corrige nome, não completa nome abreviado.

Para cada aluno, devolva:
- "numero_chamada": o número que aparece ao lado do nome. Se não houver, null.
- "nome": o nome completo, exatamente como está escrito.
- "matricula": o RA, matrícula ou código do aluno, se a lista tiver. Senão null.

REGRAS QUE IMPORTAM:

1. NÃO inclua quem estiver marcado como transferido, remanejado, desistente ou
   cancelado — normalmente aparece riscado, com "T", "TR", "REM" ao lado, ou
   numa seção separada no fim da lista. Se houver dúvida, inclua: o professor
   confere depois.

2. NÃO inclua linhas que não são aluno: cabeçalho ("Nº", "NOME DO ALUNO"),
   nome da escola, nome do professor, rodapé, total de alunos, assinatura.

3. NÃO invente aluno para preencher buraco na numeração. Se a lista pula do 7
   para o 9, devolva 7 e 9.

4. Mantenha a ordem em que aparecem na lista.

5. Se a mesma pessoa aparecer duas vezes, devolva uma vez só.

Responda SOMENTE com um JSON neste formato, sem texto antes ou depois:

${FORMATO_JSON}`;

// ---------------------------------------------------------------------------
// A conversa com o Gemini mora no iaService, junto com a da atividade pronta.
// Aqui fica só o que é desta leitura: o que perguntar e o que fazer com a
// resposta.
//
// Antes as duas tinham a mesma chamada copiada. A espera entre tentativas, que
// é o que resolve o "modelo lotado", entrou numa e teria ficado faltando na
// outra.
// ---------------------------------------------------------------------------
async function lerComGemini(
  arquivoBase64: string,
  mimeType: string
): Promise<AlunoLido[]> {
  const lido = await perguntarAoGemini(
    [
      { inline_data: { mime_type: mimeType, data: arquivoBase64 } },
      { text: PROMPT },
    ],
    'chamada'
  );

  return Array.isArray(lido?.alunos) ? lido.alunos : [];
}

// ---------------------------------------------------------------------------
// A PLANILHA
//
// Lista de chamada em Excel quase sempre tem três colunas: número, nome e às
// vezes o RA. O que varia é o cabeçalho ("Nº", "N.", "CHAMADA", "ORD") e
// quantas linhas de enfeite vêm antes dele — nome da escola, da turma, do
// bimestre.
//
// Então: procuramos a linha de cabeçalho pelo texto, e tudo que vem depois é
// aluno. Sem cabeçalho reconhecível, caímos numa leitura por posição.
// ---------------------------------------------------------------------------
function semAcento(texto: unknown) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

const ROTULOS_NUMERO = ['no', 'n', 'num', 'numero', 'chamada', 'ord', 'ordem'];
const ROTULOS_NOME = ['nome', 'aluno', 'alunos', 'nome do aluno', 'estudante'];
const ROTULOS_MATRICULA = ['ra', 'matricula', 'registro', 'codigo', 'rm'];

function acharColunas(linha: unknown[]) {
  const colunas = { numero: -1, nome: -1, matricula: -1 };

  linha.forEach((celula, i) => {
    const texto = semAcento(celula).replace(/[^a-z ]/g, '').trim();
    if (!texto) return;

    if (colunas.nome < 0 && ROTULOS_NOME.includes(texto)) colunas.nome = i;
    else if (colunas.numero < 0 && ROTULOS_NUMERO.includes(texto)) colunas.numero = i;
    else if (colunas.matricula < 0 && ROTULOS_MATRICULA.includes(texto)) colunas.matricula = i;
  });

  return colunas;
}

function lerPlanilha(arquivo: Buffer): AlunoLido[] {
  const pasta = XLSX.read(arquivo, { type: 'buffer' });
  const primeiraAba = pasta.SheetNames[0];
  if (!primeiraAba) return [];

  const aba = pasta.Sheets[primeiraAba];
  if (!aba) return [];

  // header: 1 devolve array de arrays — linhas cruas, sem o Excel tentar
  // adivinhar nome de campo a partir da primeira linha.
  const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, {
    header: 1,
    blankrows: false,
    defval: '',
  });

  // Procura o cabeçalho nas primeiras 15 linhas. Depois disso já é conteúdo.
  let inicio = -1;
  let colunas = { numero: -1, nome: -1, matricula: -1 };

  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const achadas = acharColunas(linhas[i] || []);
    if (achadas.nome >= 0) {
      inicio = i + 1;
      colunas = achadas;
      break;
    }
  }

  // Sem cabeçalho: assume o formato mais comum, número na primeira coluna e
  // nome na segunda. Se a primeira não for número, o nome é que está nela.
  if (inicio < 0) {
    const primeira = linhas.find((l) => (l || []).some((c) => String(c ?? '').trim()));
    const comecaComNumero = /^\d+$/.test(String(primeira?.[0] ?? '').trim());

    inicio = 0;
    colunas = comecaComNumero
      ? { numero: 0, nome: 1, matricula: 2 }
      : { numero: -1, nome: 0, matricula: 1 };
  }

  const alunos: AlunoLido[] = [];

  for (let i = inicio; i < linhas.length; i++) {
    const linha = linhas[i] || [];
    const nome = String(linha[colunas.nome] ?? '').trim();

    if (!nome) continue;

    // Linha que não é aluno: cabeçalho repetido no meio da página (acontece
    // quando a lista tem mais de uma folha), total, assinatura, rodapé.
    //
    // A comparação usa as MESMAS listas de rótulo do acharColunas. Ter uma
    // segunda lista aqui significaria que acrescentar "Estudante" num lugar e
    // esquecer do outro faz o cabeçalho virar aluno — foi exatamente o que
    // aconteceu no primeiro teste com "Nome do aluno".
    const limpo = semAcento(nome).replace(/[^a-z ]/g, '').trim();

    if (
      ROTULOS_NOME.includes(limpo) ||
      ROTULOS_NUMERO.includes(limpo) ||
      ROTULOS_MATRICULA.includes(limpo)
    ) {
      continue;
    }

    if (
      /^(total|assinatura|professor|diretor|coordenador|obs|observacao|observacoes|escola|turma|serie|turno|data|emitido|fim)\b/.test(
        limpo
      )
    ) {
      continue;
    }

    // Nome de gente começa com letra. Nota de rodapé não: "(1 transferida em
    // 14/03)", "* aluno com laudo", "-- fim da lista --". O teste com uma
    // planilha de verdade pegou a primeira delas entrando como aluna, logo
    // abaixo do "TOTAL DE ALUNOS" — que o filtro acima já descartava.
    //
    // A checagem é no nome CRU, não no `limpo`: o `limpo` já tirou o
    // parêntese e o número, então "(1 transferida em 14/03)" chega aqui como
    // "transferida em" e passa como se fosse nome.
    // A classe é escrita à mão em vez de \p{L} porque o \p{L} exige
    // target es2018 no tsconfig, e aqui não vale arriscar o build por isso.
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]/.test(nome)) continue;

    const numeroCru = colunas.numero >= 0 ? String(linha[colunas.numero] ?? '').trim() : '';
    const numero = /^\d+$/.test(numeroCru) ? Number(numeroCru) : null;

    const matriculaCrua =
      colunas.matricula >= 0 ? String(linha[colunas.matricula] ?? '').trim() : '';

    alunos.push({
      nome,
      numero_chamada: numero,
      matricula: matriculaCrua || null,
    });
  }

  return alunos;
}

const TIPOS_DE_PLANILHA = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
];

export async function lerChamada(
  arquivo: Buffer,
  mimeType: string,
  nomeDoArquivo = ''
): Promise<AlunoLido[]> {
  const ehPlanilha =
    TIPOS_DE_PLANILHA.includes(mimeType) || /\.(xlsx|xls|csv)$/i.test(nomeDoArquivo);

  const brutos = ehPlanilha
    ? lerPlanilha(arquivo)
    : await lerComGemini(arquivo.toString('base64'), mimeType);

  // Limpeza final, igual para os dois caminhos: tira espaço duplicado, corta
  // o que não cabe no banco e descarta repetido dentro do próprio arquivo.
  const vistos = new Set<string>();
  const limpos: AlunoLido[] = [];

  for (const bruto of brutos) {
    const nome = String(bruto?.nome ?? '').replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!nome) continue;

    const chave = semAcento(nome);
    if (vistos.has(chave)) continue;
    vistos.add(chave);

    const matricula = String(bruto?.matricula ?? '').trim().slice(0, 50) || null;
    const numero = Number(bruto?.numero_chamada);

    limpos.push({
      nome,
      matricula,
      numero_chamada: Number.isInteger(numero) && numero > 0 ? numero : null,
    });
  }

  return limpos;
}