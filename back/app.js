import express from 'express';
import carRoutes from './src/modules/cars/carRoutes.js';
import carImageRoutes from './src/modules/car-images/carImageRoutes.js';

const app = express();

app.use(express.json());
app.use('/api/cars', carRoutes);
app.use('/api/car-images', carImageRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;
