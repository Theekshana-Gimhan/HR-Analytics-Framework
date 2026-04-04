export const PAYROLL_CONSTANTS = {
    EPF_EMPLOYEE_RATE: 0.08,
    EPF_EMPLOYER_RATE: 0.12,
    ETF_EMPLOYER_RATE: 0.03,

    // Standard divisor for daily rate calculation (Fixed monthly salary)
    DAYS_IN_MONTH_FOR_DAILY_RATE: 30,
};

// Sri Lanka APIT (Advance Personal Income Tax) Slabs - 2024/2025
// First 100,000 is tax free (Relief)
// Cumulative calculation approach
export const TAX_SLABS = [
    { limit: 100000, rate: 0.00 }, // Relief
    { limit: 41667, rate: 0.06 },  // Next 41,667 @ 6%
    { limit: 41667, rate: 0.12 },  // Next 41,667 @ 12%
    { limit: 41667, rate: 0.18 },  // Next 41,667 @ 18%
    { limit: 41667, rate: 0.24 },  // Next 41,667 @ 24%
    { limit: 41667, rate: 0.30 },  // Next 41,667 @ 30%
    { limit: Infinity, rate: 0.36 }, // Balance @ 36%
];
