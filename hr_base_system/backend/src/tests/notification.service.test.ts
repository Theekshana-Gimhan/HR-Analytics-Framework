import { NotificationService } from '../services/notification.service';
import { prismaMock } from './test-helpers';
import { sendEmail } from '../services/email.service';
import { ExpiryDocumentStatus } from '@prisma/client';

// Mock dependencies
jest.mock('../services/email.service', () => ({
    sendEmail: jest.fn(),
}));

jest.mock('../prismaClient', () => ({
    prisma: jest.requireActual('./test-helpers').prismaMock,
}));

jest.mock('../utils/logger', () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
}));

describe('NotificationService', () => {
    let notificationService: NotificationService;

    beforeEach(() => {
        notificationService = new NotificationService();
        jest.clearAllMocks();
    });

    describe('checkDocumentExpiry', () => {
        it('should identify documents expiring soon and send emails', async () => {
            const today = new Date();
            const expiryDate = new Date(today);
            expiryDate.setDate(today.getDate() + 20); // 20 days from now (default alert is 30)

            const mockEmployee = {
                id: 1,
                first_name: 'John',
                user: { email: 'john@example.com' },
            };

            const mockDoc = {
                id: 101,
                name: 'Driver License',
                expiryDate: expiryDate,
                alertDaysBefore: 30,
                status: ExpiryDocumentStatus.VALID,
                employee: mockEmployee,
                // Add missing required fields for type safety (or cast as any)
                employeeId: 1,
                documentId: null,
                documentType: 'LICENSE',
                issueDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                document_path: 'path/to/doc',
                is_verified: true,
                rejection_reason: null
            };

            // Mock prisma findMany to return our mock doc
            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([mockDoc]);
            // Second findMany call (expired check) returns empty
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([]);

            // Mock update
            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.update.mockResolvedValue({});

            const summary = await notificationService.checkDocumentExpiry();

            expect(summary.expiringFound).toBe(1);
            expect(summary.emailsSent).toBe(1);
            expect(prismaMock.expiryDocument.update).toHaveBeenCalledWith({
                where: { id: 101 },
                data: { status: ExpiryDocumentStatus.EXPIRING_SOON },
            });
            expect(sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'john@example.com',
                    subject: expect.stringContaining('Expiring Soon'),
                })
            );
        });

        it('should identify already expired documents and send emails', async () => {
            const today = new Date();
            const expiryDate = new Date(today);
            expiryDate.setDate(today.getDate() - 1); // Expired yesterday

            const mockEmployee = {
                id: 2,
                first_name: 'Jane',
                user: { email: 'jane@example.com' },
            };

            const mockDoc = {
                id: 102,
                name: 'Visa',
                expiryDate: expiryDate,
                alertDaysBefore: 30,
                status: ExpiryDocumentStatus.VALID, // Still marked VALID but actually expired
                employee: mockEmployee,
                employeeId: 2,
                documentId: null,
                documentType: 'VISA',
                issueDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                document_path: 'path/to/doc',
                is_verified: true,
                rejection_reason: null
            };

            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([mockDoc]);
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([]);
            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.update.mockResolvedValue({});

            const summary = await notificationService.checkDocumentExpiry();

            expect(summary.expiredFound).toBe(1);
            expect(summary.emailsSent).toBe(1);
            expect(prismaMock.expiryDocument.update).toHaveBeenCalledWith({
                where: { id: 102 },
                data: { status: ExpiryDocumentStatus.EXPIRED },
            });
            expect(sendEmail).toHaveBeenCalledWith(
                expect.objectContaining({
                    to: 'jane@example.com',
                    subject: expect.stringContaining('Has Expired'),
                })
            );
        });

        it('should transition EXPIRING_SOON to EXPIRED if date passes', async () => {
            const today = new Date();
            const expiryDate = new Date(today);
            expiryDate.setDate(today.getDate() - 1);

            const mockDoc = {
                id: 103,
                name: 'Passport',
                expiryDate: expiryDate,
                status: ExpiryDocumentStatus.EXPIRING_SOON,
                employee: { id: 3, first_name: 'Bob', user: { email: 'bob@example.com' } },
                employeeId: 3,
                alertDaysBefore: 30,
                documentId: null,
                documentType: 'PASSPORT',
                issueDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                document_path: 'path/to/doc',
                is_verified: true,
                rejection_reason: null
            };

            // First call (VALID docs) returns nothing
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([]);
            // Second call (EXPIRING_SOON docs) returns our doc
            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([mockDoc]);
            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.update.mockResolvedValue({});

            const summary = await notificationService.checkDocumentExpiry();

            expect(summary.expiredFound).toBe(1);
            expect(prismaMock.expiryDocument.update).toHaveBeenCalledWith({
                where: { id: 103 },
                data: { status: ExpiryDocumentStatus.EXPIRED },
            });
        });

        it('should ignore documents not yet in alert window', async () => {
            const today = new Date();
            const expiryDate = new Date(today);
            expiryDate.setDate(today.getDate() + 40); // 40 days away, alert is 30

            const mockDoc = {
                id: 104,
                expiryDate: expiryDate,
                alertDaysBefore: 30,
                status: ExpiryDocumentStatus.VALID,
                employee: { id: 4 },
                employeeId: 4,
                name: 'Future Doc',
                documentId: null,
                documentType: 'OTHER',
                issueDate: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
                document_path: 'path/to/doc',
                is_verified: true,
                rejection_reason: null
            };

            // @ts-expect-error - type mismatch in test mock setup
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([mockDoc]);
            prismaMock.expiryDocument.findMany.mockResolvedValueOnce([]);

            const summary = await notificationService.checkDocumentExpiry();

            expect(summary.expiringFound).toBe(0);
            expect(summary.emailsSent).toBe(0);
            expect(prismaMock.expiryDocument.update).not.toHaveBeenCalled();
        });
    });
});
