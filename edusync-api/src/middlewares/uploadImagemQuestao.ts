import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';


export const PASTA_UPLOADS = path.resolve(process.cwd(), 'uploads');

const PASTA_QUESTOES = path.join(PASTA_UPLOADS, 'questoes');

fs.mkdirSync(PASTA_QUESTOES, { recursive: true });

const EXTENSAO_POR_TIPO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const armazenamento = multer.diskStorage({
  destination: (_req, _arquivo, seguir) => seguir(null, PASTA_QUESTOES),

  filename: (_req, arquivo, seguir) => {
    const extensao = EXTENSAO_POR_TIPO[arquivo.mimetype] || '.jpg';
    const carimbo = Date.now().toString(36);
    const sorteio = randomUUID().slice(0, 8);
    seguir(null, `q-${carimbo}-${sorteio}${extensao}`);
  },
});

export const uploadImagemQuestao = multer({
  storage: armazenamento,

  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (_req, arquivo, seguir) => {
    if (EXTENSAO_POR_TIPO[arquivo.mimetype]) return seguir(null, true);
    seguir(new Error('Envie uma imagem JPG, PNG ou WEBP.'));
  },
});

export function caminhoPublico(nomeDoArquivo: string) {
  return `/uploads/questoes/${nomeDoArquivo}`;
}

export function caminhoEmDisco(caminho: string | null | undefined) {
  const valor = String(caminho ?? '');
  if (!valor.startsWith('/uploads/questoes/')) return null;

  const nome = path.basename(valor);
  if (!nome || nome.includes('..')) return null;

  return path.join(PASTA_QUESTOES, nome);
}