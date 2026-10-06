import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import {
  criarAluno,
  listarAlunos,
  buscarAluno,
  atualizarAluno,
  excluirAluno,
  lerListaDeChamada,
  importarAlunos,
} from '../controllers/alunoController';
import { uploadChamada } from '../middlewares/uploadChamada';

const router = Router();

router.use(authMiddleware);

// ---------------------------------------------------------------------------
// As rotas da importação vêm ANTES de /:id.
//
// O Express compara na ordem em que foram registradas. Com /:id primeiro,
// um POST para /alunos/importar casaria com ele, e o controller receberia
// "importar" como id de aluno — erro confuso e difícil de achar.
// ---------------------------------------------------------------------------
router.post(
  '/importar/ler',
  (req, res, seguir) => {
    uploadChamada.single('arquivo')(req, res, (falha: any) => {
      if (!falha) return seguir();

      const grande = falha.code === 'LIMIT_FILE_SIZE';

      return res.status(400).json({
        erro: grande
          ? 'Esse arquivo passa de 10 MB. Mande a lista em PDF ou planilha.'
          : 'Não consegui receber esse arquivo.',
        detalhe: falha.message,
      });
    });
  },
  lerListaDeChamada
);

router.post('/importar', importarAlunos);

router.post('/', criarAluno);
router.get('/', listarAlunos);
router.get('/:id', buscarAluno);
router.put('/:id', atualizarAluno);
router.delete('/:id', excluirAluno);

export default router;