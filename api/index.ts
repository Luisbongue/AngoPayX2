import express from 'express';
import { apiRouter } from '../src/server/api.ts';

const app = express();

// Middleware for parsing JSON requests up to 15MB
app.use(express.json({ limit: '15mb' }));

// Mount API router for both /api prefix and root level (for Vercel serverless functions)
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
