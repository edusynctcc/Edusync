import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


const TOLERANCIA = 0.001;

export async function desempenhoPorQuestao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id_atividade);

  if (!id_atividade) {
    return res.status(400).json({ erro: 'id_atividade inválido' });
  }

  const atividade = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
    include: { questao: { orderBy: { numero: 'asc' } } },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const correcoes = await prisma.correcao.findMany({
    where: { id_atividade },
    select: { id_correcao: true },
  });

  const respostas = correcoes.length
    ? await prisma.resposta.findMany({
        where: { id_correcao: { in: correcoes.map((c) => c.id_correcao) } },
        select: { id_questao: true, nota: true, ajustado_manualmente: true },
      })
    : [];

  const porQuestao = new Map<number, typeof respostas>();
  respostas.forEach((r) => {
    if (r.id_questao == null) return;
    const lista = porQuestao.get(r.id_questao) || [];
    lista.push(r);
    porQuestao.set(r.id_questao, lista);
  });

  const questoes = atividade.questao.map((q) => {
    const peso = Number(q.peso ?? 1);
    const minhas = porQuestao.get(q.id_questao) || [];

    let acertos = 0;
    let parciais = 0;
    let erros = 0;
    let somaDasNotas = 0;
    let ajustadas = 0;

    minhas.forEach((r) => {
      const nota = Number(r.nota ?? 0);
      somaDasNotas += nota;
      if (r.ajustado_manualmente) ajustadas += 1;

      if (peso > 0 && nota >= peso - TOLERANCIA) acertos += 1;
      else if (nota > TOLERANCIA) parciais += 1;
      else erros += 1;
    });

    const respondidas = minhas.length;

    return {
      id_questao: q.id_questao,
      numero: q.numero,
      pergunta: q.pergunta,
      tipo: q.tipo,
      peso,
      respondidas,
      acertos,
      parciais,
      erros,
      aproveitamento:
        respondidas > 0 && peso > 0
          ? Number((somaDasNotas / (peso * respondidas)).toFixed(4))
          : null,
      ajustadas,
    };
  });

  return res.json({
    id_atividade,
    atividade: atividade.nome,
    folhas_corrigidas: correcoes.length,
    questoes,
  });
}