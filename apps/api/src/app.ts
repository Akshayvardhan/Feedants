import express from 'express';
import cors from 'cors';
import { competitionRouter } from './competition';
import { authRouter, requireAuth } from './auth';
import { requestMetrics, metricsRegistry } from './monitoring';
import { paymentRouter } from './payment';
import rateLimit from 'express-rate-limit';

export const app = express();
app.use(cors());
app.use(express.json({ limit: '32kb', verify: (request, _response, buffer) => { (request as express.Request).rawBody = buffer; } }));
app.use(requestMetrics);
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));
app.get('/health', (_request, response) => response.json({ ok: true }));
app.get('/ready', (_request, response) => response.json({ ok: true, database: response.app.locals.databaseReady === true }));
app.get('/metrics', async (_request, response) => { response.set('Content-Type', metricsRegistry.contentType); response.end(await metricsRegistry.metrics()); });
app.use('/api/auth', authRouter);
app.use('/api/competitions', requireAuth, competitionRouter);
app.use('/api/payments', paymentRouter);
app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  console.error(error);
  response.status(500).json({ error: 'Something went wrong' });
});
