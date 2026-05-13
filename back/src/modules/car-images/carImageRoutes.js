import { Router } from 'express';
import upload from '../../middleware/upload.js';
import { authenticateToken } from '../../middleware/auth.js';

import {
  getAllCarImages,
  getCarImage,
  getCarImagesByCarId,
  createCarImageHandler,
  updateCarImageHandler,
  deleteCarImageHandler,
  uploadAndCreateCarImageHandler,
} from './carImageController.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';

const router = Router();

router.get('/', getAllCarImages);
router.get('/car/:carId', getCarImagesByCarId);
router.get('/:id', getCarImage);
router.post('/car/:carId/upload', authenticateToken, verifyOwner, upload.single('image'), uploadAndCreateCarImageHandler);
router.post('/', authenticateToken, verifyOwner, createCarImageHandler);
router.put('/:id', authenticateToken, verifyOwner, updateCarImageHandler);
router.patch('/:id', authenticateToken, verifyOwner, updateCarImageHandler);
router.delete('/:id', authenticateToken, verifyOwner, deleteCarImageHandler);

export default router;
