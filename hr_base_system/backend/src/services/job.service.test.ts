
import { JobService } from './job.service';
import { prisma } from '../prismaClient';
import { ShiftStatus } from '@prisma/client';

// Mock Prisma
jest.mock('../prismaClient', () => ({
    prisma: {
        employeeShift: {
            findMany: jest.fn(),
            update: jest.fn(),
        },
        attendanceRecord: {
            findFirst: jest.fn(),
        },
    },
}));

// Mock Logger
jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
}));

describe('JobService', () => {
    let jobService: JobService;

    beforeEach(() => {
        jobService = new JobService();
        jest.clearAllMocks();
    });

    describe('scanGhosts', () => {
        it('should mark scheduled shifts as ABSENT if end time has passed and no attendance record exists', async () => {
            // Arrange
            // Mock current time: 10:00 AM
            jest.useFakeTimers().setSystemTime(new Date('2023-10-27T10:00:00Z'));

            const shiftDate = new Date('2023-10-27T00:00:00Z');

            const mockShifts = [
                {
                    id: 1,
                    employeeId: 101,
                    date: shiftDate,
                    status: 'SCHEDULED',
                    shiftTemplate: {
                        endTime: '09:00', // Ended at 9:00 AM (1 hour ago)
                    },
                },
            ];

            (prisma.employeeShift.findMany as jest.Mock).mockResolvedValue(mockShifts);
            (prisma.attendanceRecord.findFirst as jest.Mock).mockResolvedValue(null); // No attendance

            // Act
            const result = await jobService.scanGhosts();

            // Assert
            expect(result.scanned).toBe(1);
            expect(result.markedAbsent).toBe(1);
            expect(prisma.employeeShift.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: {
                    status: ShiftStatus.ABSENT,
                    notes: expect.stringContaining('Auto-marked as Absent')
                },
            });
        });

        it('should mark scheduled shifts as COMPLETED if end time has passed and attendance record EXISTS', async () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date('2023-10-27T10:00:00Z'));
            const shiftDate = new Date('2023-10-27T00:00:00Z');

            const mockShifts = [
                {
                    id: 2,
                    employeeId: 102,
                    date: shiftDate,
                    status: 'SCHEDULED',
                    shiftTemplate: {
                        endTime: '09:00',
                    },
                },
            ];

            (prisma.employeeShift.findMany as jest.Mock).mockResolvedValue(mockShifts);
            (prisma.attendanceRecord.findFirst as jest.Mock).mockResolvedValue({ id: 50 }); // Attendance exists

            // Act
            const result = await jobService.scanGhosts();

            // Assert
            expect(result.scanned).toBe(1);
            expect(result.markedCompleted).toBe(1);
            expect(prisma.employeeShift.update).toHaveBeenCalledWith({
                where: { id: 2 },
                data: {
                    status: ShiftStatus.COMPLETED,
                    notes: expect.stringContaining('Auto-marked as Completed')
                },
            });
        });

        it('should IGNORE shifts that have not ended yet (with buffer)', async () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date('2023-10-27T10:00:00Z'));
            const shiftDate = new Date('2023-10-27T00:00:00Z');

            const mockShifts = [
                {
                    id: 3,
                    employeeId: 103,
                    date: shiftDate,
                    status: 'SCHEDULED',
                    shiftTemplate: {
                        endTime: '11:00', // Ends in 1 hour
                    },
                },
            ];

            (prisma.employeeShift.findMany as jest.Mock).mockResolvedValue(mockShifts);

            // Act
            const result = await jobService.scanGhosts();

            // Assert
            expect(result.scanned).toBe(1); // It scanned it
            expect(result.markedAbsent).toBe(0);
            expect(result.markedCompleted).toBe(0);
            expect(prisma.employeeShift.update).not.toHaveBeenCalled();
        });

        it('should IGNORE shifts strictly within the 30min buffer', async () => {
            // Arrange
            jest.useFakeTimers().setSystemTime(new Date('2023-10-27T10:00:00Z'));
            const shiftDate = new Date('2023-10-27T00:00:00Z');

            const mockShifts = [
                {
                    id: 4,
                    employeeId: 104,
                    date: shiftDate,
                    status: 'SCHEDULED',
                    shiftTemplate: {
                        endTime: '09:35', // Ended 25 mins ago. Buffer is 30 mins. Should NOT process yet.
                    },
                },
            ];

            (prisma.employeeShift.findMany as jest.Mock).mockResolvedValue(mockShifts);

            // Act
            const result = await jobService.scanGhosts();

            // Assert
            expect(result.scanned).toBe(1);
            expect(prisma.employeeShift.update).not.toHaveBeenCalled();
        });

        afterAll(() => {
            jest.useRealTimers();
        });
    });
});
