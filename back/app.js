import express from 'express';
import carRoutes from './src/modules/cars/carRoutes.js';

const app = express();

app.use(express.json());
app.use('/api/cars', carRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;
