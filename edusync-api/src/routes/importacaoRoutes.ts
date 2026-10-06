import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { importarAtividadeDeArquivo } from '../controllers/importacaoController';
import { uploadDocumento } from '../middlewares/uploadDocumento';

// ---------------------------------------------------------------------------
// Rotas de importação de arquivo.
//
// Por que um arquivo novo em vez de uma linha no atividadeRoutes: esta rota
// não cria, não edita e não apaga atividade nenhuma — ela lê um arquivo e
// devolve texto. Misturar com o CRUD de atividade faria parecer que ela grava.
//
// Se um dia entrar a importação de outra coisa por arquivo, é aqui que ela
// mora.
// ---------------------------------------------------------------------------

const router = Router();

router.use(authMiddleware);

router.post(
  '/atividade',
  (req, res, seguir) => {
    uploadDocumento.single('arquivo')(req, res, (falha: any) => {
      if (!falha) return seguir();

      const grande = falha.code === 'LIMIT_FILE_SIZE';

      return res.status(400).json({
        erro: grande
          ? 'Esse arquivo passa de 15 MB. Mande a prova em PDF ou .docx — ' +
            'foto de página inteira costuma ser o que pesa.'
          : 'Não consegui receber esse arquivo.',
        detalhe: falha.message,
      });
    });
  },
  importarAtividadeDeArquivo
);

export default router;