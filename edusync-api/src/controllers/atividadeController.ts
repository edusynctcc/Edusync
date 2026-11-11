import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function criarAtividade(req: Request, res: Response) {
  const { nome, disciplina, descricao, imagem, id_turma } = req.body;
  const id_professor = req.professor!.id;

  if (!nome || !id_turma) {
    return res.status(400).json({ erro: 'Nome e id_turma são obrigatórios' });
  }

  const atividade = await prisma.atividade.create({
    data: { nome, disciplina, descricao, imagem, id_professor, id_turma },
  });

  return res.status(201).json(atividade);
}

export async function listarAtividades(req: Request, res: Response) {
  const id_professor = req.professor!.id;

  const atividades = await prisma.atividade.findMany({
    where: { id_professor },
    orderBy: { id_atividade: 'desc' },
  });

  return res.json(atividades);
}

export async function buscarAtividade(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id);

  const atividade = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
    include: {
      turma: true,
      questao: {
        orderBy: { numero: 'asc' },
        include: { alternativa: true },
      },
      correcao: { select: { nota: true, status: true } },
    },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const correcoes = atividade.correcao ?? [];
  const soma = correcoes.reduce((total, c) => total + Number(c.nota ?? 0), 0);

  return res.json({
    ...atividade,
    questao: atividade.questao.map((q) => ({ ...q, peso: Number(q.peso ?? 1) })),
    turma: atividade.turma
      ? { id_turma: atividade.turma.id_turma, nome: atividade.turma.nome }
      : null,
    correcao: undefined,
    resumo: {
      folhas: correcoes.length,
      revisadas: correcoes.filter((c) => c.status === 'concluida').length,
      media: correcoes.length ? Number((soma / correcoes.length).toFixed(2)) : 0,
      peso_total: Number(
        atividade.questao.reduce((total, q) => total + Number(q.peso ?? 0), 0).toFixed(2)
      ),
    },
  });
}

export async function atualizarAtividade(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id);
  const { nome, disciplina, descricao, imagem, id_turma } = req.body;

  const atividadeExiste = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
  });

  if (!atividadeExiste) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const atividade = await prisma.atividade.update({
    where: { id_atividade },
    data: { nome, disciplina, descricao, imagem, id_turma },
  });

  return res.json(atividade);
}

export async function excluirAtividade(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id);

  const atividadeExiste = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
    include: { correcao: { select: { id_correcao: true } } },
  });

  if (!atividadeExiste) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const folhas = atividadeExiste.correcao.length;

  if (folhas > 0) {
    return res.status(409).json({
      erro: `Esta atividade tem ${folhas} ${folhas === 1 ? 'folha corrigida' : 'folhas corrigidas'}.`,
      detalhe:
        'Apagar levaria as notas dos alunos junto. Apague as correções antes, ' +
        'se for isso mesmo.',
    });
  }

  await prisma.atividade.delete({ where: { id_atividade } });

  return res.status(204).send();
}
// ---------------------------------------------------------------------------
// Apagar correções
//
// `resposta` aponta para `correcao` com onDelete: NoAction, ou seja, o banco
// proíbe apagar uma correção enquanto existir resposta pendurada nela. Então
// as respostas saem primeiro, e tudo dentro de uma transação: ou o conjunto
// inteiro some, ou nada some. Sem isso, uma falha no meio deixaria respostas
// órfãs apontando para uma correção que não existe mais.
// ---------------------------------------------------------------------------

/** Só devolve a correção se ela for de uma atividade deste professor. */
async function correcaoDoProfessor(id_correcao: number, id_professor: number) {
  return prisma.correcao.findFirst({
    where: { id_correcao, atividade: { id_professor } },
    include: { aluno: true },
  });
}

export async function excluirCorrecao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_correcao = Number(req.params.id);

  if (!id_correcao) {
    return res.status(400).json({ erro: 'Informe a correção a apagar.' });
  }

  const correcao = await correcaoDoProfessor(id_correcao, id_professor);

  if (!correcao) {
    return res.status(404).json({ erro: 'Correção não encontrada' });
  }

  await prisma.$transaction([
    prisma.resposta.deleteMany({ where: { id_correcao } }),
    prisma.correcao.delete({ where: { id_correcao } }),
  ]);

  return res.json({
    apagadas: 1,
    aluno: correcao.aluno?.nome ?? null,
  });
}

export async function excluirCorrecoesDaAtividade(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id_atividade);

  if (!id_atividade) {
    return res.status(400).json({ erro: 'Informe a atividade.' });
  }

  const atividade = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const ids = (
    await prisma.correcao.findMany({
      where: { id_atividade },
      select: { id_correcao: true },
    })
  ).map((c) => c.id_correcao);

  if (ids.length === 0) {
    return res.json({ apagadas: 0 });
  }

  await prisma.$transaction([
    prisma.resposta.deleteMany({ where: { id_correcao: { in: ids } } }),
    prisma.correcao.deleteMany({ where: { id_correcao: { in: ids } } }),
  ]);

  return res.json({ apagadas: ids.length });
}