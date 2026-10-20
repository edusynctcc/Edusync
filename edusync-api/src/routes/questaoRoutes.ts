import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarQuestao,
  listarQuestoes,
  buscarQuestao,
  atualizarQuestao,
  excluirQuestao,
} from '../controllers/questaoController';
import { uploadImagemQuestao } from '../middlewares/uploadImagemQuestao';
import {
  anexarImagem,
  removerImagem,
} from '../controllers/questaoImagemController';

const router = Router();

router.use(authMiddleware);

router.post('/', criarQuestao);
router.get('/', listarQuestoes);
router.get('/:id', buscarQuestao);
router.put('/:id', atualizarQuestao);
router.delete('/:id', excluirQuestao);

router.post(
  '/:id/imagem',
  (req, res, seguir) => {
    uploadImagemQuestao.single('imagem')(req, res, (falha: any) => {
      if (!falha) return seguir();

      const grande = falha.code === 'LIMIT_FILE_SIZE';

      return res.status(400).json({
        erro: grande
          ? 'Esta imagem passa de 5 MB. Escolha uma menor.'
          : 'Não consegui receber a imagem.',
        detalhe: falha.message,
      });
    });
  },
  anexarImagem
);

router.delete('/:id/imagem', removerImagem);

export default router;