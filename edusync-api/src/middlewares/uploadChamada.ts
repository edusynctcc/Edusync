import multer from 'multer';

// ---------------------------------------------------------------------------
// O arquivo da lista de chamada.
//
// memoryStorage, e não disco: diferente da imagem da questão, esta lista é
// lida uma vez e descartada. O que fica guardado são os alunos, no banco — o
// arquivo em si não serve para mais nada depois.
//
// É a mesma escolha que o upload da folha do aluno já faz.
// ---------------------------------------------------------------------------

const TIPOS_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/csv',
  'application/csv',
  // Alguns navegadores mandam CSV assim, e o Android às vezes não identifica
  // nada. A extensão decide nesses casos.
  'text/plain',
  'application/octet-stream',
];

const EXTENSOES_ACEITAS = /\.(pdf|jpe?g|png|webp|xlsx|xls|csv)$/i;

export const uploadChamada = multer({
  storage: multer.memoryStorage(),

  // Lista de chamada é leve. 10 MB cobre um PDF de várias páginas digitalizado
  // e ainda segura memória, já que o arquivo inteiro fica na RAM do servidor.
  limits: { fileSize: 10 * 1024 * 1024 },

  fileFilter: (_req, arquivo, seguir) => {
    const tipoServe = TIPOS_ACEITOS.includes(arquivo.mimetype);
    const extensaoServe = EXTENSOES_ACEITAS.test(arquivo.originalname || '');

    if (tipoServe || extensaoServe) return seguir(null, true);

    seguir(new Error('Envie um PDF, uma foto, ou uma planilha (.xlsx / .csv).'));
  },
});