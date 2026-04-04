import { z } from 'zod';

export const updateCompanySchema = z.object({
    name: z.string().min(1, 'Company name is required'),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    website: z.string().url('Invalid URL').optional().or(z.literal('')),
    registrationNumber: z.string().optional(),
    taxId: z.string().optional(),
    logoUrl: z.string().url('Invalid Logo URL').optional().or(z.literal('')),
    country: z.string().optional(),
    currency: z.string().optional(),
});

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
