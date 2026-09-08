import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import atividadeRoutes from './routes/atividadeRoutes';
import turmaRoutes from './routes/turmaRoutes';
import alunoRoutes from './routes/alunoRoutes';
import questaoRoutes from './routes/questaoRoutes';
import alternativaRoutes from './routes/alternativaRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);
app.use('/atividades', atividadeRoutes);
app.use('/turmas', turmaRoutes);
app.use('/alunos', alunoRoutes);
app.use('/questoes', questaoRoutes);
app.use('/alternativas', alternativaRoutes);

export default app;