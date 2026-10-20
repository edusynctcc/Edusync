import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { lerFolha, PaginaDaFolha, QuestaoGabarito } from '../services/geminiService';
import { calcularFolha, ResultadoCorrecao } from '../services/notaService';
import { LEITURA_DEMO } from '../services/demo';
import { acharAluno } from '../services/alunoService';

const prisma = new PrismaClient();

type ArquivoEnviado = { buffer: Buffer; mimetype: string };

type LeituraPendente = {
  id_professor: number;
  id_atividade: number;
  resultado: ResultadoCorrecao;
  emDemo: boolean;
  criado_em: number;
};

const pendentes = new Map<string, LeituraPendente>();

const VALIDADE_MS = 30 * 60 * 1000;

function limparVencidos() {
  const agora = Date.now();
  for (const [chave, item] of pendentes) {
    if (agora - item.criado_em > VALIDADE_MS) pendentes.delete(chave);
  }
}

const LIMITE_RESPOSTA = 1000;
const LIMITE_COMENTARIO = 400;

function cortar(texto: string, limite: number) {
  const limpo = String(texto ?? '');
  return limpo.length <= limite ? limpo : limpo.slice(0, limite - 1) + '…';
}

async function carregarAtividade(id_atividade: number, id_professor: number) {
  return prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
    include: {
      turma: { include: { aluno: { orderBy: { numero_chamada: 'asc' } } } },
      questao: { orderBy: { numero: 'asc' }, include: { alternativa: true } },
    },
  });
}

function paginasEnviadas(req: Request): ArquivoEnviado[] {
  const lista = (req as any).files as ArquivoEnviado[] | undefined;
  if (Array.isArray(lista) && lista.length > 0) return lista;

  const unico = (req as any).file as ArquivoEnviado | undefined;
  return unico ? [unico] : [];
}

export async function corrigirFolha(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.body.id_atividade);
  const paginas = paginasEnviadas(req);

  if (!id_atividade) {
    return res.status(400).json({ erro: 'id_atividade é obrigatório' });
  }

  if (paginas.length === 0) {
    return res.status(400).json({ erro: 'Envie a foto ou o PDF da folha no campo "imagem"' });
  }

  const atividade = await carregarAtividade(id_atividade, id_professor);

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  if (atividade.questao.length === 0) {
    return res.status(400).json({ erro: 'Esta atividade ainda não tem questões cadastradas' });
  }

  const gabarito: QuestaoGabarito[] = atividade.questao.map((q) => ({
    numero: q.numero,
    pergunta: q.pergunta,
    tipo: q.tipo,
    resposta_correta: q.resposta_correta ?? '',
    peso: Number(q.peso ?? 1),
    alternativas: q.alternativa.map((a) => ({
      letra: a.letra ?? '',
      texto: a.texto ?? '',
    })),
  }));

  const emDemo = process.env.SCANNER_DEMO === '1';
  let resultado: ResultadoCorrecao;

  const paginasParaIA: PaginaDaFolha[] = paginas.map((p) => ({
    base64: p.buffer.toString('base64'),
    mimeType: p.mimetype,
  }));

  try {
    const leitura = emDemo
      ? LEITURA_DEMO(gabarito)
      : await lerFolha(paginasParaIA, gabarito);

    resultado = calcularFolha(gabarito, leitura);
  } catch (e: any) {
    console.error('[scanner] falhou:', e.message);
    return res.status(502).json({
      erro: 'Não foi possível corrigir esta folha agora.',
      detalhe: e.message,
    });
  }

  const alunos = atividade.turma.aluno;
  const id_sugerido = acharAluno(resultado.nome_aluno, alunos);
  const sugerido = id_sugerido ? alunos.find((a) => a.id_aluno === id_sugerido) : null;

  limparVencidos();
  const id_leitura = randomUUID();
  pendentes.set(id_leitura, {
    id_professor,
    id_atividade,
    resultado,
    emDemo,
    criado_em: Date.now(),
  });

  return res.json({
    id_leitura,
    id_atividade,
    modo: emDemo ? 'demo' : 'ia',
    salvo: false,
    paginas_lidas: paginas.length,
    sugestao: sugerido
      ? { id_aluno: sugerido.id_aluno, nome: sugerido.nome, numero_chamada: sugerido.numero_chamada }
      : null,
    alunos_da_turma: alunos.map((a) => ({
      id_aluno: a.id_aluno,
      nome: a.nome,
      numero_chamada: a.numero_chamada,
    })),
    ...resultado,
  });
}

export async function confirmarCorrecao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_leitura = String(req.body.id_leitura ?? '');
  const id_aluno = Number(req.body.id_aluno);

  if (!id_leitura || !id_aluno) {
    return res.status(400).json({ erro: 'id_leitura e id_aluno são obrigatórios' });
  }

  limparVencidos();
  const pendente = pendentes.get(id_leitura);

  if (!pendente) {
    return res.status(410).json({
      erro: 'Esta leitura expirou. Envie a folha de novo.',
    });
  }

  if (pendente.id_professor !== id_professor) {
    return res.status(403).json({ erro: 'Esta leitura não é sua.' });
  }

  const { id_atividade, resultado } = pendente;

  const atividade = await carregarAtividade(id_atividade, id_professor);

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const aluno = atividade.turma.aluno.find((a) => a.id_aluno === id_aluno);

  if (!aluno) {
    return res.status(400).json({ erro: 'Esse aluno não é desta turma.' });
  }

  let correcao: any;

  try {
    correcao = await prisma.correcao.upsert({
      where: { id_atividade_id_aluno: { id_atividade, id_aluno } },
      create: {
        id_atividade,
        id_aluno,
        nota: resultado.nota_total,
        status: 'pendente',
        corrigido_em: new Date(),
      },
      update: {
        nota: resultado.nota_total,
        status: 'pendente',
        corrigido_em: new Date(),
      },
    });

    await prisma.resposta.deleteMany({ where: { id_correcao: correcao.id_correcao } });

    const respostas = atividade.questao.map((questao) => {
      const calculada = resultado.questoes.find((q) => q.numero === questao.numero);

      return {
        id_correcao: correcao.id_correcao,
        id_questao: questao.id_questao,
        resposta: cortar(calculada?.resposta_aluno ?? '', LIMITE_RESPOSTA),
        nota: calculada?.nota ?? 0,
        comentario: cortar(
          [calculada?.detalhe, calculada?.observacao].filter(Boolean).join(' · '),
          LIMITE_COMENTARIO
        ),
        ajustado_manualmente: false,
      };
    });

    await prisma.resposta.createMany({ data: respostas });
  } catch (e: any) {
    console.error('[correcao] falhou ao gravar:', e.code, e.message);

    if (e.code === 'P2000') {
      const coluna = e.meta?.column_name || e.meta?.target || '(não informada)';
      return res.status(400).json({
        erro: 'Não consegui salvar esta correção.',
        detalhe:
          `A coluna "${coluna}" da tabela resposta é pequena demais para o que ` +
          'a IA leu. No schema.prisma, troque o tipo dela para @db.Text e rode ' +
          'npx prisma db push.',
      });
    }

    return res.status(500).json({
      erro: 'Não consegui salvar esta correção.',
      detalhe: `${e.code ? e.code + ': ' : ''}${e.message}`.slice(0, 300),
    });
  }

  pendentes.delete(id_leitura);

  return res.json({
    id_atividade,
    id_correcao: correcao.id_correcao,
    modo: pendente.emDemo ? 'demo' : 'ia',
    salvo: true,
    aluno: { id_aluno: aluno.id_aluno, nome: aluno.nome },
    ...resultado,
  });
}