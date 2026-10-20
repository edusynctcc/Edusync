import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { enviarCodigo, validarCodigo, limparCodigo, gerarToken, TipoCodigo } from '../services/codigoService';

const prisma = new PrismaClient();

const TIPOS: TipoCodigo[] = ['cadastro', 'login', 'senha'];

function dadosProfessor(p: { id_professor: number; nome: string; email: string }) {
  return { id: p.id_professor, nome: p.nome, email: p.email };
}

export async function verificarEmail(req: Request, res: Response) {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ erro: 'E-mail e código são obrigatórios' });
  }

  const professor = await prisma.professor.findUnique({ where: { email } });
  if (!professor) return res.status(400).json({ erro: 'Código inválido ou expirado. Peça um novo.' });

  const erro = await validarCodigo(professor, 'cadastro', codigo);
  if (erro) return res.status(400).json({ erro });

  await prisma.professor.update({ where: { id_professor: professor.id_professor }, data: { email_verificado: true } });
  await limparCodigo(professor.id_professor);

  return res.json({ token: gerarToken(professor), professor: dadosProfessor(professor) });
}

export async function loginCodigo(req: Request, res: Response) {
  const { email, codigo } = req.body;
  if (!email || !codigo) {
    return res.status(400).json({ erro: 'E-mail e código são obrigatórios' });
  }

  const professor = await prisma.professor.findUnique({ where: { email } });
  if (!professor) return res.status(400).json({ erro: 'Código inválido ou expirado. Peça um novo.' });

  const erro = await validarCodigo(professor, 'login', codigo);
  if (erro) return res.status(400).json({ erro });

  await limparCodigo(professor.id_professor);

  return res.json({ token: gerarToken(professor), professor: dadosProfessor(professor) });
}

export async function reenviarCodigo(req: Request, res: Response) {
  const { email, tipo } = req.body;
  if (!email || !TIPOS.includes(tipo)) {
    return res.status(400).json({ erro: 'Dados inválidos' });
  }

  const professor = await prisma.professor.findUnique({ where: { email } });
  if (professor) {
    const erro = await enviarCodigo(professor, tipo);
    if (erro) return res.status(429).json({ erro });
  }
  return res.json({ mensagem: 'Se o e-mail estiver cadastrado, enviamos um novo código.' });
}

export async function esqueciSenha(req: Request, res: Response) {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'Informe o e-mail' });

  const professor = await prisma.professor.findUnique({ where: { email } });
  if (professor) {
    const erro = await enviarCodigo(professor, 'senha');
    if (erro) return res.status(429).json({ erro });
  }
  return res.json({ mensagem: 'Se o e-mail estiver cadastrado, enviamos um código.' });
}

export async function redefinirSenha(req: Request, res: Response) {
  const { email, codigo, nova_senha } = req.body;
  if (!email || !codigo || !nova_senha) {
    return res.status(400).json({ erro: 'E-mail, código e nova senha são obrigatórios' });
  }
  if (String(nova_senha).length < 6) {
    return res.status(400).json({ erro: 'A nova senha deve ter pelo menos 6 caracteres' });
  }

  const professor = await prisma.professor.findUnique({ where: { email } });
  if (!professor) return res.status(400).json({ erro: 'Código inválido ou expirado. Peça um novo.' });

  const erro = await validarCodigo(professor, 'senha', codigo);
  if (erro) return res.status(400).json({ erro });

  const senhaHash = await bcrypt.hash(nova_senha, 10);
  await prisma.professor.update({
    where: { id_professor: professor.id_professor },
    data: { senha: senhaHash, email_verificado: true },
  });
  await limparCodigo(professor.id_professor);

  return res.json({ mensagem: 'Senha redefinida com sucesso' });
}

export async function atualizarSeguranca(req: Request, res: Response) {
  const id_professor = (req as any).professor.id;
  const { login_2fa } = req.body;

  if (typeof login_2fa !== 'boolean') {
    return res.status(400).json({ erro: 'login_2fa deve ser verdadeiro ou falso' });
  }

  const professor = await prisma.professor.update({
    where: { id_professor },
    data: { login_2fa },
    select: { login_2fa: true },
  });

  return res.json(professor);
}