import { Request, Response } from 'express';
import { lerAtividadeDeArquivo } from '../services/atividadeArquivoService';

type ArquivoEnviado = { buffer: Buffer; mimetype: string; originalname?: string };

// ===========================================================================
// IMPORTAR UMA ATIVIDADE PRONTA
//
// POST /importacao/atividade   recebe o arquivo, devolve as questões. NÃO GRAVA.
//
// Não há um segundo tempo com rota própria como na lista de chamada, porque
// ele já existe: a tela de criar atividade. O que volta daqui cai nos campos
// que o professor já conhece, ele define os critérios e salva pelo caminho de
// sempre. Uma rota de "confirmar importação" seria um segundo jeito de criar
// atividade, com as mesmas validações escritas de novo em outro lugar.
//
// Nenhuma turma é tocada e nada é escrito: o único dado que entra é o arquivo,
// e o único que sai é texto para a tela preencher. Por isso esta rota não
// precisa checar dono de turma — só exige professor autenticado.
// ===========================================================================
export async function importarAtividadeDeArquivo(req: Request, res: Response) {
  const arquivo = (req as any).file as ArquivoEnviado | undefined;

  if (!arquivo) {
    return res.status(400).json({
      erro: 'Envie a atividade no campo "arquivo" (PDF, .docx ou foto).',
    });
  }

  try {
    const lida = await lerAtividadeDeArquivo(
      arquivo.buffer,
      arquivo.mimetype,
      arquivo.originalname || ''
    );

    console.log(
      `[atividade] "${arquivo.originalname}" -> ${lida.questoes.length} questões`
    );

    return res.json(lida);
  } catch (e: any) {
    console.error('[atividade] falhou ao importar:', e.message);

    // 502 e não 500: quem falhou foi o serviço de fora, ou o arquivo que
    // chegou. O servidor está de pé. A tela mostra o `detalhe`, que é onde
    // está a frase útil ("mande em PDF", "o texto está ilegível").
    return res.status(502).json({
      erro: 'Não consegui ler essa atividade.',
      detalhe: e.message,
    });
  }
}