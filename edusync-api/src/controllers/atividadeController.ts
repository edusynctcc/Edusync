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

// ---------------------------------------------------------------------------
// Traz a atividade com tudo que a tela de detalhe precisa, numa chamada só:
// a turma, as questões em ordem com as alternativas, e um resumo das
// correções já feitas.
//
// Poderia ser a tela pedindo quatro coisas em sequência, mas aí ela apareceria
// aos pedaços — primeiro o nome, depois as questões, depois a média.
// ---------------------------------------------------------------------------
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
    // Decimal do Prisma vira objeto no JSON; o peso sai como número para a
    // tela não precisar saber disso.
    questao: atividade.questao.map((q) => ({ ...q, peso: Number(q.peso ?? 1) })),
    turma: atividade.turma
      ? { id_turma: atividade.turma.id_turma, nome: atividade.turma.nome }
      : null,
    // as correções em si não interessam aqui, só o resumo delas
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

  // Apagar uma atividade corrigida levaria junto as notas dos alunos. O banco
  // já barraria pela chave estrangeira, mas o erro dele não explica nada —
  // esta mensagem explica.
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