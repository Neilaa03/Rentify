import express from 'express';
import authRoutes from './src/modules/auth/authRoutes.js';
// import carRoutes from './src/modules/cars/carRoutes.js';

const app = express();

app.use(express.json());

// Mount the auth module
app.use('/auth', authRoutes);

//app.use('/api/cars', carRoutes);

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

export default app;