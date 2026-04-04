import { sendEmail } from './email.service';
import { documentExpiringTemplate, documentExpiredTemplate } from '../templates/email-templates';
import logger from '../utils/logger';

import { prisma } from '../prismaClient';

export class NotificationService {
    /**
     * Check for expiring and expired documents and send notifications.
     * @returns Summary of actions taken.
     */
    async checkDocumentExpiry(): Promise<{
        expiringFound: number;
        expiredFound: number;
        emailsSent: number;
        errors: number;
    }> {
        logger.info('Starting document expiry check...');

        const summary = {
            expiringFound: 0,
            expiredFound: 0,
            emailsSent: 0,
            errors: 0,
        };

        try {
            // 1. Check for documents expiring soon (within alertDaysBefore)
            // We look for VALID documents where expiryDate <= now + alertDaysBefore
            const today = new Date();

            // Get all valid expiry documents to filter in memory or advanced query
            // For simplicity and correct date math, let's fetch candidates and filter
            // A more optimized SQL approach would be better for large datasets
            const validDocuments = await prisma.expiryDocument.findMany({
                where: {
                    status: 'VALID',
                },
                include: {
                    employee: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            for (const doc of validDocuments) {
                const expiryDate = new Date(doc.expiryDate);
                const alertDate = new Date(expiryDate);
                alertDate.setDate(alertDate.getDate() - doc.alertDaysBefore);

                // Check if today is past the alert date (and still valid)
                // We also check if it's already expired to update status correctly

                if (expiryDate < today) {
                    // Already expired, but marked as VALID. Update to EXPIRED and notify.
                    await this.handleExpiredDocument(doc, summary);
                } else if (today >= alertDate) {
                    // Expiring soon. Update to EXPIRING_SOON and notify.
                    await this.handleExpiringDocument(doc, summary);
                }
            }

            // 2. Check for EXPIRING_SOON documents that have now expired
            const expiringDocuments = await prisma.expiryDocument.findMany({
                where: {
                    status: 'EXPIRING_SOON',
                    expiryDate: {
                        lt: today
                    }
                },
                include: {
                    employee: {
                        include: {
                            user: true
                        }
                    }
                }
            });

            for (const doc of expiringDocuments) {
                await this.handleExpiredDocument(doc, summary);
            }

            logger.info('Document expiry check completed.', summary);
            return summary;

        } catch (error) {
            logger.error('Error during document expiry check', error);
            throw error;
        }
    }

    private async handleExpiringDocument(doc: { id: number; name: string; expiryDate: Date; employee: { id: number; first_name: string; user?: { email: string } } }, summary: { expiringFound: number; emailsSent: number; errors: number }) {
        try {
            summary.expiringFound++;

            // Update status
            await prisma.expiryDocument.update({
                where: { id: doc.id },
                data: { status: 'EXPIRING_SOON' }
            });

            // Send email if user has email
            if (doc.employee.user?.email) {
                await sendEmail({
                    to: doc.employee.user.email,
                    subject: `Action Required: ${doc.name} Expiring Soon`,
                    html: documentExpiringTemplate(
                        doc.employee.first_name,
                        doc.name,
                        doc.expiryDate.toISOString().split('T')[0] // Format YYYY-MM-DD
                    )
                });
                summary.emailsSent++;
                logger.info(`Sent expiry warning for document ${doc.id} to ${doc.employee.user.email}`);
            } else {
                logger.warn(`No email found for employee ${doc.employee.id}. Skipping notification.`);
            }

        } catch (error) {
            logger.error(`Failed to handle expiring document ${doc.id}`, error);
            summary.errors++;
        }
    }

    private async handleExpiredDocument(doc: { id: number; name: string; expiryDate: Date; employee: { id: number; first_name: string; user?: { email: string } } }, summary: { expiredFound: number; emailsSent: number; errors: number }) {
        try {
            summary.expiredFound++;

            // Update status
            await prisma.expiryDocument.update({
                where: { id: doc.id },
                data: { status: 'EXPIRED' }
            });

            // Send email
            if (doc.employee.user?.email) {
                await sendEmail({
                    to: doc.employee.user.email,
                    subject: `Urgent: ${doc.name} Has Expired`,
                    html: documentExpiredTemplate(
                        doc.employee.first_name,
                        doc.name,
                        doc.expiryDate.toISOString().split('T')[0]
                    )
                });
                summary.emailsSent++;
                logger.info(`Sent expired notification for document ${doc.id} to ${doc.employee.user.email}`);
            } else {
                logger.warn(`No email found for employee ${doc.employee.id}. Skipping notification.`);
            }

        } catch (error) {
            logger.error(`Failed to handle expired document ${doc.id}`, error);
            summary.errors++;
        }
    }
}

export const notificationService = new NotificationService();
