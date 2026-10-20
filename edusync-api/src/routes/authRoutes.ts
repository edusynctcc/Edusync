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
  listarAvisos,
} from '../controllers/authController';
import {
  verificarEmail,
  loginCodigo,
  reenviarCodigo,
  esqueciSenha,
  redefinirSenha,
  atualizarSeguranca,
} from '../controllers/authCodigoController';
import { authMiddleware } from '../middlewares/authMiddleware';
 
const router = Router();
 
router.post('/register', register);
router.post('/login', login);
router.post('/verificar-email', verificarEmail);
router.post('/login-codigo', loginCodigo);
router.post('/reenviar-codigo', reenviarCodigo);
router.post('/esqueci-senha', esqueciSenha);
router.post('/redefinir-senha', redefinirSenha);
 
router.get('/me', authMiddleware, me);
router.put('/me', authMiddleware, atualizarPerfil);
router.put('/senha', authMiddleware, alterarSenha);
router.put('/notificacoes', authMiddleware, atualizarNotificacoes);
router.put('/foto', authMiddleware, atualizarFoto);
router.put('/preferencias', authMiddleware, atualizarPreferencias);
router.put('/seguranca', authMiddleware, atualizarSeguranca);
 
router.get('/avisos', authMiddleware, listarAvisos);
export default router;