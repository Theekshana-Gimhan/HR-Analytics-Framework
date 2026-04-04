import { prisma as mockPrisma } from '../__mocks__/prisma';
jest.mock('../prismaClient', () => ({ prisma: mockPrisma }));
import { bulkUploadAttendance } from './attendance.service';
// use mockPrisma for assertions

describe('bulkUploadAttendance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock employee lookup to return a valid employee
    (mockPrisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: 1 });
    // Mock existing attendance check to return null (no duplicate)
    (mockPrisma.attendanceRecord.findFirst as jest.Mock).mockResolvedValue(null);
    // Mock create to succeed
    (mockPrisma.attendanceRecord.create as jest.Mock).mockResolvedValue({
      id: 1,
      employeeId: 1,
      date: new Date('2025-09-24'),
      status: 'PRESENT',
    });
  });

  it('should parse the CSV and create attendance records', async () => {
    const csvData = 'employeeId,date,status\n1,2025-09-24,PRESENT';
    const buffer = Buffer.from(csvData);

    const result = await bulkUploadAttendance(buffer, 1); // Pass companyId

    expect(mockPrisma.attendanceRecord.create).toHaveBeenCalledWith({
      data: {
        employee: { connect: { id: 1 } },
        date: expect.any(Date),
        status: 'PRESENT',
      },
    });
    expect(result.imported).toBe(1);
  });
});
