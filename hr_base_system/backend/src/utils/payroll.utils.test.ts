import { calculatePAYE } from './payroll.utils';

describe('calculatePAYE', () => {
  it('should return 0 for a gross pay of 0', () => {
    expect(calculatePAYE(0)).toBe(0);
  });

  it('should return 0 below the relief threshold', () => {
    expect(calculatePAYE(50000)).toBe(0);
    expect(calculatePAYE(99999)).toBe(0);
    expect(calculatePAYE(100000)).toBe(0);
  });

  it('should round to nearest rupee at slab boundaries', () => {
    // 100,000 relief + 41,667 @ 6% = 2,500.02 -> 2,500
    expect(calculatePAYE(141667)).toBe(2500);

    // 100,000 relief + (41,667 @ 6%) + (41,667 @ 12%) = 7,500.06 -> 7,500
    expect(calculatePAYE(183334)).toBe(7500);
  });

  it('should calculate the correct tax for higher slabs', () => {
    expect(calculatePAYE(125000)).toBe(1500);
    expect(calculatePAYE(200000)).toBe(10500);
  });
});
