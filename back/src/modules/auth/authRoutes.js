import express from 'express';
import { register } from './authController.js';

const router = express.Router();

// POST http://localhost:3000/api/auth/register
router.post('/register', register);

export default router;