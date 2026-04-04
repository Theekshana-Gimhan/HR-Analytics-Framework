
import { RosterService } from './roster.service';
import { prisma } from '../prismaClient';
import { ShiftTemplate } from '@prisma/client';

// Mock prisma
jest.mock('../prismaClient', () => ({
    prisma: {
        shiftTemplate: {
            findUnique: jest.fn(),
        },
        employee: {
            findFirst: jest.fn(),
        },
        employeeShift: {
            findUnique: jest.fn(),
            create: jest.fn(),
            findMany: jest.fn(),
        },
    },
}));

describe('RosterService', () => {
    let rosterService: RosterService;

    beforeEach(() => {
        rosterService = new RosterService();
        jest.clearAllMocks();
    });

    describe('assignShift', () => {
        const mockDate = new Date('2023-10-27');
        const companyId = 1;
        const employeeId = 101;
        const shiftTemplateId = 202;

        const mockTemplate: ShiftTemplate = {
            id: shiftTemplateId,
            companyId: companyId,
            name: 'Day Shift',
            startTime: '09:00',
            endTime: '17:00',
            breakDuration: 60,
            color: '#ffffff',
            isActive: true, // Add missing required property
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        it('should assign a shift successfully', async () => {
            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: employeeId });
            (prisma.employeeShift.findUnique as jest.Mock).mockResolvedValue(null);
            (prisma.employeeShift.create as jest.Mock).mockResolvedValue({
                id: 1,
                employeeId,
                shiftTemplateId,
                date: mockDate,
                status: 'SCHEDULED',
                companyId,
            });

            const result = await rosterService.assignShift(employeeId, shiftTemplateId, mockDate, companyId);

            expect(prisma.shiftTemplate.findUnique).toHaveBeenCalledWith({ where: { id: shiftTemplateId } });
            expect(prisma.employeeShift.findUnique).toHaveBeenCalled();
            expect(prisma.employeeShift.create).toHaveBeenCalledWith({
                data: {
                    employeeId,
                    shiftTemplateId,
                    date: mockDate,
                    status: 'SCHEDULED',
                },
            });
            expect(result).toBeDefined();
        });

        it('should throw error if shift template not found', async () => {
            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue(null);

            await expect(rosterService.assignShift(employeeId, shiftTemplateId, mockDate, companyId))
                .rejects.toThrow('Shift template not found');
        });

        it('should throw error if shift template belongs to another company', async () => {
            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue({ ...mockTemplate, companyId: 999 });

            await expect(rosterService.assignShift(employeeId, shiftTemplateId, mockDate, companyId))
                .rejects.toThrow('Shift template not found');
        });

        it('should throw error if shift already exists for the date', async () => {
            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue(mockTemplate);
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: employeeId });
            (prisma.employeeShift.findUnique as jest.Mock).mockResolvedValue({ id: 1 });

            await expect(rosterService.assignShift(employeeId, shiftTemplateId, mockDate, companyId))
                .rejects.toThrow('Shift already assigned for this date');
        });
    });

    describe('getRoster', () => {
        it('should return shifts for the given date range and company', async () => {
            const companyId = 1;
            const startDate = new Date('2023-10-01');
            const endDate = new Date('2023-10-07');
            const mockShifts = [{ id: 1 }, { id: 2 }];

            (prisma.employeeShift.findMany as jest.Mock).mockResolvedValue(mockShifts);

            const result = await rosterService.getRoster(companyId, startDate, endDate);

            expect(prisma.employeeShift.findMany).toHaveBeenCalledWith({
                where: {
                    employee: { user: { companyId } },
                    date: {
                        gte: startDate,
                        lte: endDate,
                    },
                },
                include: {
                    employee: {
                        select: { id: true, first_name: true, last_name: true },
                    },
                    shiftTemplate: true,
                },
            });
            expect(result).toEqual(mockShifts);
        });
    });
});
