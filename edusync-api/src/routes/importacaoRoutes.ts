import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { importarAtividadeDeArquivo } from '../controllers/importacaoController';
import { uploadDocumento } from '../middlewares/uploadDocumento';


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