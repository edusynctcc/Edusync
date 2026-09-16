import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function register(req: Request, res: Response) {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ erro: 'Nome, e-mail e senha são obrigatórios' });
  }

  const emailExiste = await prisma.professor.findUnique({ where: { email } });
  if (emailExiste) {
    return res.status(400).json({ erro: 'E-mail já cadastrado' });
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const professor = await prisma.professor.create({
    data: { nome, email, senha: senhaHash },
  });

  return res.status(201).json({
    id: professor.id_professor,
    nome: professor.nome,
    email: professor.email,
  });
}

export async function login(req: Request, res: Response) {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ erro: 'E-mail e senha são obrigatórios' });
  }

  const professor = await prisma.professor.findUnique({ where: { email } });
  if (!professor) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const senhaValida = await bcrypt.compare(senha, professor.senha);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }

  const token = jwt.sign(
    { id: professor.id_professor, email: professor.email },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h' }
  );

  return res.json({
    token,
    professor: { id: professor.id_professor, nome: professor.nome, email: professor.email },
  });
}

export async function me(req: Request, res: Response) {
  const id_professor = req.professor!.id;

  const professor = await prisma.professor.findUnique({
    where: { id_professor },
    select: {
      id_professor: true,
      nome: true,
      email: true,
      _count: {
        select: { turma: true, atividade: true },
      },
    },
  });

  if (!professor) {
    return res.status(404).json({ erro: 'Professor não encontrado' });
  }

  const totalAlunos = await prisma.aluno.count({
    where: { turma: { id_professor } },
  });

  return res.json({
    id_professor: professor.id_professor,
    nome: professor.nome,
    email: professor.email,
    total_turmas: professor._count.turma,
    total_atividades: professor._count.atividade,
    total_alunos: totalAlunos,
  });
}