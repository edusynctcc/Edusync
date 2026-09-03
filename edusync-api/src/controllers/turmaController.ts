import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function criarTurma(req: Request, res: Response) {
  const { nome, escola } = req.body;
  const id_professor = req.professor!.id;

  if (!nome) {
    return res.status(400).json({ erro: 'O nome da turma é obrigatório' });
  }

  const turma = await prisma.turma.create({
    data: { nome, escola, id_professor },
  });

  return res.status(201).json(turma);
}

export async function listarTurmas(req: Request, res: Response) {
  const id_professor = req.professor!.id;

  const turmas = await prisma.turma.findMany({
    where: { id_professor },
    orderBy: { id_turma: 'desc' },
  });

  return res.json(turmas);
}

export async function buscarTurma(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.params.id);

  const turma = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
    include: { aluno: true },
  });

  if (!turma) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  return res.json(turma);
}

export async function atualizarTurma(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.params.id);
  const { nome, escola } = req.body;

  const turmaExiste = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
  });

  if (!turmaExiste) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  const turma = await prisma.turma.update({
    where: { id_turma },
    data: { nome, escola },
  });

  return res.json(turma);
}

export async function excluirTurma(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.params.id);

  const turmaExiste = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
  });

  if (!turmaExiste) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  await prisma.turma.delete({ where: { id_turma } });

  return res.status(204).send();
}