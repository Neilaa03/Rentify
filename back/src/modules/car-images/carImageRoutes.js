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

/**
 * @openapi
 * /api/car-images:
 *   get:
 *     tags: [Car Images]
 *     summary: List all car images
 *     responses:
 *       200:
 *         description: List of car images
 */
router.get('/', getAllCarImages);
/**
 * @openapi
 * /api/car-images/car/{carId}:
 *   get:
 *     tags: [Car Images]
 *     summary: List images for a car
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Images for a car
 */
router.get('/car/:carId', getCarImagesByCarId);
/**
 * @openapi
 * /api/car-images/{id}:
 *   get:
 *     tags: [Car Images]
 *     summary: Get a car image
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car image
 */
router.get('/:id', getCarImage);
/**
 * @openapi
 * /api/car-images/car/{carId}/upload:
 *   post:
 *     tags: [Car Images]
 *     summary: Upload and attach an image to a car
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: carId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Image uploaded
 */
router.post('/car/:carId/upload', authenticateToken, verifyOwner, upload.single('image'), uploadAndCreateCarImageHandler);
/**
 * @openapi
 * /api/car-images:
 *   post:
 *     tags: [Car Images]
 *     summary: Create a car image record
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car image created
 */
router.post('/', authenticateToken, verifyOwner, createCarImageHandler);
router.put('/:id', authenticateToken, verifyOwner, updateCarImageHandler);
router.patch('/:id', authenticateToken, verifyOwner, updateCarImageHandler);
router.delete('/:id', authenticateToken, verifyOwner, deleteCarImageHandler);

export default router;
