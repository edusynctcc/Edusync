import multer from 'multer';

// ---------------------------------------------------------------------------
// O arquivo da atividade pronta que o professor manda para importar.
//
// memoryStorage, como a lista de chamada: o arquivo é lido uma vez e
// descartado. O que fica guardado são as questões, no banco. Guardar a prova
// original em disco seria guardar uma cópia que ninguém vai abrir de novo.
//
// Separado do uploadChamada de propósito, embora os dois se pareçam: os tipos
// aceitos são diferentes (aqui entra .docx, lá entra .xlsx) e o limite também.
// Juntar os dois num middleware com parâmetro deixaria a mensagem de erro
// genérica justo onde ela precisa dizer o que mandar.
// ---------------------------------------------------------------------------

const TIPOS_ACEITOS = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/markdown',
  // O Android às vezes não identifica o arquivo vindo do Drive. A extensão
  // decide nesses casos.
  'application/octet-stream',
];

const EXTENSOES_ACEITAS = /\.(pdf|jpe?g|png|webp|heic|docx|txt|md)$/i;

export const uploadDocumento = multer({
  storage: multer.memoryStorage(),

  // 15 MB: uma prova de 4 páginas escaneada em cor passa dos 10 MB com
  // facilidade, e aqui o professor fotografa a folha inteira, não uma lista.
  // O arquivo fica na RAM do servidor enquanto é lido, então não dá para
  // abrir muito mais do que isso.
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