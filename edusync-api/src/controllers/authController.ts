import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { enviarCodigo, gerarToken } from '../services/codigoService';
 
const prisma = new PrismaClient();
 
const TIPOS_VALIDOS = ['multipla_escolha', 'dissertativa', 'calculo'];
// Palavra(s) que o scanner grava em correcao.status quando a folha termina.
// Se for outra, é só trocar aqui.
const STATUS_CONCLUIDOS = ['corrigida'];
 
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
 
  // Manda o código de confirmação do e-mail
  const erroEnvio = await enviarCodigo(professor, 'cadastro');
 
  return res.status(201).json({
    id: professor.id_professor,
    nome: professor.nome,
    email: professor.email,
    precisa_verificar: true,
    aviso: erroEnvio,
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
 
  // E-mail ainda não confirmado: manda um código novo e pede a confirmação
  if (!professor.email_verificado) {
    await enviarCodigo(professor, 'cadastro');
    return res.status(403).json({
      erro: 'Confirme seu e-mail para entrar. Enviamos um código para você.',
      precisa_verificar: true,
      email: professor.email,
    });
  }
 
  // Verificação em duas etapas ligada: o token só sai depois do código
  if (professor.login_2fa) {
    const erroEnvio = await enviarCodigo(professor, 'login');
    if (erroEnvio) return res.status(429).json({ erro: erroEnvio });
    return res.json({ precisa_codigo: true, email: professor.email });
  }
 
  return res.json({
    token: gerarToken(professor),
    professor: { id: professor.id_professor, nome: professor.nome, email: professor.email },
  });
}
 
export async function me(req: Request, res: Response) {
  const id_professor = (req as any).professor.id;
 
  const professor = await prisma.professor.findUnique({
    where: { id_professor },
    select: {
      id_professor: true,
      nome: true,
      email: true,
      telefone: true,
      endereco: true,
      foto: true,
      notif_correcao: true,
      login_2fa: true,
      pref_peso_padrao: true,
      pref_tipo_padrao: true,
      pref_nota_minima: true,
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
    where: { atividade: { id_professor }, status: { in: STATUS_CONCLUIDOS } },
  });
  const taxa_correcao =
    totalCorrecoes > 0 ? Math.round((corrigidas / totalCorrecoes) * 100) : null;
 
  return res.json({
    id_professor: professor.id_professor,
    nome: professor.nome,
    email: professor.email,
    telefone: professor.telefone,
    endereco: professor.endereco,
    foto: professor.foto,
    notif_correcao: professor.notif_correcao,
    login_2fa: professor.login_2fa,
    pref_peso_padrao: professor.pref_peso_padrao,
    pref_tipo_padrao: professor.pref_tipo_padrao,
    pref_nota_minima: professor.pref_nota_minima,
    total_turmas: professor._count.turma,
    total_atividades: professor._count.atividade,
    total_alunos: totalAlunos,
    taxa_correcao,
  });
}
 
export async function atualizarPerfil(req: Request, res: Response) {
  const id_professor = (req as any).professor.id;
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
  const id_professor = (req as any).professor.id;
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
  const id_professor = (req as any).professor.id;
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
 
export async function atualizarFoto(req: Request, res: Response) {
  const id_professor = (req as any).professor.id;
  const { foto } = req.body;
 
  // foto = null remove a foto atual
  if (foto !== null && (typeof foto !== 'string' || !foto.startsWith('data:image/'))) {
    return res.status(400).json({ erro: 'Envie uma imagem válida' });
  }
  if (typeof foto === 'string' && foto.length > 1_500_000) {
    return res.status(400).json({ erro: 'Imagem muito grande' });
  }
 
  const professor = await prisma.professor.update({
    where: { id_professor },
    data: { foto },
    select: { foto: true },
  });
 
  return res.json(professor);
}
 
export async function atualizarPreferencias(req: Request, res: Response) {
  const id_professor = (req as any).professor.id;
  const peso = Number(req.body.pref_peso_padrao);
  const nota = Number(req.body.pref_nota_minima);
  const tipo = req.body.pref_tipo_padrao;
 
  if (!Number.isFinite(peso) || peso <= 0 || peso > 10) {
    return res.status(400).json({ erro: 'O peso padrão deve ser maior que 0 e no máximo 10' });
  }
  if (!Number.isFinite(nota) || nota < 0 || nota > 10) {
    return res.status(400).json({ erro: 'A nota mínima deve estar entre 0 e 10' });
  }
  if (!TIPOS_VALIDOS.includes(tipo)) {
    return res.status(400).json({ erro: 'Tipo de questão inválido' });
  }
 
  const professor = await prisma.professor.update({
    where: { id_professor },
    data: { pref_peso_padrao: peso, pref_tipo_padrao: tipo, pref_nota_minima: nota },
    select: { pref_peso_padrao: true, pref_tipo_padrao: true, pref_nota_minima: true },
  });
 
  return res.json(professor);
}
 
export async function listarAvisos(req: Request, res: Response) {
  const id_professor = (req as any).professor.id;
 
  const professor = await prisma.professor.findUnique({
    where: { id_professor },
    select: { notif_correcao: true },
  });
 
  const concluidas = await prisma.correcao.findMany({
    where: { atividade: { id_professor }, status: { in: STATUS_CONCLUIDOS } },
    orderBy: { id_correcao: 'desc' },
    select: {
      id_correcao: true,
      atividade: { select: { nome: true, turma: { select: { nome: true } } } },
    },
  });
 
  return res.json({
    id_professor,
    notif_correcao: professor?.notif_correcao ?? true,
    concluidas: concluidas.map((c) => ({
      id_correcao: c.id_correcao,
      atividade: c.atividade?.nome ?? null,
      turma: c.atividade?.turma?.nome ?? null,
    })),
  });
}