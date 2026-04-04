
import { Request, Response, NextFunction } from 'express';
import { RosterService } from '../services/roster.service';
import { CustomRequest } from '../middleware/auth.middleware';

const rosterService = new RosterService();

export const assignShift = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as CustomRequest).user?.companyId;
        if (!companyId) return res.status(401).json({ message: 'Unauthorized' });

        const { employeeId, shiftTemplateId, date } = req.body;

        // Ensure date is parsed correctly
        const shiftDate = new Date(date);

        const assignment = await rosterService.assignShift(
            Number(employeeId),
            Number(shiftTemplateId),
            shiftDate,
            companyId
        );
        res.status(201).json(assignment);
    } catch (error) {
        next(error);
    }
};

export const getRoster = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as CustomRequest).user?.companyId;
        if (!companyId) return res.status(401).json({ message: 'Unauthorized' });

        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'startDate and endDate are required' });
        }

        const roster = await rosterService.getRoster(
            companyId,
            new Date(startDate as string),
            new Date(endDate as string)
        );
        res.json(roster);
    } catch (error) {
        next(error);
    }
};
