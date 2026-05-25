import { z } from 'zod';

export const verifyPickupSchema = z
  .object({
    code: z.string().trim().min(4).max(12).optional(),
    qrToken: z.string().trim().min(8).optional(),
  })
  .refine((value) => Boolean(value.code) || Boolean(value.qrToken), {
    message: 'Either code or qrToken is required',
    path: ['code'],
  });

