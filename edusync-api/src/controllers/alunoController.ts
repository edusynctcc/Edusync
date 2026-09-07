import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Função auxiliar: confere se a turma pertence ao professor logado
async function turmaPertenceAoProfessor(id_turma: number, id_professor: number) {
  const turma = await prisma.turma.findFirst({ where: { id_turma, id_professor } });
  return !!turma;
}

export async function criarAluno(req: Request, res: Response) {
  const { nome, matricula, numero_chamada, id_turma } = req.body;
  const id_professor = req.professor!.id;

  if (!nome || !matricula || !numero_chamada || !id_turma) {
    return res.status(400).json({ erro: 'Nome, matrícula, número de chamada e id_turma são obrigatórios' });
  }

  const podeAcessar = await turmaPertenceAoProfessor(id_turma, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  const matriculaExiste = await prisma.aluno.findUnique({ where: { matricula } });
  if (matriculaExiste) {
    return res.status(400).json({ erro: 'Matrícula já cadastrada' });
  }

  const aluno = await prisma.aluno.create({
    data: { nome, matricula, numero_chamada, id_turma },
  });

  return res.status(201).json(aluno);
}

// Lista os alunos de uma turma específica (via query ?id_turma=)
export async function listarAlunos(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.query.id_turma);

  if (!id_turma) {
    return res.status(400).json({ erro: 'Informe o id_turma na query (?id_turma=)' });
  }

  const podeAcessar = await turmaPertenceAoProfessor(id_turma, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  const alunos = await prisma.aluno.findMany({
    where: { id_turma },
    orderBy: { numero_chamada: 'asc' },
  });

  return res.json(alunos);
}

export async function buscarAluno(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_aluno = Number(req.params.id);

  const aluno = await prisma.aluno.findUnique({
    where: { id_aluno },
    include: { turma: true },
  });

  if (!aluno || aluno.turma.id_professor !== id_professor) {
    return res.status(404).json({ erro: 'Aluno não encontrado' });
  }

  return res.json(aluno);
}

export async function atualizarAluno(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_aluno = Number(req.params.id);
  const { nome, matricula, numero_chamada } = req.body;

  const alunoExiste = await prisma.aluno.findUnique({
    where: { id_aluno },
    include: { turma: true },
  });

  if (!alunoExiste || alunoExiste.turma.id_professor !== id_professor) {
    return res.status(404).json({ erro: 'Aluno não encontrado' });
  }

  const aluno = await prisma.aluno.update({
    where: { id_aluno },
    data: { nome, matricula, numero_chamada },
  });

  return res.json(aluno);
}

export async function excluirAluno(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_aluno = Number(req.params.id);

  const alunoExiste = await prisma.aluno.findUnique({
    where: { id_aluno },
    include: { turma: true },
  });

  if (!alunoExiste || alunoExiste.turma.id_professor !== id_professor) {
    return res.status(404).json({ erro: 'Aluno não encontrado' });
  }

  await prisma.aluno.delete({ where: { id_aluno } });

  return res.status(204).send();
}