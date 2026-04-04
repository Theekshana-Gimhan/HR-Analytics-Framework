// Minimal non-conflicting shim for @simpala/types
declare module '@simpala/types' {
    export type BalanceWithLeaveType = {
        id: number;
        employeeId: number;
        leaveTypeId: number;
        accrued: any;
        used: any;
        carriedForward: any;
        lastAccruedAt: Date | null;
        leaveType: {
            id: number;
            name: string;
            requiresAnniversary: boolean;
        };
    };

    export type CreateLeaveTypeData = {
        name: string;
        default_balance: number;
        companyId: number;
        requires_anniversary?: boolean;
    };

    export type ApplyForLeaveData = {
        leaveTypeId: number;
        start_date: string;
        end_date: string;
        reason?: string;
    };
}
