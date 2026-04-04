import { prisma as mockPrisma } from '../__mocks__/prisma';
import { Prisma } from '@prisma/client';

// Mock prismaClient
jest.mock('../prismaClient', () => ({ prisma: mockPrisma }));

import { updateEmployee, searchEmployees } from './employee.service';

describe('EmployeeService Unit Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updateEmployee', () => {
        const employeeId = 1;

        it('should update basic fields correctly', async () => {
            const updates = {
                first_name: 'Jane',
                last_name: 'Doe',
                job_title: 'Senior Developer'
            };

            await updateEmployee(employeeId, updates);

            expect(mockPrisma.employee.update).toHaveBeenCalledWith({
                where: { id: employeeId },
                data: expect.objectContaining({
                    first_name: 'Jane',
                    last_name: 'Doe',
                    job_title: 'Senior Developer'
                })
            });
        });

        it('should map snake_case fields to camelCase', async () => {
            const updates = {
                employment_start_date: '2023-01-01',
                employment_status: 'ACTIVE'
            };

            await updateEmployee(employeeId, updates);

            expect(mockPrisma.employee.update).toHaveBeenCalledWith({
                where: { id: employeeId },
                data: expect.objectContaining({
                    employmentStartDate: new Date('2023-01-01'),
                    employmentStatus: 'ACTIVE'
                })
            });
        });

        it('should handle Decimal fields correctly', async () => {
            const updates = {
                salary: 50000,
                allowances: 5000
            };

            await updateEmployee(employeeId, updates);

            expect(mockPrisma.employee.update).toHaveBeenCalledWith({
                where: { id: employeeId },
                data: expect.objectContaining({
                    salary: new Prisma.Decimal(50000),
                    allowances: new Prisma.Decimal(5000)
                })
            });
        });

        it('should handle bank fields and construct bank_details', async () => {
            const updates = {
                bank_name: 'Test Bank',
                account_number: '123456'
            };

            // Mock findUnique to return existing bank info
            (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
                bank_name: 'Old Bank',
                bank_branch: 'Old Branch',
                account_number: '000000',
                account_holder_name: 'Old Name'
            });

            await updateEmployee(employeeId, updates);

            expect(mockPrisma.employee.findUnique).toHaveBeenCalledWith({
                where: { id: employeeId },
                select: {
                    bank_name: true,
                    bank_branch: true,
                    account_number: true,
                    account_holder_name: true
                }
            });

            expect(mockPrisma.employee.update).toHaveBeenCalledWith({
                where: { id: employeeId },
                data: expect.objectContaining({
                    bank_name: 'Test Bank',
                    account_number: '123456',
                    bank_details: expect.stringContaining('Test Bank')
                })
            });
        });
    });

    describe('searchEmployees', () => {
        const companyId = 1;

        it('should construct the search query correctly', async () => {
            const query = 'John';

            (mockPrisma.employee.findMany as jest.Mock).mockResolvedValue([]);
            (mockPrisma.employee.count as jest.Mock).mockResolvedValue(0);

            await searchEmployees(query, 1, 20, companyId);

            expect(mockPrisma.employee.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    AND: [
                        { isActive: true, user: { companyId } },
                        {
                            OR: [
                                { first_name: { contains: query, mode: 'insensitive' } },
                                { last_name: { contains: query, mode: 'insensitive' } },
                                { nic: { contains: query, mode: 'insensitive' } },
                                { job_title: { contains: query, mode: 'insensitive' } },
                            ]
                        }
                    ]
                }
            }));
        });
    });
});
