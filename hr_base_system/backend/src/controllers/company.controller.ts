import { Response, NextFunction } from 'express';
import * as companyService from '../services/company.service';
import { BadRequestError } from '../middleware/error.middleware';
import { CustomRequest } from '../middleware/auth.middleware';

export const getSettings = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            throw new BadRequestError('User does not belong to a company');
        }

        const settings = await companyService.getCompanySettings(companyId);

        res.status(200).json({
            status: 'success',
            data: {
                settings,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const updateSettings = async (
    req: CustomRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const companyId = req.user?.companyId;

        if (!companyId) {
            throw new BadRequestError('User does not belong to a company');
        }

        const updatedSettings = await companyService.updateCompanySettings(
            companyId,
            req.body
        );

        res.status(200).json({
            status: 'success',
            data: {
                settings: updatedSettings,
            },
        });
    } catch (err) {
        next(err);
    }
};
