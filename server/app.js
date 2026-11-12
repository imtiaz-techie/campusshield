import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { ensureDb, sanitizeRequest, notFound, errorHandler } from './middleware/common.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.isProd ? true : [env.clientUrl, 'http://localhost:4173'], credentials: false }));
app.use(express.json({ limit: '100kb' }));
app.use(sanitizeRequest);

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'CampusShield API is running', time: new Date().toISOString() }));

app.use('/api', ensureDb, routes);
app.use('/api', notFound);
app.use(errorHandler);

export default app;
