
import { Request, Response, NextFunction } from 'express';
import { notificationService } from '../services/notification.service';
import { jobService } from '../services/job.service';
import logger from '../utils/logger';

export const checkDocumentExpiry = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Basic security check: verify secret header
        const jobSecret = process.env.JOB_SECRET || 'dev-secret';
        if (req.headers['x-job-secret'] !== jobSecret) {
            logger.warn('Unauthorized attempt to trigger job', { ip: req.ip });
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const summary = await notificationService.checkDocumentExpiry();

        res.json({
            message: 'Document expiry check completed',
            summary
        });
    } catch (error) {
        next(error);
    }
};

export const scanGhosts = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Basic security check: verify secret header
        const jobSecret = process.env.JOB_SECRET || 'dev-secret';
        if (req.headers['x-job-secret'] !== jobSecret) {
            logger.warn('Unauthorized attempt to trigger scanGhosts', { ip: req.ip });
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const summary = await jobService.scanGhosts();

        res.json({
            message: 'Ghost scan completed',
            summary
        });
    } catch (error) {
        next(error);
    }
};
