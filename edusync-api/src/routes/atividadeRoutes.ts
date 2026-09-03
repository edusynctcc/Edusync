import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarAtividade,
  listarAtividades,
  buscarAtividade,
  atualizarAtividade,
  excluirAtividade,
} from '../controllers/atividadeController';

const router = Router();

router.use(authMiddleware);

router.post('/', criarAtividade);
router.get('/', listarAtividades);
router.get('/:id', buscarAtividade);
router.put('/:id', atualizarAtividade);
router.delete('/:id', excluirAtividade);

export default router;