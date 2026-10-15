import { Router } from 'express';
import {
  register,
  login,
  me,
  atualizarPerfil,
  alterarSenha,
  atualizarNotificacoes,
  atualizarFoto,
  atualizarPreferencias,
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, atualizarPerfil);
router.put('/senha', authMiddleware, alterarSenha);
router.put('/notificacoes', authMiddleware, atualizarNotificacoes);
router.put('/foto', authMiddleware, atualizarFoto);
router.put('/preferencias', authMiddleware, atualizarPreferencias);

export default router;