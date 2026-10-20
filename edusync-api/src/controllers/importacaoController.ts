import { Request, Response } from 'express';
import { lerAtividadeDeArquivo } from '../services/atividadeArquivoService';

type ArquivoEnviado = { buffer: Buffer; mimetype: string; originalname?: string };

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

    return res.status(502).json({
      erro: 'Não consegui ler essa atividade.',
      detalhe: e.message,
    });
  }
}