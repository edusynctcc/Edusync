import { Request, Response } from 'express';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { caminhoEmDisco, caminhoPublico } from '../middlewares/uploadImagemQuestao';

const prisma = new PrismaClient();

type ArquivoEnviado = { filename: string; path: string };


async function questaoDoProfessor(id_questao: number, id_professor: number) {
  return prisma.questao.findFirst({
    where: { id_questao, atividade: { id_professor } },
  });
}

function apagarDoDisco(caminho: string | null | undefined) {
  const emDisco = caminhoEmDisco(caminho);
  if (!emDisco) return;

  try {
    fs.unlinkSync(emDisco);
  } catch (e: any) {
    if (e?.code !== 'ENOENT') {
      console.warn('[questao] não consegui apagar a imagem antiga:', e.message);
    }
  }
}

export async function anexarImagem(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_questao = Number(req.params.id);
  const arquivo = (req as any).file as ArquivoEnviado | undefined;

  if (!id_questao) {
    return res.status(400).json({ erro: 'Questão inválida.' });
  }

  if (!arquivo) {
    return res
      .status(400)
      .json({ erro: 'Envie a imagem no campo "imagem".' });
  }

  const questao = await questaoDoProfessor(id_questao, id_professor);

  if (!questao) {
    apagarDoDisco(caminhoPublico(arquivo.filename));
    return res.status(404).json({ erro: 'Questão não encontrada.' });
  }

  const novo = caminhoPublico(arquivo.filename);

  try {
    const atualizada = await prisma.questao.update({
      where: { id_questao },
      data: { imagem: novo },
    });

    if (questao.imagem && questao.imagem !== novo) {
      apagarDoDisco(questao.imagem);
    }

    return res.json({
      id_questao,
      imagem: atualizada.imagem,
    });
  } catch (e: any) {
    apagarDoDisco(novo);
    console.error('[questao] falhou ao salvar a imagem:', e.code, e.message);

    return res.status(500).json({
      erro: 'Não consegui salvar a imagem desta questão.',
      detalhe: `${e.code ? e.code + ': ' : ''}${e.message}`.slice(0, 300),
    });
  }
}

export async function removerImagem(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_questao = Number(req.params.id);

  if (!id_questao) {
    return res.status(400).json({ erro: 'Questão inválida.' });
  }

  const questao = await questaoDoProfessor(id_questao, id_professor);

  if (!questao) {
    return res.status(404).json({ erro: 'Questão não encontrada.' });
  }

  if (!questao.imagem) {
    return res.json({ id_questao, imagem: null });
  }

  try {
    await prisma.questao.update({
      where: { id_questao },
      data: { imagem: null },
    });

    apagarDoDisco(questao.imagem);

    return res.json({ id_questao, imagem: null });
  } catch (e: any) {
    console.error('[questao] falhou ao remover a imagem:', e.code, e.message);

    return res.status(500).json({
      erro: 'Não consegui remover a imagem desta questão.',
      detalhe: `${e.code ? e.code + ': ' : ''}${e.message}`.slice(0, 300),
    });
  }
}