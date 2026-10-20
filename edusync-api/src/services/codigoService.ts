import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { enviarEmail } from './emailService';
 
const prisma = new PrismaClient();
 
export type TipoCodigo = 'cadastro' | 'login' | 'senha';
 
const VALIDADE_MIN = 10;
const INTERVALO_REENVIO_S = 60;
const MAX_TENTATIVAS = 5;
 
const ASSUNTOS: Record<TipoCodigo, string> = {
  cadastro: 'Edusync - confirme seu e-mail',
  login: 'Edusync - código de acesso',
  senha: 'Edusync - redefinição de senha',
};
 
const MOTIVOS: Record<TipoCodigo, string> = {
  cadastro: 'confirmar o seu e-mail',
  login: 'entrar na sua conta',
  senha: 'redefinir a sua senha',
};
 
export function gerarToken(professor: { id_professor: number; email: string }) {
  return jwt.sign(
    { id: professor.id_professor, email: professor.email },
    process.env.JWT_SECRET as string,
    { expiresIn: '8h' }
  );
}
 
// Gera um código de 6 dígitos, guarda só o hash e manda por e-mail.
// Devolve uma mensagem de erro (string) ou null se deu certo.
export async function enviarCodigo(
  professor: { id_professor: number; nome: string; email: string; codigo_enviado_em: Date | null },
  tipo: TipoCodigo
): Promise<string | null> {
  if (professor.codigo_enviado_em) {
    const segundos = (Date.now() - professor.codigo_enviado_em.getTime()) / 1000;
    if (segundos < INTERVALO_REENVIO_S) {
      return 'Aguarde alguns segundos antes de pedir outro código.';
    }
  }
 
  const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const hash = await bcrypt.hash(codigo, 8);
 
  await prisma.professor.update({
    where: { id_professor: professor.id_professor },
    data: {
      codigo_hash: hash,
      codigo_tipo: tipo,
      codigo_expira: new Date(Date.now() + VALIDADE_MIN * 60 * 1000),
      codigo_tentativas: 0,
      codigo_enviado_em: new Date(),
    },
  });
 
  try {
    await enviarEmail(
      professor.email,
      ASSUNTOS[tipo],
      `Olá, ${professor.nome}!\n\nSeu código para ${MOTIVOS[tipo]} é: ${codigo}\n\n` +
        `Ele vale por ${VALIDADE_MIN} minutos. Se não foi você, ignore este e-mail.\n\nEquipe Edusync`
    );
  } catch (e) {
    console.error('Falha ao enviar e-mail:', e);
    return 'Não foi possível enviar o e-mail agora. Tente novamente.';
  }
  return null;
}
 
// Confere o código. Devolve uma mensagem de erro (string) ou null se está certo.
export async function validarCodigo(
  professor: {
    id_professor: number;
    codigo_hash: string | null;
    codigo_tipo: string | null;
    codigo_expira: Date | null;
    codigo_tentativas: number;
  },
  tipo: TipoCodigo,
  codigo: unknown
): Promise<string | null> {
  if (!professor.codigo_hash || professor.codigo_tipo !== tipo || !professor.codigo_expira) {
    return 'Código inválido ou expirado. Peça um novo.';
  }
  if (professor.codigo_expira.getTime() < Date.now()) {
    return 'Código expirado. Peça um novo.';
  }
  if (professor.codigo_tentativas >= MAX_TENTATIVAS) {
    return 'Muitas tentativas. Peça um novo código.';
  }
 
  const ok = await bcrypt.compare(String(codigo ?? '').trim(), professor.codigo_hash);
  if (!ok) {
    await prisma.professor.update({
      where: { id_professor: professor.id_professor },
      data: { codigo_tentativas: { increment: 1 } },
    });
    return 'Código incorreto.';
  }
  return null;
}
 
export async function limparCodigo(id_professor: number) {
  await prisma.professor.update({
    where: { id_professor },
    data: { codigo_hash: null, codigo_tipo: null, codigo_expira: null, codigo_tentativas: 0 },
  });
}