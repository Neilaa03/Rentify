import express from 'express';
import carRoutes from './src/modules/cars/carRoutes.js';
import carImageRoutes from './src/modules/car-images/carImageRoutes.js';
import carDocumentRoutes from './src/modules/car-documents/carDocumentRoutes.js';
import listingRoutes from './src/modules/car-listings/listingRoutes.js';

const app = express();

app.use(express.json());
app.use('/api/cars', carRoutes);
app.use('/api/car-images', carImageRoutes);
app.use('/api/car-documents', carDocumentRoutes);
app.use('/api/listings', listingRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;
