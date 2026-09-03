import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarTurma,
  listarTurmas,
  buscarTurma,
  atualizarTurma,
  excluirTurma,
} from '../controllers/turmaController';

const router = Router();

router.use(authMiddleware);

router.post('/', criarTurma);
router.get('/', listarTurmas);
router.get('/:id', buscarTurma);
router.put('/:id', atualizarTurma);
router.delete('/:id', excluirTurma);

export default router;