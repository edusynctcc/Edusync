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
app.use(express.json({ limit: '5mb' }));

app.use('/uploads', express.static(PASTA_UPLOADS, { maxAge: '1h' }));

app.use('/auth', authRoutes);
app.use('/atividades', atividadeRoutes);
app.use('/turmas', turmaRoutes);
app.use('/alunos', alunoRoutes);
app.use('/questoes', questaoRoutes);
app.use('/alternativas', alternativaRoutes);
app.use('/correcoes', correcaoRoutes);

app.use('/importacao', importacaoRoutes);

export default app;