import express from 'express';
import cors from 'cors';
import carRoutes from './src/modules/cars/carRoutes.js';
import carImageRoutes from './src/modules/car-images/carImageRoutes.js';
import listingRoutes from './src/modules/car-listings/listingRoutes.js';
import authRoutes from './src/modules/auth/authRoutes.js';
import documentRoutes from './src/modules/documents/documentRoutes.js';
import paymentRoutes from './src/modules/payments/paymentRoutes.js';
import { handleStripeWebhook } from './src/modules/payments/paymentController.js';
import reservationRoutes from './src/modules/reservations/reservationRoutes.js';
import notificationRoutes from './src/modules/notifications/notificationRoutes.js';
import messageRoutes from './src/modules/messages/messageRoutes.js';
import favoritesRoutes from './src/modules/favorites/favoritesRoutes.js';
import adminRoutes from './src/modules/admin/adminRoutes.js';
import reviewRoutes from './src/modules/reviews/reviewRoutes.js';
import profileRoutes from './src/modules/profile/profileRoutes.js';

const app = express();

// Stripe webhook MUST use raw body and be declared before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// CORS Configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());
app.use('/api/cars', carRoutes);
app.use('/api/car-images', carImageRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/profile', profileRoutes);

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;
