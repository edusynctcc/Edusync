import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarQuestao,
  listarQuestoes,
  buscarQuestao,
  atualizarQuestao,
  excluirQuestao,
} from '../controllers/questaoController';

const router = Router();

router.use(authMiddleware);

router.post('/', criarQuestao);
router.get('/', listarQuestoes);
router.get('/:id', buscarQuestao);
router.put('/:id', atualizarQuestao);
router.delete('/:id', excluirQuestao);

export default router;