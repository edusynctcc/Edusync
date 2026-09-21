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

const router = Router();

router.use(authMiddleware);

// O campo continua se chamando "imagem" porque é assim que o app manda, mas
// aceita PDF também — o Gemini lê os dois.
const TIPOS_ACEITOS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

// memoryStorage: o arquivo fica na RAM e vira base64 direto. Não escreve nada
// em disco, então não sobra arquivo para limpar depois.
const upload = multer({
  storage: multer.memoryStorage(),
  // O Gemini aceita até 50MB, mas uma folha de prova não passa de uns poucos.
  // 15MB dá folga para um PDF escaneado sem deixar a RAM refém de um upload
  // gigante por engano.
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (TIPOS_ACEITOS.includes(file.mimetype)) return cb(null, true);
    cb(new Error('Envie uma foto (JPG, PNG) ou um PDF da folha'));
  },
});

// POST /correcoes  —  multipart/form-data
//   imagem        (arquivo)  a foto ou o PDF da folha
//   id_atividade  (texto)    qual atividade essa folha responde
//   id_aluno      (texto)    opcional, quando o professor já disse de quem é
router.post('/', upload.single('imagem'), corrigirFolha);

// POST /correcoes/confirmar  —  JSON
//   id_leitura  (texto)  o código devolvido pelo POST /correcoes
//   id_aluno    (número) de quem é a folha, confirmado pelo professor
router.post('/confirmar', confirmarCorrecao);

// ---------------------------------------------------------------------------
// Revisão — depois que a correção já está no banco
// ---------------------------------------------------------------------------

// GET /correcoes  —  lista as correções do professor
//   ?limite=5        só as mais recentes
//   ?id_atividade=3  só as de uma atividade
router.get('/', listarCorrecoes);

// PUT /correcoes/atividade/:id_atividade/concluir  —  fecha a atividade toda
//   reabrir (bool, opcional)  true devolve tudo para "pendente"
//
// Vem antes de /:id porque tem três segmentos; se viesse depois, o Express
// ainda acertaria, mas deixar as rotas específicas acima das genéricas evita
// surpresa quando alguém acrescentar outra.
router.put('/atividade/:id_atividade/concluir', concluirAtividade);

// GET /correcoes/:id  —  abre uma correção para revisar
router.get('/:id', buscarCorrecao);

// PUT /correcoes/:id/respostas/:id_resposta  —  muda a nota de uma questão
//   nota  (número)  a nota nova, de 0 até o peso da questão
router.put('/:id/respostas/:id_resposta', ajustarResposta);

// PUT /correcoes/:id/concluir  —  fecha a revisão
//   observacao (texto, opcional)   recado do professor
//   reabrir    (bool, opcional)    true volta para "pendente"
router.put('/:id/concluir', concluirCorrecao);

// Quando o multer recusa o arquivo (tipo errado, grande demais), ele lança. Sem
// isto o professor receberia uma página de erro HTML de 500, que o app não
// consegue ler. Aqui vira um JSON com o motivo em português.
router.use((erro: any, _req: Request, res: Response, proximo: NextFunction) => {
  if (!erro) return proximo();

  if (erro instanceof multer.MulterError && erro.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ erro: 'Arquivo muito grande. O limite é 15MB.' });
  }

  return res.status(400).json({ erro: erro.message || 'Não consegui receber o arquivo.' });
});

export default router;