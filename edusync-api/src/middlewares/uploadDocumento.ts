import multer from 'multer';


const TIPOS_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
  'application/octet-stream',
];

const EXTENSOES_ACEITAS = /\.(pdf|jpe?g|png|webp|heic|docx|txt|md)$/i;

export const uploadDocumento = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 15 * 1024 * 1024 },

  fileFilter: (_req, arquivo, seguir) => {
    const tipoServe = TIPOS_ACEITOS.includes(arquivo.mimetype);
    const extensaoServe = EXTENSOES_ACEITAS.test(arquivo.originalname || '');

    if (tipoServe || extensaoServe) return seguir(null, true);

    seguir(
      new Error('Envie a atividade em PDF, Word (.docx) ou foto.')
    );
  },
});