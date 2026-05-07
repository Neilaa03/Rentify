import { Router } from 'express';
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
router.post('/', createCarHandler);
router.put('/:id', updateCarHandler);
router.patch('/:id', updateCarHandler);
router.delete('/:id', deleteCarHandler);

export default router;
