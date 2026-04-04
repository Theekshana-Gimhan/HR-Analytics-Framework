import { prisma as mockPrisma } from '../__mocks__/prisma';
import { dashboardService } from './dashboard.service';
import { Prisma } from '@prisma/client';

// Mock prismaClient
jest.mock('../prismaClient', () => ({ prisma: mockPrisma }));

describe('DashboardService Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getLiquidityMetrics', () => {
        const companyId = 1;

        it('should calculate liquidity metrics correctly', async () => {
            // Mock date to a specific day (e.g., 10th of the month)
            const mockDate = new Date('2026-02-10T00:00:00Z');
            jest.useFakeTimers().setSystemTime(mockDate);

            // Mock active employees with salaries
            const mockEmployees = [
                { salary: new Prisma.Decimal(30000) }, // cost = (30000/30*10) * 1.15 = 11500
                { salary: new Prisma.Decimal(60000) }, // cost = (60000/30*10) * 1.15 = 23000
            ];

            (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue(mockEmployees);

            const result = await dashboardService.getLiquidityMetrics(companyId);

            // Expected calculation:
            // Total Basic = 90,000
            // Days Passed = 10
            // Accrued Basic = (90,000 / 30) * 10 = 30,000
            // Statutory (15%) = 30,000 * 0.15 = 4,500
            // Total Cost = 34,500

            expect(mockPrisma.employee.findMany).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    user: { companyId },
                    salary: { gt: 0 },
                },
                select: { salary: true },
            });

            expect(result).toEqual({
                totalCost: 34500,
                breakdown: {
                    accruedBasic: 30000,
                    epfEtf: 4500,
                },
            });

            jest.useRealTimers();
        });

        it('should handle zero employees', async () => {
            (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);

            const result = await dashboardService.getLiquidityMetrics(companyId);

            expect(result).toEqual({
                totalCost: 0,
                breakdown: {
                    accruedBasic: 0,
                    epfEtf: 0,
                },
            });
        });
    });
});
