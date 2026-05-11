import express from 'express';
import cors from 'cors';
import carRoutes from './src/modules/cars/carRoutes.js';
import carImageRoutes from './src/modules/car-images/carImageRoutes.js';
import carDocumentRoutes from './src/modules/car-documents/carDocumentRoutes.js';
import listingRoutes from './src/modules/car-listings/listingRoutes.js';
import authRoutes from './src/modules/auth/authRoutes.js';
import reservationRoutes from './src/modules/reservations/reservationRoutes.js';

const app = express();

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use('/api/cars', carRoutes);
app.use('/api/car-images', carImageRoutes);
app.use('/api/car-documents', carDocumentRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reservations', reservationRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});


export default app;
