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

// Atrás do proxy do Render/Railway/Fly. Sem isto o Express enxerga o IP do
// balanceador em vez do IP de quem chamou, e qualquer log ou limite por IP
// passa a contar todo mundo como a mesma pessoa.
app.set('trust proxy', 1);

// CORS.
//
// Em produção, liste os domínios liberados na variável CORS_ORIGENS, separados
// por vírgula:
//
//   CORS_ORIGENS=https://edusync-api--fod9jb3zw0.expo.app,http://localhost:8081
//
// Sem a variável, libera geral — que é o comportamento de hoje. Deixei assim
// de propósito: se a variável estiver errada, o app quebra inteiro no
// navegador com um erro de CORS que não diz o que houve, e não é isso que
// você quer descobrir na véspera. Aperte depois que estiver tudo no ar.
const origensPermitidas = (process.env.CORS_ORIGENS ?? '')
  .split(',')
  .map((origem) => origem.trim())
  .filter(Boolean);

app.use(
  origensPermitidas.length
    ? cors({
        origin(origem, callback) {
          // App nativo, curl e Postman não mandam Origin: deixa passar.
          if (!origem || origensPermitidas.includes(origem)) {
            return callback(null, true);
          }
          callback(new Error(`Origem não permitida pelo CORS: ${origem}`));
        },
      })
    : cors(),
);

app.use(express.json({ limit: '5mb' }));

// Rota raiz. O host usa isto como health check para saber se o serviço subiu,
// e serve para você abrir no navegador e confirmar que a API está no ar sem
// precisar logar.
app.get('/', (_req, res) => {
  res.json({ servico: 'edusync-api', ok: true });
});

// ATENÇÃO antes de subir: em Render, Railway e Fly o disco é efêmero — ele é
// zerado a cada deploy e a cada restart do container. As imagens de questão
// gravadas em PASTA_UPLOADS somem junto, e o banco fica com o caminho de um
// arquivo que não existe mais.
//
// Para a banca isso costuma dar: você sobe as imagens depois do último deploy
// e elas duram a apresentação. Para valer, precisa ir para storage de objetos
// (S3, Cloudflare R2, Supabase Storage).
//
// E continua sem autenticação: quem tiver o endereço vê foto de prova com nome
// de aluno. Em localhost era dívida técnica; num domínio público é dado
// pessoal de menor de idade exposto.
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