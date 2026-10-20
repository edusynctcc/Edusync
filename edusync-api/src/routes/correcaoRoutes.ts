import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authMiddleware } from '../middlewares/authMiddleware';
import { corrigirFolha, confirmarCorrecao } from '../controllers/correcaoController';
import {
  listarCorrecoes,
  buscarCorrecao,
  ajustarResposta,
  concluirCorrecao,
  concluirAtividade,
} from '../controllers/revisaoController';
import { desempenhoPorQuestao } from '../controllers/estatisticaController';

const router = Router();

router.use(authMiddleware);

const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

const MAX_PAGINAS = 6;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: MAX_PAGINAS },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_ACEITOS.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Envie uma foto (JPG, PNG) ou um PDF da folha'));
  },
});

router.post('/', upload.array('imagem', MAX_PAGINAS), corrigirFolha);

router.post('/confirmar', confirmarCorrecao);


router.get('/', listarCorrecoes);

router.get('/atividade/:id_atividade/questoes', desempenhoPorQuestao);

router.put('/atividade/:id_atividade/concluir', concluirAtividade);

router.get('/:id', buscarCorrecao);

router.put('/:id/respostas/:id_resposta', ajustarResposta);

router.put('/:id/concluir', concluirCorrecao);

router.use((erro: any, _req: Request, res: Response, proximo: NextFunction) => {
  if (!erro) return proximo();

  if (erro instanceof multer.MulterError) {
    if (erro.code === 'LIMIT_FILE_SIZE') {
      return res
        .status(413)
        .json({ erro: 'Página muito grande. O limite é 8MB por página.' });
    }

    if (erro.code === 'LIMIT_FILE_COUNT' || erro.code === 'LIMIT_UNEXPECTED_FILE') {
      return res
        .status(413)
        .json({ erro: `São no máximo ${MAX_PAGINAS} páginas por folha.` });
    }
  }

  return res.status(400).json({ erro: erro.message || 'Não consegui receber o arquivo.' });
});

export default router;