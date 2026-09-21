import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Decimal do Prisma não é número: vira objeto. Se mandar direto no JSON, o app
// recebe { s: 1, e: 0, d: [ 3 ] } em vez de 3. Sempre passar por aqui.
function numero(valor: any) {
  return valor === null || valor === undefined ? 0 : Number(valor);
}

// A correção é do professor dono da atividade. Sem essa checagem, qualquer
// professor logado abriria a correção de qualquer outro trocando o id na URL.
async function carregarCorrecaoDoProfessor(id_correcao: number, id_professor: number) {
  return prisma.correcao.findFirst({
    where: { id_correcao, atividade: { id_professor } },
    include: {
      aluno: true,
      atividade: { include: { turma: true } },
      resposta: { include: { questao: true } },
    },
  });
}

// Soma as notas das questões. É sempre isto que manda na nota da correção —
// nunca um valor vindo do app.
async function recalcularNotaTotal(id_correcao: number) {
  const respostas = await prisma.resposta.findMany({
    where: { id_correcao },
    select: { nota: true },
  });

  const total = respostas.reduce((soma, r) => soma + numero(r.nota), 0);
  const arredondada = Number(total.toFixed(2));

  await prisma.correcao.update({
    where: { id_correcao },
    data: { nota: arredondada },
  });

  return arredondada;
}

function montarResposta(correcao: any) {
  // Ordena pelo número da questão. O banco devolve na ordem que quiser.
  const respostas = [...correcao.resposta].sort(
    (a: any, b: any) => (a.questao?.numero ?? 0) - (b.questao?.numero ?? 0)
  );

  const peso_total = respostas.reduce((soma: number, r: any) => soma + numero(r.questao?.peso), 0);

  return {
    id_correcao: correcao.id_correcao,
    nota: numero(correcao.nota),
    peso_total: Number(peso_total.toFixed(2)),
    status: correcao.status ?? 'pendente',
    observacao: correcao.observacao ?? '',
    corrigido_em: correcao.corrigido_em,
    aluno: correcao.aluno
      ? {
          id_aluno: correcao.aluno.id_aluno,
          nome: correcao.aluno.nome,
          numero_chamada: correcao.aluno.numero_chamada,
        }
      : null,
    atividade: correcao.atividade
      ? {
          id_atividade: correcao.atividade.id_atividade,
          nome: correcao.atividade.nome,
          disciplina: correcao.atividade.disciplina ?? '',
          turma: correcao.atividade.turma?.nome ?? '',
        }
      : null,
    ajustadas: respostas.filter((r: any) => r.ajustado_manualmente).length,
    respostas: respostas.map((r: any) => ({
      id_resposta: r.id_resposta,
      numero: r.questao?.numero ?? 0,
      pergunta: r.questao?.pergunta ?? '',
      tipo: r.questao?.tipo ?? 'dissertativa',
      peso: numero(r.questao?.peso),
      resposta_correta: r.questao?.resposta_correta ?? '',
      resposta: r.resposta ?? '',
      nota: numero(r.nota),
      comentario: r.comentario ?? '',
      ajustado_manualmente: !!r.ajustado_manualmente,
    })),
  };
}

// ---------------------------------------------------------------------------
// GET /correcoes  —  lista as correções do professor
//
//   ?limite=5           traz só as mais recentes (o Scanner usa isso)
//   ?id_atividade=3     só as de uma atividade
//
// Traz tudo numa consulta só, com os pesos das questões junto, para calcular
// o total sem uma ida ao banco por correção.
// ---------------------------------------------------------------------------
export async function listarCorrecoes(req: Request, res: Response) {
  const id_professor = req.professor!.id;

  const limite = Number(req.query.limite);
  const id_atividade = Number(req.query.id_atividade);

  const correcoes = await prisma.correcao.findMany({
    where: {
      atividade: {
        id_professor,
        ...(id_atividade ? { id_atividade } : {}),
      },
    },
    orderBy: { corrigido_em: 'desc' },
    ...(limite > 0 ? { take: limite } : {}),
    include: {
      aluno: true,
      atividade: {
        include: { turma: true, questao: { select: { peso: true } } },
      },
    },
  });

  return res.json(
    correcoes.map((c) => {
      const pesos = c.atividade?.questao ?? [];
      const peso_total = pesos.reduce((soma, q) => soma + numero(q.peso), 0);

      return {
        id_correcao: c.id_correcao,
        nota: numero(c.nota),
        peso_total: Number(peso_total.toFixed(2)),
        status: c.status ?? 'pendente',
        corrigido_em: c.corrigido_em,
        aluno: c.aluno
          ? {
              id_aluno: c.aluno.id_aluno,
              nome: c.aluno.nome,
              numero_chamada: c.aluno.numero_chamada,
            }
          : null,
        atividade: c.atividade
          ? {
              id_atividade: c.atividade.id_atividade,
              nome: c.atividade.nome,
              disciplina: c.atividade.disciplina ?? '',
              turma: c.atividade.turma?.nome ?? '',
            }
          : null,
      };
    })
  );
}

