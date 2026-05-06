import { Router } from 'express';
import {
  getAllCarImages,
  getCarImage,
  getCarImagesByCarId,
  createCarImageHandler,
  updateCarImageHandler,
  deleteCarImageHandler,
} from './carImageController.js';

const router = Router();

router.get('/', getAllCarImages);
router.get('/car/:carId', getCarImagesByCarId);
router.get('/:id', getCarImage);
router.post('/', createCarImageHandler);
router.put('/:id', updateCarImageHandler);
router.patch('/:id', updateCarImageHandler);
router.delete('/:id', deleteCarImageHandler);

export default router;
