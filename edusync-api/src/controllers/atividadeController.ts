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
    include: { questao: true },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  return res.json(atividade);
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
  });

  if (!atividadeExiste) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  await prisma.atividade.delete({ where: { id_atividade } });

  return res.status(204).send();
}