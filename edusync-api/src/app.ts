import express from 'express';
import authRoutes from './routes/authRoutes';
import atividadeRoutes from './routes/atividadeRoutes';
import turmaRoutes from './routes/turmaRoutes';

const app = express();

app.use(express.json());
app.use('/auth', authRoutes);
app.use('/atividades', atividadeRoutes);
app.use('/turmas', turmaRoutes);

export default app;