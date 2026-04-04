import { EmployeeShift, ShiftTemplate } from './api';
import { differenceInHours, parseISO, setHours, setMinutes } from 'date-fns';

export interface ValidationResult {
    valid: boolean;
    message?: string;
    type?: 'warning' | 'error';
}

/**
 * Checks if there is enough rest time between the previous shift and the new shift.
 * Minimum rest time is considered 11 hours by default.
 */
export const checkRestViolation = (
    previousShift: EmployeeShift | undefined,
    newShiftDate: string,
    newTemplate: ShiftTemplate
): ValidationResult => {
    if (!previousShift || !previousShift.shiftTemplate) return { valid: true };

    // Calculate previous shift end time
    const prevShiftStart = parseISO(previousShift.date);
    const [prevStartHour] = previousShift.shiftTemplate.startTime.split(':').map(Number);
    const [prevEndHour, prevEndMinute] = previousShift.shiftTemplate.endTime.split(':').map(Number);

    let prevEndTime = setMinutes(setHours(prevShiftStart, prevEndHour), prevEndMinute);

    // Handle overnight shifts for previous shift (if end time < start time)
    if (prevEndHour < prevStartHour) {
        prevEndTime = new Date(prevEndTime.getTime() + 24 * 60 * 60 * 1000);
    }

    // Calculate new shift start time
    const newShiftDateObj = parseISO(newShiftDate);
    const [newStartHour, newStartMinute] = newTemplate.startTime.split(':').map(Number);
    const newStartTime = setMinutes(setHours(newShiftDateObj, newStartHour), newStartMinute);

    const hoursDiff = differenceInHours(newStartTime, prevEndTime);

    // Only check if new shift is actually after previous shift
    if (newStartTime > prevEndTime && hoursDiff < 11) {
        return {
            valid: false,
            message: `Rest Violation: Only ${hoursDiff} hours between shifts. Recommended: 11h.`,
            type: 'warning'
        };
    }

    return { valid: true };
};
