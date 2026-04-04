
import { ShiftTemplateService } from '../services/shift-template.service';
import { prisma } from '../prismaClient';

// Mock Prisma Client
jest.mock('../prismaClient', () => ({
    __esModule: true,
    prisma: {
        shiftTemplate: {
            create: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(), // We might use soft delete (update) or actual delete
        },
    },
}));

describe('ShiftTemplateService', () => {
    let service: ShiftTemplateService;

    beforeEach(() => {
        service = new ShiftTemplateService();
        jest.clearAllMocks();
    });

    describe('createShiftTemplate', () => {
        it('should create a valid shift template', async () => {
            const input = {
                name: 'Morning Shift',
                startTime: '09:00',
                endTime: '17:00',
                companyId: 1,
            };

            const expectedResult = {
                id: 1,
                ...input,
                breakDuration: 60,
                isActive: true,
                color: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            (prisma.shiftTemplate.create as jest.Mock).mockResolvedValue(expectedResult);

            const result = await service.createShiftTemplate(input);

            expect(prisma.shiftTemplate.create).toHaveBeenCalledWith({
                data: {
                    ...input,
                    breakDuration: 60,
                    color: undefined,
                },
            });
            expect(result).toEqual(expectedResult);
        });

        it('should allow overnight shifts (endTime < startTime)', async () => {
            const input = {
                name: 'Night Shift',
                startTime: '22:00',
                endTime: '06:00', // Overnight shift — valid
                companyId: 1,
            };

            const expectedResult = {
                id: 1,
                ...input,
                breakDuration: 60,
                isActive: true,
                color: null,
                createdAt: expect.any(Date),
                updatedAt: expect.any(Date),
            };
            (prisma.shiftTemplate.create as jest.Mock).mockResolvedValue(expectedResult);

            const result = await service.createShiftTemplate(input);
            expect(result).toEqual(expectedResult);
        });

        it('should throw error if start and end time are equal', async () => {
            const input = {
                name: 'Zero Duration',
                startTime: '09:00',
                endTime: '09:00', // Zero-duration shift — invalid
                companyId: 1,
            };

            await expect(service.createShiftTemplate(input))
                .rejects
                .toThrow('Start time and end time cannot be the same');
        });

        it('should throw error on invalid time format', async () => {
            const input = {
                name: 'Invalid Format',
                startTime: '9:00', // Missing leading zero
                endTime: '17:00',
                companyId: 1,
            };

            await expect(service.createShiftTemplate(input))
                .rejects
                .toThrow('Invalid time format');
        });
    });

    describe('getShiftTemplates', () => {
        it('should return all active shift templates for company', async () => {
            const templates = [{ id: 1, name: 'T1', companyId: 1 }];
            (prisma.shiftTemplate.findMany as jest.Mock).mockResolvedValue(templates);

            const result = await service.getShiftTemplates(1);

            expect(prisma.shiftTemplate.findMany).toHaveBeenCalledWith({
                where: { companyId: 1, isActive: true },
                orderBy: { name: 'asc' },
            });
            expect(result).toEqual(templates);
        });
    });

    describe('updateShiftTemplate', () => {
        it('should update a shift template', async () => {
            const updateData = { name: 'Updated Name', companyId: 1 };
            const existing = { id: 1, name: 'Old', startTime: '09:00', endTime: '17:00', companyId: 1, breakDuration: 60, isActive: true, color: null, createdAt: new Date(), updatedAt: new Date() };

            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue(existing);
            (prisma.shiftTemplate.update as jest.Mock).mockResolvedValue({ ...existing, ...updateData });

            const result = await service.updateShiftTemplate(1, 1, updateData);

            expect(prisma.shiftTemplate.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateData,
            });
            expect(result.name).toBe('Updated Name');
        });

        it('should throw if template not found', async () => {
            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue(null);
            await expect(service.updateShiftTemplate(99, 1, { name: 'New' }))
                .rejects.toThrow('Shift template not found');
        });
    });

    describe('deleteShiftTemplate', () => {
        it('should soft delete a shift template', async () => {
            const existing = { id: 1, companyId: 1 };
            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue(existing);
            (prisma.shiftTemplate.update as jest.Mock).mockResolvedValue({ ...existing, isActive: false });

            await service.deleteShiftTemplate(1, 1);

            expect(prisma.shiftTemplate.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: { isActive: false },
            });
        });
    });
});
