import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';
import vinculoRoutes from './modules/vinculo/routes';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rotas
app.use('/api/vinculo', vinculoRoutes);

// Error handler
app.use(errorHandler);

export default app;
