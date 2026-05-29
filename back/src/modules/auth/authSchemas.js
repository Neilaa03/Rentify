import { z } from 'zod';

// defining the allowed roles
const UserRole = z.enum(['client', 'companyManager', 'owner', 'admin']);

export const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().min(5).max(30),
    role: UserRole.default('client'),
}).refine((data) => data.password === data.confirmPassword);

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

export const updateMeSchema = z
  .object({
    email: z.string().email().optional(),
    phone: z.string().min(5).max(30).optional(),
  })
  .refine((data) => data.email !== undefined || data.phone !== undefined, {
    message: 'At least one field is required',
  });
export const resendVerificationSchema = z.object({
    email: z.string().email(),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

export const resetPasswordSchema = z.object({
    email: z.string().email(),
    token: z.string().min(1),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
}).refine((data) => data.password === data.confirmPassword);
