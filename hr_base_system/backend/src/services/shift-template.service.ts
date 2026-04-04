
import { prisma } from '../prismaClient';
import { ShiftTemplate } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../middleware/error.middleware';

interface CreateShiftTemplateDto {
    name: string;
    startTime: string;
    endTime: string;
    companyId: number;
    breakDuration?: number;
    color?: string;
    isOvernight?: boolean;
}

export class ShiftTemplateService {
    /**
     * Create a new shift template
     */
    async createShiftTemplate(data: CreateShiftTemplateDto): Promise<ShiftTemplate> {
        // Validation: Time format HH:mm (strict)
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(data.startTime) || !timeRegex.test(data.endTime)) {
            throw new BadRequestError('Invalid time format');
        }

        // Allow overnight shifts (e.g., "22:00" to "06:00") — endTime < startTime is valid for night shifts.
        // Only reject when times are exactly equal.
        if (data.endTime === data.startTime) {
            throw new BadRequestError('Start time and end time cannot be the same');
        }

        return await prisma.shiftTemplate.create({
            data: {
                name: data.name,
                startTime: data.startTime,
                endTime: data.endTime,
                companyId: data.companyId,
                breakDuration: data.breakDuration ?? 60,
                color: data.color,
            },
        });

    }

    /**
     * Get all shift templates for a company
     */
    async getShiftTemplates(companyId: number): Promise<ShiftTemplate[]> {
        return await prisma.shiftTemplate.findMany({
            where: { companyId, isActive: true },
            orderBy: { name: 'asc' },
        });
    }

    /**
     * Update a shift template
     */
    async updateShiftTemplate(id: number, companyId: number, data: Partial<CreateShiftTemplateDto>): Promise<ShiftTemplate> {
        // Basic check for existence (and company ownership)
        const existing = await prisma.shiftTemplate.findUnique({
            where: { id },
        });

        if (!existing || existing.companyId !== companyId) {
            throw new NotFoundError('Shift template not found');
        }

        // Validate times if provided
        if (data.startTime || data.endTime) {
            const start = data.startTime || existing.startTime;
            const end = data.endTime || existing.endTime;

            const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(start) || !timeRegex.test(end)) {
                throw new BadRequestError('Invalid time format');
            }
            if (end === start) {
                throw new BadRequestError('Start time and end time cannot be the same');
            }
        }

        return await prisma.shiftTemplate.update({
            where: { id },
            data: {
                ...data,
                breakDuration: data.breakDuration, // Explicitly pass optional fields
                color: data.color,
            },
        });
    }

    /**
     * Delete (Soft Delete) a shift template
     */
    async deleteShiftTemplate(id: number, companyId: number): Promise<void> {
        const existing = await prisma.shiftTemplate.findUnique({
            where: { id },
        });

        if (!existing || existing.companyId !== companyId) {
            throw new NotFoundError('Shift template not found');
        }

        await prisma.shiftTemplate.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
