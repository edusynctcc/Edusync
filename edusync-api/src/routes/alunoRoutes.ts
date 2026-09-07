import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarAluno,
  listarAlunos,
  buscarAluno,
  atualizarAluno,
  excluirAluno,
} from '../controllers/alunoController';

const router = Router();

router.use(authMiddleware);

router.post('/', criarAluno);
router.get('/', listarAlunos);
router.get('/:id', buscarAluno);
router.put('/:id', atualizarAluno);
router.delete('/:id', excluirAluno);

export default router;