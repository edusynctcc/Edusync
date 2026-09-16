import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

async function questaoPertenceAoProfessor(
  id_questao: number,
  id_professor: number,
) {
  const questao = await prisma.questao.findUnique({
    where: { id_questao },
    include: { atividade: true },
  });
  return (
    !!questao &&
    !!questao.atividade &&
    questao.atividade.id_professor === id_professor
  );
}

export async function criarAlternativa(req: Request, res: Response) {
  const { letra, texto, id_questao } = req.body;
  const id_professor = req.professor!.id;

  if (!letra || !texto || !id_questao) {
    return res
      .status(400)
      .json({ erro: "Letra, texto e id_questao são obrigatórios" });
  }

  const podeAcessar = await questaoPertenceAoProfessor(
    id_questao,
    id_professor,
  );
  if (!podeAcessar) {
    return res.status(404).json({ erro: "Questão não encontrada" });
  }

  const alternativa = await prisma.alternativa.create({
    data: { letra, texto, id_questao },
  });

  return res.status(201).json(alternativa);
}

export async function listarAlternativas(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_questao = Number(req.query.id_questao);

  if (!id_questao) {
    return res
      .status(400)
      .json({ erro: "Informe o id_questao na query (?id_questao=)" });
  }

  const podeAcessar = await questaoPertenceAoProfessor(
    id_questao,
    id_professor,
  );
  if (!podeAcessar) {
    return res.status(404).json({ erro: "Questão não encontrada" });
  }

  const alternativas = await prisma.alternativa.findMany({
    where: { id_questao },
    orderBy: { letra: "asc" },
  });

  return res.json(alternativas);
}

export async function buscarAlternativa(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_alternativa = Number(req.params.id);

  const alternativa = await prisma.alternativa.findUnique({
    where: { id_alternativa },
    include: { questao: { include: { atividade: true } } },
  });

  if (
    !alternativa ||
    !alternativa.questao ||
    !alternativa.questao.atividade ||
    alternativa.questao.atividade.id_professor !== id_professor
  ) {
    return res.status(404).json({ erro: "Alternativa não encontrada" });
  }

  return res.json(alternativa);
}

export async function atualizarAlternativa(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_alternativa = Number(req.params.id);
  const { letra, texto } = req.body;

  const alternativaExiste = await prisma.alternativa.findUnique({
    where: { id_alternativa },
    include: { questao: { include: { atividade: true } } },
  });

  if (
    !alternativaExiste ||
    !alternativaExiste.questao ||
    !alternativaExiste.questao.atividade ||
    alternativaExiste.questao.atividade.id_professor !== id_professor
  ) {
    return res.status(404).json({ erro: "Alternativa não encontrada" });
  }

  const alternativa = await prisma.alternativa.update({
    where: { id_alternativa },
    data: { letra, texto },
  });

  return res.json(alternativa);
}

export async function excluirAlternativa(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_alternativa = Number(req.params.id);

  const alternativaExiste = await prisma.alternativa.findUnique({
    where: { id_alternativa },
    include: { questao: { include: { atividade: true } } },
  });

  if (
    !alternativaExiste ||
    !alternativaExiste.questao ||
    !alternativaExiste.questao.atividade ||
    alternativaExiste.questao.atividade.id_professor !== id_professor
  ) {
    return res.status(404).json({ erro: "Alternativa não encontrada" });
  }

  await prisma.alternativa.delete({ where: { id_alternativa } });

  return res.status(204).send();
}
