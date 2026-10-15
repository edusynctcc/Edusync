import { Router } from 'express';
import {
    alterarSenha,
    atualizarNotificacoes,
    atualizarPerfil,
    login,
    me,
    register,
} from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, atualizarPerfil);
router.put('/senha', authMiddleware, alterarSenha);
router.put('/notificacoes', authMiddleware, atualizarNotificacoes);

export default router;