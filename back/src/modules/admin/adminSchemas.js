import { z } from 'zod';

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
});

export const userUpdateSchema = z.object({
  role: z.enum(['client', 'companyManager', 'owner', 'admin']).optional(),
  isActive: z.boolean().optional(),
  isVerified: z.boolean().optional(),
});

export const carModerationSchema = z.object({
  approvalStatus: z.enum(['pending', 'approved', 'rejected']).optional(),
  isHidden: z.boolean().optional(),
});

export const reservationUpdateSchema = z.object({
  status: z.enum(['confirmed', 'cancelled', 'reserved', 'refunded', 'refund_pending', 'pickup_pending']),
});

export const notificationSchema = z.object({
  userIds: z.array(z.string().uuid()).optional(),
  title: z.string().min(2),
  message: z.string().min(2),
  type: z.string().min(2).default('admin_broadcast'),
  data: z.record(z.any()).optional(),
});

export const refundSchema = z.object({
  paymentId: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.string().min(2).default('Admin refund'),
});
