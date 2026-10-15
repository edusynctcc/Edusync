import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// DESEMPENHO POR QUESTÃO
//
// GET /correcoes/atividade/:id_atividade/questoes
//
// Para cada questão da atividade, quantos alunos acertaram, quantos acertaram
// em parte e quantos erraram. É o que transforma o sistema de "corretor" em
// "o professor descobre o que a turma não aprendeu".
//
// A conta é feita AQUI e não na tela. Dava para o app buscar correção por
// correção e somar, mas numa turma de 30 isso vira 30 requisições para
// desenhar uma barra — e, pior, a regra de "o que conta como acerto" passaria
// a existir em dois lugares.
// ---------------------------------------------------------------------------

// Nota e peso vêm do banco como Decimal, e Decimal não fecha exato em ponto
// flutuante: uma questão de peso 2,00 corrigida com 2,00 pode voltar como
// 1,9999999. Sem a tolerância, o aluno que gabaritou apareceria como "acertou
// em parte" — um erro invisível que faz o professor desconfiar do número.
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

  // Só as folhas que já foram corrigidas. Uma correção que ainda não existe
  // não é um erro da turma — contar como zero afundaria a média de uma
  // questão por causa de quem faltou.
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
      // Quanto da pontuação possível a turma conquistou nesta questão, de 0 a
      // 1. É o número que ordena a lista: ele conta o acerto parcial, que
      // "quantos acertaram" sozinho jogaria fora.
      //
      // Numa dissertativa onde todo mundo acertou metade das palavras-chave,
      // "0 acertaram" assustaria à toa; aproveitamento 0,5 conta a verdade.
      aproveitamento:
        respondidas > 0 && peso > 0
          ? Number((somaDasNotas / (peso * respondidas)).toFixed(4))
          : null,
      // Em quantas a IA precisou de conserto. Numa questão onde o professor
      // mexeu em quase tudo, o problema pode ser o gabarito, não a turma.
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