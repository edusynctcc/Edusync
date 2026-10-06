import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { lerChamada, AlunoLido } from "../services/chamadaService";
import { jaEstaNaTurma, normalizar } from "../services/alunoService";

const prisma = new PrismaClient();

type ArquivoEnviado = { buffer: Buffer; mimetype: string; originalname?: string };

async function turmaPertenceAoProfessor(
  id_turma: number,
  id_professor: number,
) {
  const turma = await prisma.turma.findFirst({
    where: { id_turma, id_professor },
  });
  return !!turma;
}

export async function criarAluno(req: Request, res: Response) {
  const { nome, matricula, numero_chamada, id_turma } = req.body;
  const id_professor = req.professor!.id;

  if (!nome || !matricula || !numero_chamada || !id_turma) {
    return res.status(400).json({
      erro: "Nome, matrícula, número de chamada e id_turma são obrigatórios",
    });
  }

  const podeAcessar = await turmaPertenceAoProfessor(id_turma, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: "Turma não encontrada" });
  }

  const matriculaExiste = await prisma.aluno.findUnique({
    where: { matricula },
  });
  if (matriculaExiste) {
    return res.status(400).json({ erro: "Matrícula já cadastrada" });
  }

  const aluno = await prisma.aluno.create({
    data: { nome, matricula, numero_chamada, id_turma },
  });

  return res.status(201).json(aluno);
}

export async function listarAlunos(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.query.id_turma);

  if (!id_turma) {
    return res
      .status(400)
      .json({ erro: "Informe o id_turma na query (?id_turma=)" });
  }

  const podeAcessar = await turmaPertenceAoProfessor(id_turma, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: "Turma não encontrada" });
  }

  const alunos = await prisma.aluno.findMany({
    where: { id_turma },
    orderBy: { numero_chamada: "asc" },
  });

  return res.json(alunos);
}

export async function buscarAluno(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_aluno = Number(req.params.id);

  const aluno = await prisma.aluno.findUnique({
    where: { id_aluno },
    include: { turma: true },
  });

  if (!aluno || aluno.turma.id_professor !== id_professor) {
    return res.status(404).json({ erro: "Aluno não encontrado" });
  }

  return res.json(aluno);
}

export async function atualizarAluno(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_aluno = Number(req.params.id);
  const { nome, matricula, numero_chamada } = req.body;

  const alunoExiste = await prisma.aluno.findUnique({
    where: { id_aluno },
    include: { turma: true },
  });

  if (!alunoExiste || alunoExiste.turma.id_professor !== id_professor) {
    return res.status(404).json({ erro: "Aluno não encontrado" });
  }

  const aluno = await prisma.aluno.update({
    where: { id_aluno },
    data: { nome, matricula, numero_chamada },
  });

  return res.json(aluno);
}

export async function excluirAluno(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_aluno = Number(req.params.id);

  const alunoExiste = await prisma.aluno.findUnique({
    where: { id_aluno },
    include: { turma: true },
  });

  if (!alunoExiste || alunoExiste.turma.id_professor !== id_professor) {
    return res.status(404).json({ erro: "Aluno não encontrado" });
  }

  await prisma.aluno.delete({ where: { id_aluno } });

  return res.status(204).send();
}

// ===========================================================================
// IMPORTAR A LISTA DE CHAMADA
//
// Acontece em dois tempos, pelo mesmo motivo da correção de folha:
//
//   POST /alunos/importar/ler   lê o arquivo e devolve quem encontrou,
//                               marcando quem já está na turma. NÃO GRAVA.
//   POST /alunos/importar       recebe a lista que o professor confirmou
//                               e grava.
//
// Gravar direto seria cadastrar lixo: lista de chamada de escola tem aluno
// transferido riscado, cabeçalho repetido a cada página, rodapé com total.
// A IA e o leitor de planilha filtram o que conseguem — o professor filtra o
// resto, que é a parte que só quem conhece a turma sabe.
// ===========================================================================

// A coluna matricula é VARCHAR(50) e tem índice único GLOBAL, não por turma.
// Base 36 encurta o tempo de 13 dígitos para 8; as seis letras de sorteio
// evitam colisão quando dois alunos entram no mesmo milissegundo.
function matriculaProvisoria() {
  const tempo = Date.now().toString(36);
  const sorteio = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return `M${tempo}${sorteio}`.slice(0, 50);
}

