import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaClient } from '@prisma/client';
import { lerFolha, QuestaoGabarito } from '../services/geminiService';
import { calcularFolha, ResultadoCorrecao } from '../services/notaService';
import { LEITURA_DEMO } from '../services/demo';
import { acharAluno } from '../services/alunoService';

const prisma = new PrismaClient();

// O multer põe o arquivo em req.file, mas essa propriedade só existe no tipo
// do Express quando os tipos do multer são carregados no projeto inteiro.
// Declarar o formato aqui deixa o controller compilando sozinho.
type ArquivoEnviado = { buffer: Buffer; mimetype: string };

// ---------------------------------------------------------------------------
// A correção acontece em dois tempos.
//
//   POST /correcoes            a IA lê a folha, o servidor calcula as notas e
//                              guarda o resultado AQUI, sem gravar no banco
//   POST /correcoes/confirmar  o professor diz de quem é a folha e só então
//                              o resultado guardado vai pro banco
//
// Por que não fazer tudo de uma vez: o professor precisa confirmar o aluno
// antes da nota entrar no boletim. Se a gente gravasse primeiro e perguntasse
// depois, uma troca exigiria apagar o que já entrou. E se a gente pedisse a
// folha de novo na confirmação, seria uma segunda chamada de IA por folha —
// o dobro do custo e da espera, em cada uma das 30 provas da turma.
//
// Guardando aqui, a IA roda UMA vez e a nota nunca passa pelo celular: quem
// calculou e quem grava é o mesmo servidor. É o que sustenta a resposta para
// "como vocês garantem que a nota não foi adulterada?".
// ---------------------------------------------------------------------------
type LeituraPendente = {
  id_professor: number;
  id_atividade: number;
  resultado: ResultadoCorrecao;
  emDemo: boolean;
  criado_em: number;
};

const pendentes = new Map<string, LeituraPendente>();

// Meia hora é bem mais do que o professor leva para olhar uma tela e escolher
// um nome. Passou disso, é porque desistiu — e aí a memória se limpa sozinha.
const VALIDADE_MS = 30 * 60 * 1000;

function limparVencidos() {
  const agora = Date.now();
  for (const [chave, item] of pendentes) {
    if (agora - item.criado_em > VALIDADE_MS) pendentes.delete(chave);
  }
}

// ---------------------------------------------------------------------------
// Em modo demonstração o campo "resposta" recebia uma lista curta de palavras.
// Com a IA de verdade ele recebe a TRANSCRIÇÃO da folha — o que o aluno
// escreveu, inteiro. Se a coluna do banco for pequena, o Prisma lança exceção e
// o Express devolve um 500 sem mensagem nenhuma.
//
// O certo é a coluna ser TEXT (está no PASSOS.md). Este corte é o cinto de
// segurança: mesmo com a coluna pequena, a correção grava em vez de sumir.
// ---------------------------------------------------------------------------
const LIMITE_RESPOSTA = 1000;
const LIMITE_COMENTARIO = 400;

function cortar(texto: string, limite: number) {
  const limpo = String(texto ?? '');
  return limpo.length <= limite ? limpo : limpo.slice(0, limite - 1) + '…';
}

