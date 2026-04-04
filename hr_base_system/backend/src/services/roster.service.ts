import { prisma } from '../prismaClient';
import { EmployeeShift } from '@prisma/client';
import { NotFoundError, ConflictError } from '../middleware/error.middleware';

export class RosterService {
    /**
     * Assign a shift to an employee for a specific date
     */
    async assignShift(employeeId: number, shiftTemplateId: number, date: Date, companyId: number): Promise<EmployeeShift> {
        // 1. Verify shift template exists and belongs to company
        const template = await prisma.shiftTemplate.findUnique({
            where: { id: shiftTemplateId }
        });
        if (!template || template.companyId !== companyId) {
            throw new NotFoundError('Shift template not found');
        }

        // 2. Verify employee exists and belongs to company
        const employee = await prisma.employee.findFirst({
            where: { id: employeeId, user: { companyId } }
        });
        if (!employee) {
            throw new NotFoundError('Employee not found');
        }

        // 3. Check for existing shift on this date
        const existing = await prisma.employeeShift.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date
                }
            }
        });

        if (existing) {
            throw new ConflictError('Shift already assigned for this date');
        }

        // 4. Create assignment
        return await prisma.employeeShift.create({
            data: {
                employeeId,
                shiftTemplateId,
                date,
                status: 'SCHEDULED'
            }
        });
    }

    /**
     * Get roster for a date range
     */
    async getRoster(companyId: number, startDate: Date, endDate: Date) {
        return await prisma.employeeShift.findMany({
            where: {
                employee: { user: { companyId } },
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                employee: {
                    select: { id: true, first_name: true, last_name: true }
                },
                shiftTemplate: true
            }
        });
    }
}
