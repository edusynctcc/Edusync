import * as XLSX from 'xlsx';
import { perguntarAoGemini } from './iaService';


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

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(aba, {
    header: 1,
    blankrows: false,
    defval: '',
  });

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