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
