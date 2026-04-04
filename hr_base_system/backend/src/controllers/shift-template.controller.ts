
import { Request, Response, NextFunction } from 'express';
import { ShiftTemplateService } from '../services/shift-template.service';
import { CustomRequest } from '../middleware/auth.middleware';

const shiftTemplateService = new ShiftTemplateService();

export const createShiftTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as CustomRequest).user?.companyId;
        if (!companyId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const template = await shiftTemplateService.createShiftTemplate({
            ...req.body,
            companyId,
        });

        res.status(201).json(template);
    } catch (error) {
        next(error);
    }
};

export const getShiftTemplates = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as CustomRequest).user?.companyId;
        if (!companyId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const templates = await shiftTemplateService.getShiftTemplates(companyId);
        res.json(templates);
    } catch (error) {
        next(error);
    }
};

export const updateShiftTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as CustomRequest).user?.companyId;
        if (!companyId) return res.status(401).json({ message: 'Unauthorized' });

        const id = Number(req.params.id);
        const template = await shiftTemplateService.updateShiftTemplate(id, companyId, req.body);
        res.json(template);
    } catch (error) {
        next(error);
    }
};

export const deleteShiftTemplate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const companyId = (req as CustomRequest).user?.companyId;
        if (!companyId) return res.status(401).json({ message: 'Unauthorized' });

        const id = Number(req.params.id);
        await shiftTemplateService.deleteShiftTemplate(id, companyId);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};
