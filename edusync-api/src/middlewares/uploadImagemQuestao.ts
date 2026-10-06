import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import multer from 'multer';

// ---------------------------------------------------------------------------
// O upload da imagem da questão.
//
// É um multer SEPARADO do que recebe a folha do aluno, de propósito. Aquele usa
// memoryStorage: o arquivo vira buffer, vai para o Gemini e some. Faz sentido
// lá — a folha é lida uma vez e o que interessa é a nota.
//
// Aqui é o contrário: a imagem da questão precisa continuar existindo, porque
// ela é impressa na prova e aparece na tela toda vez que alguém abre a
// atividade. Então vai para o disco.
// ---------------------------------------------------------------------------

// process.cwd() é a pasta de onde o servidor foi iniciado (edusync-api). Usar
// __dirname daria o caminho de dentro de src/ ou dist/, que muda conforme o
// projeto está rodando em desenvolvimento ou compilado.
export const PASTA_UPLOADS = path.resolve(process.cwd(), 'uploads');

const PASTA_QUESTOES = path.join(PASTA_UPLOADS, 'questoes');

// Criar na subida evita o erro "ENOENT: no such file or directory" no primeiro
// upload depois de clonar o projeto.
fs.mkdirSync(PASTA_QUESTOES, { recursive: true });

const EXTENSAO_POR_TIPO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const armazenamento = multer.diskStorage({
  destination: (_req, _arquivo, seguir) => seguir(null, PASTA_QUESTOES),

  // O nome vem de nós, nunca do que o celular mandou. Nome de arquivo enviado
  // por cliente pode ter "../" e escrever fora da pasta — e também pode ter
  // acento, espaço e caractere que quebra a URL depois.
  filename: (_req, arquivo, seguir) => {
    const extensao = EXTENSAO_POR_TIPO[arquivo.mimetype] || '.jpg';
    const carimbo = Date.now().toString(36);
    const sorteio = randomUUID().slice(0, 8);
    seguir(null, `q-${carimbo}-${sorteio}${extensao}`);
  },
});

export const uploadImagemQuestao = multer({
  storage: armazenamento,

  // 5 MB. Foto de celular moderno passa disso fácil, e por isso o app manda a
  // imagem já reduzida. Este limite é a rede de proteção do servidor, não a
  // primeira linha de defesa.
  limits: { fileSize: 5 * 1024 * 1024 },

  fileFilter: (_req, arquivo, seguir) => {
    if (EXTENSAO_POR_TIPO[arquivo.mimetype]) return seguir(null, true);
    seguir(new Error('Envie uma imagem JPG, PNG ou WEBP.'));
  },
});

// ---------------------------------------------------------------------------
// O caminho que vai para o banco.
//
// Guardamos relativo ("/uploads/questoes/q-x.jpg") e não a URL inteira. O IP da
// máquina muda toda vez que o Wi-Fi muda, e uma URL gravada com o IP de ontem
// aponta para lugar nenhum hoje. Quem monta a URL completa é o app, que já
// descobre o endereço da API sozinho.
// ---------------------------------------------------------------------------
export function caminhoPublico(nomeDoArquivo: string) {
  return `/uploads/questoes/${nomeDoArquivo}`;
}

// Converte de volta para o caminho em disco, recusando qualquer coisa que não
// seja um arquivo dentro da pasta de questões.
export function caminhoEmDisco(caminho: string | null | undefined) {
  const valor = String(caminho ?? '');
  if (!valor.startsWith('/uploads/questoes/')) return null;

  const nome = path.basename(valor);
  if (!nome || nome.includes('..')) return null;

  return path.join(PASTA_QUESTOES, nome);
}