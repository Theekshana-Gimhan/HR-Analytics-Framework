import PDFDocument from 'pdfkit';
import { Company, Employee, Payslip, User } from '@prisma/client';

export type PayslipWithRelations = Payslip & {
  employee: Employee & {
    user: (User & { company: Company | null }) | null;
  };
};

type PDFKitDocument = InstanceType<typeof PDFDocument>;

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPeriod = (month: number, year: number): string => {
  const date = new Date(year, month - 1);
  return date.toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
};

const toNumber = (value: unknown): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const drawKeyValue = (
  doc: PDFKitDocument,
  label: string,
  value: string,
  options?: { underline?: boolean; bold?: boolean; align?: 'left' | 'right' }
) => {
  const { underline = false, bold = false, align = 'left' } = options ?? {};
  if (underline) {
    doc.underline(doc.x, doc.y, doc.page.width - doc.page.margins.left - doc.page.margins.right, 0);
  }
  if (bold) {
    doc.font('Helvetica-Bold');
  } else {
    doc.font('Helvetica');
  }

  const labelText = `${label}`;
  const valueText = `${value}`;

  const valueWidth = doc.widthOfString(valueText);
  const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.text(labelText, { continued: true });

  const xOffset = availableWidth - valueWidth;
  const currentY = doc.y;
  doc.text('', doc.x, currentY);

  const valueX = doc.page.margins.left + xOffset;
  doc.text(valueText, valueX, currentY, { align });

  doc.moveDown(0.4);
  doc.font('Helvetica');
};

export const buildPayslipPdf = (payslip: PayslipWithRelations): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err: Error) => reject(err));

    const employeeName = `${payslip.employee.first_name} ${payslip.employee.last_name}`.trim();
    const companyName = payslip.employee.user?.company?.name ?? 'Simpala HR';
    const period = formatPeriod(payslip.month, payslip.year);

    const grossPay = toNumber(payslip.gross_pay);
    const epfEmployee = toNumber(payslip.epf_employee);
    const epfEmployer = toNumber(payslip.epf_employer);
    const etf = toNumber(payslip.etf);
    const paye = toNumber(payslip.paye);
    const netPay = toNumber(payslip.net_pay);
    const totalDeductions = epfEmployee + paye;
    const totalEmployer = epfEmployer + etf;
    const issuedOn = new Date().toLocaleDateString('en-GB');

    doc.fillColor('#333333');
    doc.font('Helvetica-Bold').fontSize(18).text(companyName, { align: 'center' });
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(14).text('Official Payslip', { align: 'center' });

    doc.moveDown(1);
    doc
      .rect(
        doc.page.margins.left,
        doc.y - 10,
        doc.page.width - doc.page.margins.left - doc.page.margins.right,
        0.5
      )
      .fill('#005b96');
    doc.moveDown(0.5);

    // Employee + payslip meta (two columns)
    const columnWidth = (doc.page.width - doc.page.margins.left - doc.page.margins.right) / 2 - 10;
    doc.fontSize(11).fillColor('#000000');
    const startY = doc.y;

    doc.text(`Employee: ${employeeName}`, { width: columnWidth });
    doc.text(`Position: ${payslip.employee.job_title ?? 'Not set'}`, { width: columnWidth });
    doc.text(`NIC: ${payslip.employee.nic ?? 'N/A'}`, { width: columnWidth });
    doc.text(`Bank: ${payslip.employee.bank_details ?? 'N/A'}`, { width: columnWidth });

    doc.x = doc.page.margins.left + columnWidth + 20;
    doc.y = startY;
    doc.text(`Employee ID: ${payslip.employee.id}`, { width: columnWidth, align: 'right' });
    doc.text(`Period: ${period}`, { width: columnWidth, align: 'right' });
    doc.text(`Issued: ${issuedOn}`, { width: columnWidth, align: 'right' });
    doc.text(`Company: ${companyName}`, { width: columnWidth, align: 'right' });

    doc.moveDown(1.25);

    // Earnings
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f3b73').text('Earnings');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    drawKeyValue(doc, 'Basic / Gross Pay', formatCurrency(grossPay));

    doc.moveDown(0.6);

    // Deductions
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f3b73').text('Deductions');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    drawKeyValue(doc, 'EPF (Employee 8%)', `- ${formatCurrency(epfEmployee)}`);
    drawKeyValue(doc, 'PAYE Tax', `- ${formatCurrency(paye)}`);
    drawKeyValue(doc, 'Total Deductions', `- ${formatCurrency(totalDeductions)}`, { bold: true });

    doc.moveDown(0.6);

    // Employer contributions (for reference)
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f3b73').text('Employer Contributions');
    doc.moveDown(0.25);
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    drawKeyValue(doc, 'EPF (Employer 12%)', formatCurrency(epfEmployer));
    drawKeyValue(doc, 'ETF (3%)', formatCurrency(etf));
    drawKeyValue(doc, 'Total Employer Contribution', formatCurrency(totalEmployer), { bold: true });

    // Summary card
    doc.moveDown(0.75);
    const summaryWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const summaryY = doc.y;
    doc
      .rect(doc.page.margins.left, summaryY, summaryWidth, 90)
      .fillOpacity(0.05)
      .fill('#1f3b73')
      .fillOpacity(1);

    doc.y = summaryY + 12;
    doc.x = doc.page.margins.left + 12;
    doc.font('Helvetica-Bold').fontSize(12).fillColor('#1f3b73').text('Net Pay');
    doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text(formatCurrency(netPay), {
      align: 'right',
      width: summaryWidth - 24,
      lineGap: 4,
    });

    const drawSummaryRow = (label: string, value: string) => {
      const rowY = doc.y + 6;
      doc.font('Helvetica').fontSize(10).fillColor('#444444').text(label, doc.page.margins.left + 12, rowY);
      doc
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#000000')
        .text(value, doc.page.margins.left + 12, rowY, {
          width: summaryWidth - 24,
          align: 'right',
        });
      doc.y = rowY;
    };

    drawSummaryRow('Gross Pay', formatCurrency(grossPay));
    drawSummaryRow('Total Deductions', `- ${formatCurrency(totalDeductions)}`);
    drawSummaryRow('Employer Contributions (ref)', formatCurrency(totalEmployer));
    doc.y += 6;

    doc.moveDown(2.2);
    doc.font('Helvetica').fontSize(9).fillColor('#666666');
    doc.text(
      'This payslip is generated electronically by Simpala HR. Net pay excludes employer contributions. Contact HR for clarifications.'
    );

    doc.end();
  });
};
