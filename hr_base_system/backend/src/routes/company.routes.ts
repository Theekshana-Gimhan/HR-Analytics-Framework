import express from 'express';
import * as companyController from '../controllers/company.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { updateCompanySchema } from '../schemas/company.schema';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';

const router = express.Router();

router.use(authenticate);

router.get(
    '/settings',
    checkPermission(Permission.COMPANY_VIEW),
    companyController.getSettings
);

router.put(
    '/settings',
    checkPermission(Permission.COMPANY_EDIT),
    validateRequest(updateCompanySchema),
    companyController.updateSettings
);

export default router;
