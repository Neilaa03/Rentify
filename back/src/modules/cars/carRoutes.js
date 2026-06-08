import { Router } from 'express';
import { authenticateToken } from '../../middleware/auth.js';
import { verifyOwner } from '../../middleware/roles/verifyOwner.js';
import {
  getAllCars,
  getMyCars,
  getCar,
  createCarHandler,
  updateCarHandler,
  deleteCarHandler,
} from './carController.js';

const router = Router();

/**
 * @openapi
 * /api/cars:
 *   get:
 *     tags: [Cars]
 *     summary: List all cars
 *     responses:
 *       200:
 *         description: List of cars
 *   post:
 *     tags: [Cars]
 *     summary: Create a car
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car created
 */
router.get('/', getAllCars);
/**
 * @openapi
 * /api/cars/my:
 *   get:
 *     tags: [Cars]
 *     summary: Get current owner's cars
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Owner cars
 * /api/cars/{id}:
 *   get:
 *     tags: [Cars]
 *     summary: Get a car by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Car details
 *   put:
 *     tags: [Cars]
 *     summary: Replace a car
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car updated
 *   patch:
 *     tags: [Cars]
 *     summary: Update a car
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car updated
 *   delete:
 *     tags: [Cars]
 *     summary: Delete a car
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Car deleted
 */
router.get('/my', authenticateToken, verifyOwner, getMyCars);
router.get('/:id', getCar);
router.post('/', authenticateToken, verifyOwner, createCarHandler);
router.put('/:id', authenticateToken, verifyOwner, updateCarHandler);
router.patch('/:id', authenticateToken, verifyOwner, updateCarHandler);
router.delete('/:id', authenticateToken, verifyOwner, deleteCarHandler);

export default router;