async function carregarAtividade(id_atividade: number, id_professor: number) {
  return prisma.atividade.findFirst({
    where: { id_atividade, id_professor },
    include: {
      turma: { include: { aluno: { orderBy: { numero_chamada: 'asc' } } } },
      questao: { orderBy: { numero: 'asc' }, include: { alternativa: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// 1º tempo — ler e calcular
// ---------------------------------------------------------------------------
export async function corrigirFolha(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_atividade = Number(req.body.id_atividade);
  // Pode ser JPG, PNG ou PDF — o campo se chama "imagem" por causa do app.
  const arquivo = (req as any).file as ArquivoEnviado | undefined;

  if (!id_atividade) {
    return res.status(400).json({ erro: 'id_atividade é obrigatório' });
  }

  if (!arquivo) {
    return res.status(400).json({ erro: 'Envie a foto ou o PDF da folha no campo "imagem"' });
  }

  const atividade = await carregarAtividade(id_atividade, id_professor);

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  if (atividade.questao.length === 0) {
    return res.status(400).json({ erro: 'Esta atividade ainda não tem questões cadastradas' });
  }

  const gabarito: QuestaoGabarito[] = atividade.questao.map((q) => ({
    numero: q.numero,
    pergunta: q.pergunta,
    tipo: q.tipo,
    resposta_correta: q.resposta_correta ?? '',
    peso: Number(q.peso ?? 1),
    alternativas: q.alternativa.map((a) => ({
      letra: a.letra ?? '',
      texto: a.texto ?? '',
    })),
  }));

  const emDemo = process.env.SCANNER_DEMO === '1';
  let resultado: ResultadoCorrecao;

  try {
    // MODO DEMO: com SCANNER_DEMO=1 no .env, devolve um resultado fixo sem
    // chamar a IA. Serve para apresentar sem internet e testar sem gastar cota.
    const leitura = emDemo
      ? LEITURA_DEMO(gabarito)
      : await lerFolha(arquivo.buffer.toString('base64'), arquivo.mimetype, gabarito);

    resultado = calcularFolha(gabarito, leitura);
  } catch (e: any) {
    console.error('[scanner] falhou:', e.message);
    return res.status(502).json({
      erro: 'Não foi possível corrigir esta folha agora.',
      detalhe: e.message,
    });
  }

  // De quem parece ser esta folha? É só um palpite para o professor conferir —
  // nada é gravado com base nele. Vem null quando o nome não bate com ninguém
  // ou bate com mais de um: melhor não sugerir do que sugerir errado.
  const alunos = atividade.turma.aluno;
  const id_sugerido = acharAluno(resultado.nome_aluno, alunos);
  const sugerido = id_sugerido ? alunos.find((a) => a.id_aluno === id_sugerido) : null;

  limparVencidos();
  const id_leitura = randomUUID();
  pendentes.set(id_leitura, {
    id_professor,
    id_atividade,
    resultado,
    emDemo,
    criado_em: Date.now(),
  });

  return res.json({
    id_leitura,
    id_atividade,
    modo: emDemo ? 'demo' : 'ia',
    salvo: false,
    sugestao: sugerido
      ? { id_aluno: sugerido.id_aluno, nome: sugerido.nome, numero_chamada: sugerido.numero_chamada }
      : null,
    alunos_da_turma: alunos.map((a) => ({
      id_aluno: a.id_aluno,
      nome: a.nome,
      numero_chamada: a.numero_chamada,
    })),
    ...resultado,
  });
}

// ---------------------------------------------------------------------------
// 2º tempo — o professor confirmou o aluno; agora grava
// ---------------------------------------------------------------------------
export async function confirmarCorrecao(req: Request, res: Response) {
  const id_professor = req.professor!.id;
  const id_leitura = String(req.body.id_leitura ?? '');
  const id_aluno = Number(req.body.id_aluno);

  if (!id_leitura || !id_aluno) {
    return res.status(400).json({ erro: 'id_leitura e id_aluno são obrigatórios' });
  }

  limparVencidos();
  const pendente = pendentes.get(id_leitura);

  if (!pendente) {
    return res.status(410).json({
      erro: 'Esta leitura expirou. Envie a folha de novo.',
    });
  }

  // A leitura é de quem a fez. Sem isso, um professor poderia gravar com o
  // id_leitura de outro se descobrisse o código.
  if (pendente.id_professor !== id_professor) {
    return res.status(403).json({ erro: 'Esta leitura não é sua.' });
  }

  const { id_atividade, resultado } = pendente;

  const atividade = await carregarAtividade(id_atividade, id_professor);

  if (!atividade) {
    return res.status(404).json({ erro: 'Atividade não encontrada' });
  }

  const aluno = atividade.turma.aluno.find((a) => a.id_aluno === id_aluno);

  if (!aluno) {
    return res.status(400).json({ erro: 'Esse aluno não é desta turma.' });
  }

  // -------------------------------------------------------------------------
  // O schema tem @@unique([id_atividade, id_aluno]). No Prisma, o campo do
  // where vem dos NOMES DOS CAMPOS unidos por underline — o `map:` do schema
  // só renomeia a constraint dentro do MySQL, não mexe aqui.
  //
  // Por isso é id_atividade_id_aluno, e não unico_por_aluno.
  //
  // O upsert faz reescanear a folha do mesmo aluno ATUALIZAR em vez de
  // duplicar. status "pendente" = a IA terminou, esperando a revisão do
  // professor; vira "concluida" quando ele fecha a correção na tela.
  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // Daqui para baixo é gravação no banco. Sem este try, qualquer reclamação do
  // Prisma (coluna pequena, chave estrangeira, tipo errado) vira um 500 sem
  // corpo — a tela mostra "Erro ao conectar com o servidor" e o motivo real
  // não chega a lugar nenhum. Foi exatamente isso que escondeu este bug.
  // -------------------------------------------------------------------------
  let correcao: any;

  try {
    correcao = await prisma.correcao.upsert({
      where: { id_atividade_id_aluno: { id_atividade, id_aluno } },
      create: {
        id_atividade,
        id_aluno,
        nota: resultado.nota_total,
        status: 'pendente',
        corrigido_em: new Date(),
      },
      update: {
        nota: resultado.nota_total,
        status: 'pendente',
        corrigido_em: new Date(),
      },
    });

    // Reescaneou: as respostas antigas saem antes de entrarem as novas, senão a
    // questão 1 apareceria duas vezes na tela de revisão.
    await prisma.resposta.deleteMany({ where: { id_correcao: correcao.id_correcao } });

    // Percorre as questões da atividade e busca a nota pelo NÚMERO, em vez de
    // confiar que as duas listas estão na mesma ordem.
    const respostas = atividade.questao.map((questao) => {
      const calculada = resultado.questoes.find((q) => q.numero === questao.numero);

      return {
        id_correcao: correcao.id_correcao,
        id_questao: questao.id_questao,
        resposta: cortar(calculada?.resposta_aluno ?? '', LIMITE_RESPOSTA),
        nota: calculada?.nota ?? 0,
        comentario: cortar(
          [calculada?.detalhe, calculada?.observacao].filter(Boolean).join(' · '),
          LIMITE_COMENTARIO
        ),
        // false porque foi a IA. Quando o professor mexer na nota pela tela de
        // revisão, vira true — e esse contador é o dado da sua monografia: em
        // quantas questões a IA acertou sem precisar de correção humana.
        ajustado_manualmente: false,
      };
    });

    await prisma.resposta.createMany({ data: respostas });
  } catch (e: any) {
    console.error('[correcao] falhou ao gravar:', e.code, e.message);

    // P2000 = "value too long for the column". O Prisma diz qual coluna.
    if (e.code === 'P2000') {
      const coluna = e.meta?.column_name || e.meta?.target || '(não informada)';
      return res.status(400).json({
        erro: 'Não consegui salvar esta correção.',
        detalhe:
          `A coluna "${coluna}" da tabela resposta é pequena demais para o que ` +
          'a IA leu. No schema.prisma, troque o tipo dela para @db.Text e rode ' +
          'npx prisma db push.',
      });
    }

    return res.status(500).json({
      erro: 'Não consegui salvar esta correção.',
      detalhe: `${e.code ? e.code + ': ' : ''}${e.message}`.slice(0, 300),
    });
  }

  // Gravou: a leitura não serve mais para nada.
  pendentes.delete(id_leitura);

  return res.json({
    id_atividade,
    id_correcao: correcao.id_correcao,
    modo: pendente.emDemo ? 'demo' : 'ia',
    salvo: true,
    aluno: { id_aluno: aluno.id_aluno, nome: aluno.nome },
    ...resultado,
  });
}