export async function lerListaDeChamada(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.body.id_turma);
  const arquivo = (req as any).file as ArquivoEnviado | undefined;

  if (!id_turma) {
    return res.status(400).json({ erro: "id_turma é obrigatório" });
  }

  if (!arquivo) {
    return res.status(400).json({
      erro: 'Envie a lista no campo "arquivo" (PDF, imagem, Excel ou CSV).',
    });
  }

  const podeAcessar = await turmaPertenceAoProfessor(id_turma, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: "Turma não encontrada" });
  }

  let lidos: AlunoLido[];

  try {
    lidos = await lerChamada(
      arquivo.buffer,
      arquivo.mimetype,
      arquivo.originalname || "",
    );
  } catch (e: any) {
    console.error("[chamada] falhou ao ler:", e.message);
    return res.status(502).json({
      erro: "Não consegui ler essa lista.",
      detalhe: e.message,
    });
  }

  if (lidos.length === 0) {
    return res.status(422).json({
      erro: "Não encontrei nenhum aluno nesse arquivo.",
      detalhe:
        "Confira se é mesmo a lista de chamada. Se for uma foto, tente uma " +
        "mais nítida ou exporte a lista em Excel.",
    });
  }

  const jaCadastrados = await prisma.aluno.findMany({
    where: { id_turma },
    select: { id_aluno: true, nome: true },
  });

  // Cada aluno lido vem com a resposta pronta de "este já está na turma?".
  // A conta é feita aqui, e não na tela, porque é a mesma regra que o gravar
  // vai aplicar — se a tela decidisse por conta própria, as duas poderiam
  // discordar.
  const alunos = lidos.map((aluno) => ({
    ...aluno,
    ja_existe: jaEstaNaTurma(aluno.nome, jaCadastrados),
  }));

  return res.json({
    id_turma,
    total_lidos: alunos.length,
    ja_na_turma: alunos.filter((a) => a.ja_existe).length,
    alunos,
  });
}

export async function importarAlunos(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_turma = Number(req.body.id_turma);
  const recebidos = req.body.alunos;

  if (!id_turma) {
    return res.status(400).json({ erro: "id_turma é obrigatório" });
  }

  if (!Array.isArray(recebidos) || recebidos.length === 0) {
    return res.status(400).json({ erro: "Nenhum aluno para importar." });
  }

  const podeAcessar = await turmaPertenceAoProfessor(id_turma, id_professor);
  if (!podeAcessar) {
    return res.status(404).json({ erro: "Turma não encontrada" });
  }

  const jaCadastrados = await prisma.aluno.findMany({
    where: { id_turma },
    select: { id_aluno: true, nome: true, numero_chamada: true },
  });

  // Os números já ocupados nesta turma. A lista do arquivo costuma trazer o
  // número de chamada, e ele é melhor que um sequencial inventado — mas só
  // vale se estiver livre.
  const numerosUsados = new Set(jaCadastrados.map((a) => a.numero_chamada));
  let proximoLivre =
    jaCadastrados.reduce((maior, a) => Math.max(maior, a.numero_chamada || 0), 0) + 1;

  function numeroDisponivel(preferido: number | null) {
    if (preferido && Number.isInteger(preferido) && !numerosUsados.has(preferido)) {
      numerosUsados.add(preferido);
      return preferido;
    }

    while (numerosUsados.has(proximoLivre)) proximoLivre++;
    numerosUsados.add(proximoLivre);
    return proximoLivre;
  }

  // Nomes que já estão na turma, mais os que forem entrando agora: sem isto,
  // um arquivo com o mesmo nome duas vezes cadastraria duas vezes.
  const nomesDaTurma = jaCadastrados.map((a) => ({
    id_aluno: a.id_aluno,
    nome: a.nome,
  }));

  const criados: any[] = [];
  const ignorados: { nome: string; motivo: string }[] = [];

  for (const bruto of recebidos) {
    const nome = String(bruto?.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 100);

    if (!nome) continue;

    if (jaEstaNaTurma(nome, nomesDaTurma)) {
      ignorados.push({ nome, motivo: "já está na turma" });
      continue;
    }

    const pedida = String(bruto?.matricula ?? "").trim().slice(0, 50);
    let matricula = pedida || matriculaProvisoria();

    // A matrícula é única no banco inteiro, não por turma. O RA do arquivo
    // pode já pertencer a um aluno de outra turma — e, nesse caso, insistir
    // nele derrubaria a importação toda. Entra uma provisória e o professor
    // é avisado no resumo.
    let matriculaTrocada = false;

    if (pedida) {
      const ocupada = await prisma.aluno.findUnique({ where: { matricula: pedida } });
      if (ocupada) {
        matricula = matriculaProvisoria();
        matriculaTrocada = true;
      }
    }

    try {
      const aluno = await prisma.aluno.create({
        data: {
          nome,
          matricula,
          numero_chamada: numeroDisponivel(
            Number.isInteger(bruto?.numero_chamada) ? bruto.numero_chamada : null,
          ),
          id_turma,
        },
      });

      criados.push(
        matriculaTrocada ? { ...aluno, matricula_trocada: true } : aluno,
      );

      // Entra na lista de comparação para o próximo do arquivo.
      nomesDaTurma.push({ id_aluno: aluno.id_aluno, nome: aluno.nome });
    } catch (e: any) {
      // Um aluno que falha não derruba os outros. Importar 28 de 30 e saber
      // quais dois faltaram é muito melhor do que não importar nada.
      console.error("[chamada] não gravou", nome, e.code, e.message);
      ignorados.push({
        nome,
        motivo: e.code === "P2002" ? "matrícula repetida" : "erro ao gravar",
      });
    }
  }

  return res.json({
    id_turma,
    criados: criados.length,
    ignorados,
    alunos: criados,
  });
}