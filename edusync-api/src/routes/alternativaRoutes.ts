import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarAlternativa,
  listarAlternativas,
  buscarAlternativa,
  atualizarAlternativa,
  excluirAlternativa,
} from '../controllers/alternativaController';

const router = Router();

router.use(authMiddleware);

router.post('/', criarAlternativa);
router.get('/', listarAlternativas);
router.get('/:id', buscarAlternativa);
router.put('/:id', atualizarAlternativa);
router.delete('/:id', excluirAlternativa);

export default router;