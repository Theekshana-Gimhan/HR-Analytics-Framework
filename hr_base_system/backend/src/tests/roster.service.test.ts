
import { RosterService } from '../services/roster.service';
import { prisma } from '../prismaClient';

// Mock Prisma
jest.mock('../prismaClient', () => ({
    __esModule: true,
    prisma: {
        employeeShift: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            delete: jest.fn(),
        },
        shiftTemplate: {
            findUnique: jest.fn(),
        },
        employee: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        }
    },
}));

describe('RosterService', () => {
    let service: RosterService;

    beforeEach(() => {
        service = new RosterService();
        jest.clearAllMocks();
    });

    describe('assignShift', () => {
        it('should assign a shift to an employee', async () => {
            const input = {
                employeeId: 1,
                shiftTemplateId: 1,
                date: new Date('2026-05-01'),
                companyId: 1
            };

            const mockShift = { id: 1, ...input, status: 'SCHEDULED', createdAt: new Date(), updatedAt: new Date() };

            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 1, companyId: 1 });
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
            (prisma.employeeShift.findUnique as jest.Mock).mockResolvedValue(null); // No conflict
            (prisma.employeeShift.create as jest.Mock).mockResolvedValue(mockShift);

            const result = await service.assignShift(input.employeeId, input.shiftTemplateId, input.date, input.companyId);

            expect(prisma.employeeShift.create).toHaveBeenCalledWith({
                data: {
                    employeeId: input.employeeId,
                    shiftTemplateId: input.shiftTemplateId,
                    date: input.date,
                    status: 'SCHEDULED',
                }
            });
            expect(result).toEqual(mockShift);
        });

        it('should throw if shift already exists for date', async () => {
            const input = {
                employeeId: 1,
                shiftTemplateId: 1,
                date: new Date('2026-05-01'),
                companyId: 1
            };

            (prisma.shiftTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 1, companyId: 1 });
            (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
            (prisma.employeeShift.findUnique as jest.Mock).mockResolvedValue({ id: 99 }); // Exists

            await expect(service.assignShift(input.employeeId, input.shiftTemplateId, input.date, input.companyId))
                .rejects.toThrow('Shift already assigned for this date');
        });
    });

    describe('getRoster', () => {
        it('should return shifts within date range', async () => {
            const start = new Date('2026-05-01');
            const end = new Date('2026-05-07');
            const mockShifts = [{ id: 1, date: start }];

            (prisma.employeeShift.findMany as jest.Mock).mockResolvedValue(mockShifts);

            const result = await service.getRoster(1, start, end); // companyId 1

            expect(prisma.employeeShift.findMany).toHaveBeenCalledWith({
                where: {
                    employee: { user: { companyId: 1 } },
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                include: {
                    employee: { select: expect.any(Object) },
                    shiftTemplate: true
                }
            });
            expect(result).toEqual(mockShifts);
        });
    });
});
