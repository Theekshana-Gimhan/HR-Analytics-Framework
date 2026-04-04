import { Response, NextFunction } from 'express';
import { BankFileType } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { CustomRequest } from '../middleware/auth.middleware';
import { isManagerRole } from '../middleware/rbac';
import * as payrollService from '../services/payroll.service';
import * as bankFileService from '../services/bankFile.service';
import logger from '../utils/logger';

export const getPayslips = async (req: CustomRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { year, month, employeeId } = req.query;

    // Build where clause (always tenant-scoped)
    const where: Prisma.PayslipWhereInput = {
      employee: {
        user: {
          companyId: req.user.companyId,
        },
      },
    };

    if (year) {
      where.year = parseInt(year as string, 10);
    }

    if (month) {
      where.month = parseInt(month as string, 10);
    }

    const requestedEmployeeId = employeeId ? parseInt(employeeId as string, 10) : undefined;
    if (requestedEmployeeId !== undefined && (Number.isNaN(requestedEmployeeId) || requestedEmployeeId <= 0)) {
      return res.status(400).json({ message: 'Invalid employeeId' });
    }

    if (!isManagerRole(req.user.role)) {
      // Non-managers can only view their own payslips, regardless of query params
      const employee = await payrollService.getEmployeeByUserId(req.user.id);
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }

      if (requestedEmployeeId && requestedEmployeeId !== employee.id) {
        return res.status(403).json({ message: 'Forbidden: Can only view own payslips' });
      }

      where.employeeId = employee.id;
    } else if (requestedEmployeeId) {
      where.employeeId = requestedEmployeeId;
    }

    const payslips = await payrollService.getPayslips(where);

    logger.info('Payslips retrieved', {
      userId: req.user.id,
      role: req.user.role,
      filters: where,
      count: payslips.length,
    });

    return res.status(200).json(payslips);
  } catch (error) {
    next(error);
  }
};

export const getPayslipById = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payslipId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(payslipId) || payslipId <= 0) {
      return res.status(400).json({ message: 'Invalid payslip id' });
    }

    const payslip = await payrollService.getPayslipById(payslipId, req.user.companyId);
    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    if (!isManagerRole(req.user.role)) {
      const employee = await payrollService.getEmployeeByUserId(req.user.id);
      if (!employee || employee.id !== payslip.employeeId) {
        return res.status(403).json({ message: 'Forbidden: Can only view own payslips' });
      }
    }

    return res.status(200).json(payslip);
  } catch (error) {
    next(error);
  }
};

export const generatePayslip = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Enforce company ownership of target employee
    const targetEmployee = await payrollService.getEmployeeById(req.body.employeeId);
    if (!targetEmployee || targetEmployee.user.companyId !== req.user.companyId) {
      return res.status(404).json({ message: 'Employee not found' });
    }

    const payslip = await payrollService.generatePayslip(req.body);
    logger.info(
      `Payslip generated successfully: Employee ${req.body.employeeId}, Month ${req.body.month}/${req.body.year}`
    );
    res.status(201).json(payslip);
  } catch (error) {
    next(error);
  }
};

export const runPayroll = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { month, year, employeeIds } = req.body as { month: number; year: number; employeeIds?: number[] };

    const result = await payrollService.runPayroll({
      companyId: req.user.companyId,
      month,
      year,
      employeeIds,
      requestedBy: req.user.id,
    });

    logger.info('Payroll run completed', {
      userId: req.user.id,
      companyId: req.user.companyId,
      month,
      year,
      created: result.created.length,
      skipped: result.skipped.length,
    });

    return res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const downloadPayslipPdf = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payslipId = Number.parseInt(req.params.id, 10);
    if (Number.isNaN(payslipId) || payslipId <= 0) {
      return res.status(400).json({ message: 'Invalid payslip id' });
    }

    const result = await payrollService.generatePayslipPdf(payslipId);
    if (!result) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    const { payslip, pdfBuffer } = result;

    // Enforce tenant isolation for admin/owner as well
    if (payslip.employee?.user?.companyId !== req.user.companyId) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    // If user is not a manager, verify they own this payslip
    if (!isManagerRole(req.user.role)) {
      const employee = await payrollService.getEmployeeByUserId(req.user.id);
      if (employee?.id !== payslip.employeeId) {
        return res.status(403).json({ message: 'Forbidden: Can only download own payslips' });
      }
    }
    const safeEmployeeId = payslip.employeeId;
    const filename = `payslip_${safeEmployeeId}_${payslip.month}_${payslip.year}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length.toString());

    logger.info(`Payslip PDF generated: ID ${payslip.id} for employee ${payslip.employeeId}`);
    return res.status(200).send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

export const generateBankFileExport = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const { month, year, fileType, bankCodes, narration } = req.body as {
      month: number;
      year: number;
      fileType: BankFileType;
      bankCodes?: string[];
      narration?: string;
    };

    const { fileName, csvBuffer, exportRecord } = await bankFileService.generateBankFile({
      userId: req.user.id,
      month,
      year,
      fileType,
      bankCodes,
      narration,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', csvBuffer.length.toString());
    res.setHeader('X-Export-Id', exportRecord.id.toString());
    res.setHeader('X-Total-Records', exportRecord.totalRecords.toString());
    res.setHeader('X-Total-Amount', exportRecord.totalAmount.toString());

    logger.info('Bank file export returned to client', {
      exportId: exportRecord.id,
      userId: req.user.id,
      companyId: exportRecord.companyId,
      totalRecords: exportRecord.totalRecords,
      fileName,
    });

    return res.status(200).send(csvBuffer);
  } catch (error) {
    next(error);
  }
};

export const getPayrollStatistics = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const stats = await payrollService.getPayrollStatistics({
      month: parseInt(month as string, 10),
      year: parseInt(year as string, 10),
      companyId: req.user.companyId,
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
};
