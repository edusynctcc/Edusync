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
    include: {
      turma: true,
      questao: {
        orderBy: { numero: 'asc' },
        include: { alternativa: true },
      },
      correcao: { select: { nota: true, status: true } },
    },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const correcoes = atividade.correcao ?? [];
  const soma = correcoes.reduce((total, c) => total + Number(c.nota ?? 0), 0);

  return res.json({
    ...atividade,
    questao: atividade.questao.map((q) => ({ ...q, peso: Number(q.peso ?? 1) })),
    turma: atividade.turma
      ? { id_turma: atividade.turma.id_turma, nome: atividade.turma.nome }
      : null,
    correcao: undefined,
    resumo: {
      folhas: correcoes.length,
      revisadas: correcoes.filter((c) => c.status === 'concluida').length,
      media: correcoes.length ? Number((soma / correcoes.length).toFixed(2)) : 0,
      peso_total: Number(
        atividade.questao.reduce((total, q) => total + Number(q.peso ?? 0), 0).toFixed(2)
      ),
    },
  });
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

// ---------------------------------------------------------------------------
// Apagar a atividade
//
// No schema, `questao` e `correcao` apontam para `atividade` com
// onDelete: NoAction, e `resposta` aponta para as duas. O banco não deixa
// apagar um pai enquanto existir filho pendurado nele -- era exatamente isso
// que estourava em 500 aqui: `atividade.delete` sozinho, com as questões
// ainda no lugar.
//
// Então a ordem é de baixo para cima: respostas, correções, alternativas,
// questões e só então a atividade. E tudo dentro de uma transação: ou a
// atividade inteira some, ou nada some. Sem isso, uma falha no meio deixaria
// questões órfãs de uma atividade que não existe mais, e a listagem quebraria.
//
// Apagar leva as notas junto, de propósito. Quem confirma já leu no app que
// as folhas corrigidas vão junto -- não dá para guardar a nota de uma prova
// cujas questões não existem mais.
// ---------------------------------------------------------------------------
export async function excluirAtividade(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id);

  const atividade = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
    select: {
      nome: true,
      questao: { select: { id_questao: true } },
      correcao: { select: { id_correcao: true } },
    },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const idsQuestao = atividade.questao.map((q) => q.id_questao);
  const idsCorrecao = atividade.correcao.map((c) => c.id_correcao);

  // `deleteMany` com uma lista vazia não apaga nada e não dá erro, então não
  // precisa de `if` para o caso da atividade sem questões ou sem correções.
  await prisma.$transaction([
    prisma.resposta.deleteMany({ where: { id_correcao: { in: idsCorrecao } } }),
    prisma.resposta.deleteMany({ where: { id_questao: { in: idsQuestao } } }),
    prisma.correcao.deleteMany({ where: { id_atividade } }),
    prisma.alternativa.deleteMany({ where: { id_questao: { in: idsQuestao } } }),
    prisma.questao.deleteMany({ where: { id_atividade } }),
    prisma.atividade.delete({ where: { id_atividade } }),
  ]);

  console.log(
    `[ATIVIDADE] "${atividade.nome}" apagada: ` +
      `${idsQuestao.length} questões, ${idsCorrecao.length} correções`
  );

  return res.status(204).send();
}