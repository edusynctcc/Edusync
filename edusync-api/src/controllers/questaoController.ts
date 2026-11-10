import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function atividadePertenceAoProfessor(id_atividade: number, id_professor: number) {
  const atividade = await prisma.atividade.findFirst({ where: { id_atividade, id_professor } });
  return !!atividade;
}

export async function criarQuestao(req: Request, res: Response) {
  const { numero, pergunta, tipo, resposta_correta, peso, id_atividade } = req.body;
  const id_professor = req.professor!.id;

  if (!numero || !pergunta || !tipo || !id_atividade) {
    return res.status(400).json({ erro: 'Numero, pergunta, tipo e id_atividade são obrigatórios' });
  }

  const podeAcessar = await atividadePertenceAoProfessor(id_atividade, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const questao = await prisma.questao.create({
    data: { numero, pergunta, tipo, resposta_correta, peso, id_atividade },
  });

  return res.status(201).json(questao);
}

export async function listarQuestoes(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.query.id_atividade);

  if (!id_atividade) {
    return res.status(400).json({ erro: 'Informe o id_atividade na query (?id_atividade=)' });
  }

  const podeAcessar = await atividadePertenceAoProfessor(id_atividade, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const questoes = await prisma.questao.findMany({
    where: { id_atividade },
    orderBy: { numero: 'asc' },
    include: { alternativa: true },
  });

  return res.json(questoes);
}

export async function buscarQuestao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_questao = Number(req.params.id);

  const questao = await prisma.questao.findUnique({
    where: { id_questao },
    include: { atividade: true, alternativa: true },
  });

  if (!questao || !questao.atividade || questao.atividade.id_professor !== id_professor) {
    return res.status(404).json({ erro: 'Questão não encontrada' });
  }

  return res.json(questao);
}

export async function atualizarQuestao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_questao = Number(req.params.id);
  const { numero, pergunta, tipo, resposta_correta, peso } = req.body;

  const questaoExiste = await prisma.questao.findUnique({
    where: { id_questao },
    include: { atividade: true },
  });

  if (!questaoExiste || !questaoExiste.atividade || questaoExiste.atividade.id_professor !== id_professor) {
    return res.status(404).json({ erro: 'Questão não encontrada' });
  }

  const questao = await prisma.questao.update({
    where: { id_questao },
    data: { numero, pergunta, tipo, resposta_correta, peso },
  });

  return res.json(questao);
}

export async function excluirQuestao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_questao = Number(req.params.id);

  const questaoExiste = await prisma.questao.findUnique({
    where: { id_questao },
    include: { atividade: true },
  });

  if (!questaoExiste || !questaoExiste.atividade || questaoExiste.atividade.id_professor !== id_professor) {
    return res.status(404).json({ erro: 'Questão não encontrada' });
  }

  // Quantas respostas de aluno dependem desta questão.
  const respostas = await prisma.resposta.count({ where: { id_questao } });

  // Apagar a questão apaga junto as notas que os alunos já tiraram nela, e
  // isso muda a média da turma. Não pode acontecer por acidente: a exclusão
  // só passa com ?forcar=1 na URL, depois que a pessoa foi avisada.
  const forcar = req.query.forcar === '1' || req.query.forcar === 'true';
  if (respostas > 0 && !forcar) {
    return res.status(409).json({
      erro:
        respostas === 1
          ? 'Esta questão já tem 1 resposta corrigida. Excluir a questão apaga essa resposta e muda a nota do aluno.'
          : `Esta questão já tem ${respostas} respostas corrigidas. Excluir a questão apaga essas respostas e muda as notas dos alunos.`,
      respostas,
    });
  }

  // O banco proíbe deixar linhas apontando para uma questão que não existe
  // mais (é o `onDelete: NoAction` do schema), então os filhos saem primeiro.
  // Tudo dentro de uma transação: ou apaga o conjunto inteiro, ou não apaga
  // nada. Sem isso, uma falha no meio deixaria a questão sem alternativas.
  await prisma.$transaction([
    prisma.resposta.deleteMany({ where: { id_questao } }),
    prisma.alternativa.deleteMany({ where: { id_questao } }),
    prisma.questao.delete({ where: { id_questao } }),
  ]);

  return res.status(204).send();
}