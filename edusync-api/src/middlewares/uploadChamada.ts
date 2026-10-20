import multer from 'multer';


const TIPOS_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
  'text/plain',
  'application/octet-stream',
];

const EXTENSOES_ACEITAS = /\.(pdf|jpe?g|png|webp|xlsx|xls|csv)$/i;

export const uploadChamada = multer({
  storage: multer.memoryStorage(),

  limits: { fileSize: 10 * 1024 * 1024 },

  fileFilter: (_req, arquivo, seguir) => {
    const tipoServe = TIPOS_ACEITOS.includes(arquivo.mimetype);
    const extensaoServe = EXTENSOES_ACEITAS.test(arquivo.originalname || '');

    if (tipoServe || extensaoServe) return seguir(null, true);

    seguir(new Error('Envie um PDF, uma foto, ou uma planilha (.xlsx / .csv).'));
  },
});