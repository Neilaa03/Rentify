import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';
import {
  getAllCars,
  getCar,
  createCarHandler,
  updateCarHandler,
  deleteCarHandler,
} from './carController.js';

const router = Router();

router.get('/', getAllCars);
router.get('/:id', getCar);
router.post('/', authenticateToken, verifyOwner, createCarHandler);
router.put('/:id', authenticateToken, verifyOwner, updateCarHandler);
router.patch('/:id', authenticateToken, verifyOwner, updateCarHandler);
router.delete('/:id', authenticateToken, verifyOwner, deleteCarHandler);

export default router;
