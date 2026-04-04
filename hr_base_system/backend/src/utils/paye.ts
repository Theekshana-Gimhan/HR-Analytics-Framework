import { Prisma } from '@prisma/client';
import { TAX_SLABS } from '../config/payroll.constants';

const roundToRupee = (value: Prisma.Decimal): Prisma.Decimal => {
  const roundingMode = Prisma.Decimal.ROUND_HALF_UP;
  return value.toDecimalPlaces(0, roundingMode);
};

// Decimal-aware PAYE calculation using TAX_SLABS from config
export const calculatePAYEDecimal = (grossIncome: Prisma.Decimal): Prisma.Decimal => {
  let tax = new Prisma.Decimal('0');
  let remainingIncome = new Prisma.Decimal(grossIncome.toString());

  if (remainingIncome.lte(0)) {
    return new Prisma.Decimal(0);
  }

  for (const slab of TAX_SLABS) {
    if (remainingIncome.lte(new Prisma.Decimal('0'))) break;

    const slabLimit = new Prisma.Decimal(String(slab.limit === Infinity ? Number.MAX_SAFE_INTEGER : slab.limit));
    const taxableAmount = remainingIncome.lt(slabLimit) ? remainingIncome : slabLimit;

    if (slab.rate > 0) {
      tax = tax.plus(taxableAmount.times(new Prisma.Decimal(String(slab.rate))));
    }

    remainingIncome = remainingIncome.minus(taxableAmount);
  }

  // Round to nearest rupee to avoid fractional-cent slab artifacts.
  return roundToRupee(tax);
};

// Number-friendly wrapper for tests and other consumers (monthly input -> monthly tax)
export const calculatePAYE = (grossPay: number): number => {
  if (!Number.isFinite(grossPay) || grossPay <= 0) {
    return 0;
  }

  return calculatePAYEDecimal(new Prisma.Decimal(grossPay)).toNumber();
};
