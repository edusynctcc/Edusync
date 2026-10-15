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
      telefone: true,
      endereco: true,
      notif_correcao: true,
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

  // Taxa de correção = % das folhas enviadas que já foram corrigidas.
  // Sem nenhuma folha enviada ainda, devolve null (a tela mostra "—").
  const totalCorrecoes = await prisma.correcao.count({
    where: { atividade: { id_professor } },
  });
  const corrigidas = await prisma.correcao.count({
    where: { atividade: { id_professor }, status: 'corrigida' },
  });
  const taxa_correcao =
    totalCorrecoes > 0 ? Math.round((corrigidas / totalCorrecoes) * 100) : null;

  return res.json({
    id_professor: professor.id_professor,
    nome: professor.nome,
    email: professor.email,
    telefone: professor.telefone,
    endereco: professor.endereco,
    notif_correcao: professor.notif_correcao,
    total_turmas: professor._count.turma,
    total_atividades: professor._count.atividade,
    total_alunos: totalAlunos,
    taxa_correcao,
  });
}

export async function atualizarPerfil(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const { nome, email, telefone, endereco } = req.body;

  if (!nome || !email) {
    return res.status(400).json({ erro: 'Nome e e-mail são obrigatórios' });
  }

  const emailEmUso = await prisma.professor.findFirst({
    where: { email, NOT: { id_professor } },
  });
  if (emailEmUso) {
    return res.status(400).json({ erro: 'E-mail já cadastrado' });
  }

  const professor = await prisma.professor.update({
    where: { id_professor },
    data: { nome, email, telefone: telefone || null, endereco: endereco || null },
    select: { id_professor: true, nome: true, email: true, telefone: true, endereco: true },
  });

  return res.json(professor);
}

export async function alterarSenha(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ erro: 'Senha atual e nova senha são obrigatórias' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
  }

  const professor = await prisma.professor.findUnique({ where: { id_professor } });
  if (!professor) {
    return res.status(404).json({ erro: 'Professor não encontrado' });
  }

  const senhaValida = await bcrypt.compare(senha_atual, professor.senha);
  if (!senhaValida) {
    return res.status(401).json({ erro: 'Senha atual incorreta' });
  }

  const senhaHash = await bcrypt.hash(nova_senha, 10);
  await prisma.professor.update({
    where: { id_professor },
    data: { senha: senhaHash },
  });

  return res.json({ mensagem: 'Senha alterada com sucesso' });
}

export async function atualizarNotificacoes(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const { notif_correcao } = req.body;

  if (typeof notif_correcao !== 'boolean') {
    return res.status(400).json({ erro: 'notif_correcao deve ser verdadeiro ou falso' });
  }

  const professor = await prisma.professor.update({
    where: { id_professor },
    data: { notif_correcao },
    select: { notif_correcao: true },
  });

  return res.json(professor);
}