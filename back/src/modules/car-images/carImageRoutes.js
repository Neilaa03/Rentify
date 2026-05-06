import { Router } from 'express';
import upload from '../../middleware/upload.js';

import {
  getAllCarImages,
  getCarImage,
  getCarImagesByCarId,
  createCarImageHandler,
  updateCarImageHandler,
  deleteCarImageHandler,
  uploadCarImageHandler,
  uploadAndCreateCarImageHandler,
} from './carImageController.js';

const router = Router();

router.get('/', getAllCarImages);
router.get('/car/:carId', getCarImagesByCarId);
router.get('/:id', getCarImage);
router.post('/upload', upload.single('image'), uploadCarImageHandler);
router.post('/car/:carId/upload', upload.single('image'), uploadAndCreateCarImageHandler);
router.post('/', createCarImageHandler);
router.put('/:id', updateCarImageHandler);
router.patch('/:id', updateCarImageHandler);
router.delete('/:id', deleteCarImageHandler);

export default router;