// ---------------------------------------------------------------------------
// GET /correcoes/:id  —  abre uma correção para revisão
// ---------------------------------------------------------------------------
export async function buscarCorrecao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_correcao = Number(req.params.id);

  if (!id_correcao) {
    return res.status(400).json({ erro: 'id_correcao inválido' });
  }

  const correcao = await carregarCorrecaoDoProfessor(id_correcao, id_professor);

  if (!correcao) {
    return res.status(404).json({ erro: 'Correção não encontrada' });
  }

  return res.json(montarResposta(correcao));
}

// ---------------------------------------------------------------------------
// PUT /correcoes/:id/respostas/:id_resposta  —  o professor muda uma nota
//
// Marca ajustado_manualmente = true. Esse campo é o dado da monografia: quantas
// questões a IA acertou sem precisar de correção humana.
// ---------------------------------------------------------------------------
export async function ajustarResposta(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_correcao = Number(req.params.id);
  const id_resposta = Number(req.params.id_resposta);
  const novaNota = Number(req.body.nota);

  if (!id_correcao || !id_resposta) {
    return res.status(400).json({ erro: 'Correção ou resposta inválida' });
  }

  if (!Number.isFinite(novaNota) || novaNota < 0) {
    return res.status(400).json({ erro: 'A nota precisa ser um número maior ou igual a zero' });
  }

  const correcao = await carregarCorrecaoDoProfessor(id_correcao, id_professor);

  if (!correcao) {
    return res.status(404).json({ erro: 'Correção não encontrada' });
  }

  if (correcao.status === 'concluida') {
    return res.status(409).json({ erro: 'Esta correção já foi concluída.' });
  }

  const resposta = correcao.resposta.find((r) => r.id_resposta === id_resposta);

  if (!resposta) {
    return res.status(404).json({ erro: 'Essa questão não é desta correção' });
  }

  const peso = numero(resposta.questao?.peso);

  if (novaNota > peso) {
    return res.status(400).json({
      erro: `A nota não pode passar do peso da questão (${peso.toFixed(2)})`,
    });
  }

  await prisma.resposta.update({
    where: { id_resposta },
    data: {
      nota: Number(novaNota.toFixed(2)),
      ajustado_manualmente: true,
      ...(req.body.comentario !== undefined ? { comentario: String(req.body.comentario) } : {}),
    },
  });

  const nota_total = await recalcularNotaTotal(id_correcao);

  return res.json({
    id_resposta,
    nota: Number(novaNota.toFixed(2)),
    ajustado_manualmente: true,
    nota_total,
  });
}

// ---------------------------------------------------------------------------
// PUT /correcoes/:id/concluir  —  o professor fecha a revisão
// ---------------------------------------------------------------------------
export async function concluirCorrecao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_correcao = Number(req.params.id);
  // Permite reabrir: manda { reabrir: true } e volta para pendente.
  const reabrir = req.body.reabrir === true;

  if (!id_correcao) {
    return res.status(400).json({ erro: 'id_correcao inválido' });
  }

  const correcao = await carregarCorrecaoDoProfessor(id_correcao, id_professor);

  if (!correcao) {
    return res.status(404).json({ erro: 'Correção não encontrada' });
  }

  await prisma.correcao.update({
    where: { id_correcao },
    data: {
      status: reabrir ? 'pendente' : 'concluida',
      ...(req.body.observacao !== undefined ? { observacao: String(req.body.observacao) } : {}),
    },
  });

  const atualizada = await carregarCorrecaoDoProfessor(id_correcao, id_professor);

  return res.json(montarResposta(atualizada));
}

// ---------------------------------------------------------------------------
// PUT /correcoes/atividade/:id_atividade/concluir
//
// Fecha de uma vez todas as correções pendentes da atividade. É o botão
// "Concluir correção" da tela da atividade: com 30 alunos, mandar 30 chamadas
// do app seria lento e deixaria o estado pela metade se uma falhasse.
// ---------------------------------------------------------------------------
export async function concluirAtividade(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.params.id_atividade);
  const reabrir = req.body.reabrir === true;

  if (!id_atividade) {
    return res.status(400).json({ erro: 'id_atividade inválido' });
  }

  // A atividade tem que ser do professor logado.
  const atividade = await prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
  });

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const novoStatus = reabrir ? 'pendente' : 'concluida';

  const { count } = await prisma.correcao.updateMany({
    where: { id_atividade, status: { not: novoStatus } },
    data: { status: novoStatus },
  });

  return res.json({ id_atividade, status: novoStatus, alteradas: count });
}