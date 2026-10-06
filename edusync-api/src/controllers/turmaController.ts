import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function criarTurma(req: Request, res: Response) {
  const { nome, escola } = req.body;
  const id_professor = req.professor!.id;

  if (!nome) {
    return res.status(400).json({ erro: 'O nome da turma é obrigatório' });
  }

  const turma = await prisma.turma.create({
    data: { nome, escola, id_professor },
  });

  // Turma recém-criada não tem ninguém dentro, mas devolve os campos mesmo
  // assim — a tela não precisa saber que este caso é diferente.
  return res.status(201).json({ ...turma, alunos: 0, atividades: 0 });
}

// ---------------------------------------------------------------------------
// A lista de turmas vem com quantos alunos e quantas atividades cada uma tem.
//
// O _count do Prisma faz isso em UMA consulta, com COUNT no banco. A
// alternativa seria trazer todos os alunos e todas as atividades de todas as
// turmas só para contar o tamanho das listas — o que fica lento assim que a
// professora tiver umas dez turmas cheias.
//
// Os nomes dentro do select são os das RELAÇÕES do schema (aluno, atividade),
// no singular, e não os das tabelas no plural.
// ---------------------------------------------------------------------------
export async function listarTurmas(req: Request, res: Response) {
  const id_professor = req.professor!.id;

  const turmas = await prisma.turma.findMany({
    where: { id_professor },
    orderBy: { id_turma: 'desc' },
    include: {
      _count: { select: { aluno: true, atividade: true } },
    },
  });

  return res.json(
    turmas.map(({ _count, ...turma }) => ({
      ...turma,
      alunos: _count.aluno,
      atividades: _count.atividade,
    }))
  );
}

export async function buscarTurma(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.params.id);

  const turma = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
    include: {
      aluno: { orderBy: { numero_chamada: 'asc' } },
      _count: { select: { aluno: true, atividade: true } },
    },
  });

  if (!turma) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  const { _count, ...dados } = turma;

  return res.json({
    ...dados,
    alunos: _count.aluno,
    atividades: _count.atividade,
  });
}

export async function atualizarTurma(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.params.id);
  const { nome, escola } = req.body;

  const turmaExiste = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
  });

  if (!turmaExiste) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  const turma = await prisma.turma.update({
    where: { id_turma },
    data: { nome, escola },
  });

  return res.json(turma);
}

export async function excluirTurma(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.params.id);

  const turmaExiste = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
    include: { _count: { select: { aluno: true, atividade: true } } },
  });

  if (!turmaExiste) {
    return res.status(404).json({ erro: 'Turma não encontrada' });
  }

  // Apagar uma turma com gente dentro levaria junto alunos, atividades e as
  // notas que já foram lançadas. O banco barraria pela chave estrangeira, mas
  // com um erro que não explica nada — esta mensagem explica.
  const { aluno, atividade } = turmaExiste._count;

  if (aluno > 0 || atividade > 0) {
    const partes: string[] = [];
    if (aluno > 0) partes.push(`${aluno} ${aluno === 1 ? 'aluno' : 'alunos'}`);
    if (atividade > 0) {
      partes.push(`${atividade} ${atividade === 1 ? 'atividade' : 'atividades'}`);
    }

    return res.status(409).json({
      erro: `Esta turma tem ${partes.join(' e ')}.`,
      detalhe:
        'Apagar a turma levaria junto tudo que está dentro dela, inclusive as ' +
        'notas já lançadas. Remova os alunos e as atividades antes, se for ' +
        'isso mesmo.',
    });
  }

  await prisma.turma.delete({ where: { id_turma } });

  return res.status(204).send();
}