
import { prisma } from '../prismaClient';
import { ShiftStatus } from '@prisma/client';
import logger from '../utils/logger';

export interface GhostScanResult {
    scanned: number;
    markedAbsent: number;
    markedCompleted: number;
    errors: number;
}

export class JobService {
    /**
     * Scans for "Ghost Employees" - scheduled shifts where the employee did not clock in.
     * Logic:
     * 1. Find all `SCHEDULED` shifts for Today and Yesterday.
     * 2. Calculate shift end time + 30 mins buffer.
     * 3. If current time > buffered end time:
     * 4. Check if AttendanceRecord exists for that employee/date.
     * 5. If NO attendance -> Update shift to `ABSENT`.
     * 6. If YES attendance -> Update shift to `COMPLETED`.
     */
    async scanGhosts(): Promise<GhostScanResult> {
        const result: GhostScanResult = {
            scanned: 0,
            markedAbsent: 0,
            markedCompleted: 0,
            errors: 0,
        };

        try {
            const now = new Date();
            // Look back 2 days to catch yesterday's shifts that might have ended late or overnight
            const twoDaysAgo = new Date(now);
            twoDaysAgo.setUTCDate(twoDaysAgo.getDate() - 2);
            twoDaysAgo.setUTCHours(0, 0, 0, 0);

            const today = new Date(now);
            today.setUTCHours(23, 59, 59, 999);

            // 1. Find candidate shifts
            // We need to fetch shifts that are SCHEDULED and within the date range
            const shifts = await prisma.employeeShift.findMany({
                where: {
                    status: ShiftStatus.SCHEDULED,
                    date: {
                        gte: twoDaysAgo,
                        lte: today,
                    },
                },
                include: {
                    shiftTemplate: true,
                },
            });

            result.scanned = shifts.length;
            logger.info(`ScanGhosts: Found ${shifts.length} scheduled shifts to check.`);

            for (const shift of shifts) {
                try {
                    if (!shift.shiftTemplate || !shift.shiftTemplate.endTime) {
                        continue;
                    }

                    // 2. Calculate Shift End Time
                    // Parse HH:mm from shiftTemplate
                    const [hours, minutes] = shift.shiftTemplate.endTime.split(':').map(Number);

                    // Construct absolute end time based on shift date
                    // Assumption: shift.date is midnight UTC of the shift day
                    const shiftEndTime = new Date(shift.date);
                    shiftEndTime.setUTCHours(hours, minutes, 0, 0);

                    // Add 30 mins buffer
                    // 30 * 60 * 1000 = 1800000 ms
                    const checkTime = new Date(shiftEndTime.getTime() + 1800000);

                    // 3. Check if time has passed
                    if (now > checkTime) {
                        // Shift has ended + buffer. Check existence of attendance.

                        // Define day range for attendance check (UTC day)
                        const startOfDay = new Date(shift.date);
                        startOfDay.setUTCHours(0, 0, 0, 0);

                        const endOfDay = new Date(shift.date);
                        endOfDay.setUTCHours(23, 59, 59, 999);

                        const attendance = await prisma.attendanceRecord.findFirst({
                            where: {
                                employeeId: shift.employeeId,
                                date: {
                                    gte: startOfDay,
                                    lte: endOfDay,
                                },
                            },
                        });

                        if (attendance) {
                            // 6. Mark COMPLETED - Employee was present
                            await prisma.employeeShift.update({
                                where: { id: shift.id },
                                data: {
                                    status: ShiftStatus.COMPLETED,
                                    notes: shift.notes ? `${shift.notes}\n[Auto-marked as Completed]` : '[Auto-marked as Completed]',
                                },
                            });
                            result.markedCompleted++;
                        } else {
                            // 5. Mark ABSENT - Ghost Employee
                            await prisma.employeeShift.update({
                                where: { id: shift.id },
                                data: {
                                    status: ShiftStatus.ABSENT,
                                    notes: shift.notes ? `${shift.notes}\n[Auto-marked as Absent]` : '[Auto-marked as Absent]',
                                },
                            });
                            result.markedAbsent++;
                        }
                    }
                } catch (err: unknown) {
                    logger.error(`ScanGhosts: Error processing shift ${shift.id}`, err instanceof Error ? err : new Error(String(err)));
                    result.errors++;
                }
            }

            logger.info('ScanGhosts: Completed run', result);
            return result;

        } catch (error: unknown) {
            logger.error('ScanGhosts: Critical failure', error instanceof Error ? error : new Error(String(error)));
            throw error;
        }
    }
}

export const jobService = new JobService();
