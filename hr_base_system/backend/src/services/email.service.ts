import nodemailer from 'nodemailer';
import logger from '../utils/logger';

// Check if email is configured
const isEmailConfigured = (): boolean => {
    return !!(process.env.WORKSPACE_EMAIL && process.env.WORKSPACE_SMTP_PASSWORD);
};

// SMTP configuration for Google Workspace
const transporter = nodemailer.createTransport({
    host: 'smtp-relay.gmail.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.WORKSPACE_EMAIL || '',
        pass: process.env.WORKSPACE_SMTP_PASSWORD || '',
    },
});

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

/**
 * Send email via Google Workspace SMTP
 * @param options - Email options (to, subject, html, text)
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
    // Check if email is configured
    if (!isEmailConfigured()) {
        logger.warn('Email service not configured. Skipping email send.', {
            to: options.to,
            subject: options.subject,
            message: 'WORKSPACE_EMAIL or WORKSPACE_SMTP_PASSWORD environment variables are missing. Please configure Google Workspace SMTP to enable email notifications. See docs/WORKSPACE_SMTP_SETUP.md for setup instructions.',
        });
        return; // Silently skip - don't throw error to avoid breaking user flows
    }

    try {
        const info = await transporter.sendMail({
            from: `"Simpala HR" <${process.env.WORKSPACE_EMAIL}>`,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        });

        logger.info('Email sent successfully', {
            messageId: info.messageId,
            to: options.to,
            subject: options.subject,
        });
    } catch (error) {
        logger.error('Email send failed', {
            error: error instanceof Error ? error.message : String(error),
            to: options.to,
            subject: options.subject,
        });
        // Don't throw - log error but don't break the user flow
    }
};

/**
 * Verify SMTP connection
 * Call this during app startup to ensure email is configured correctly
 */
export const verifyEmailConnection = async (): Promise<boolean> => {
    if (!isEmailConfigured()) {
        logger.warn('⚠️  Email service not configured. Email notifications will be disabled.');
        logger.warn('   Configure WORKSPACE_EMAIL and WORKSPACE_SMTP_PASSWORD to enable email.');
        logger.warn('   See docs/WORKSPACE_SMTP_SETUP.md for setup instructions.');
        return false;
    }

    try {
        await transporter.verify();
        logger.info('✅ Email service connected successfully');
        return true;
    } catch (error) {
        logger.error('❌ Email service connection failed', {
            error: error instanceof Error ? error.message : String(error),
        });
        logger.warn('   Email notifications will be disabled until configuration is fixed.');
        return false;
    }
};
