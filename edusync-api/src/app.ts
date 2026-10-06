import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import atividadeRoutes from './routes/atividadeRoutes';
import turmaRoutes from './routes/turmaRoutes';
import alunoRoutes from './routes/alunoRoutes';
import questaoRoutes from './routes/questaoRoutes';
import alternativaRoutes from './routes/alternativaRoutes';
import correcaoRoutes from './routes/correcaoRoutes';
import importacaoRoutes from './routes/importacaoRoutes';
import { PASTA_UPLOADS } from './middlewares/uploadImagemQuestao';

const app = express();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Os arquivos enviados pelo professor — hoje, as imagens das questões.
//
// Fica ANTES das rotas de propósito: assim uma requisição para /uploads é
// respondida com o arquivo e não passa por nenhum authMiddleware.
//
// A imagem não é protegida por token, e isso é uma escolha: ela aparece dentro
// de uma tag <img> na tela e dentro do PDF da prova, e nenhum dos dois manda
// cabeçalho de autenticação. O nome do arquivo é sorteado, então não dá para
// adivinhar o caminho de uma imagem de outro professor — mas quem tiver o link
// consegue abrir. Para uma folha de prova em branco, que vai impressa para a
// turma inteira, isso é aceitável. Se um dia guardar algo sensível aqui, esta
// linha precisa mudar.
// ---------------------------------------------------------------------------
app.use('/uploads', express.static(PASTA_UPLOADS, { maxAge: '1h' }));

app.use('/auth', authRoutes);
app.use('/atividades', atividadeRoutes);
app.use('/turmas', turmaRoutes);
app.use('/alunos', alunoRoutes);
app.use('/questoes', questaoRoutes);
app.use('/alternativas', alternativaRoutes);
app.use('/correcoes', correcaoRoutes);

// Ler arquivo que o professor manda (atividade pronta). Só lê, não grava.
app.use('/importacao', importacaoRoutes);

export default app;