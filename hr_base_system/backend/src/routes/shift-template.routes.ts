
import { Router } from 'express';
import * as shiftTemplateController from '../controllers/shift-template.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { createShiftTemplateSchema, updateShiftTemplateSchema } from '../schemas/validation.schemas';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';

const router = Router();

router.use(authenticate); // Protect all routes

/**
 * @openapi
 * /api/v1/shift-templates:
 *   get:
 *     tags: [Shift Templates]
 *     summary: Get all shift templates
 *   post:
 *     tags: [Shift Templates]
 *     summary: Create a new shift template
 */
router.get('/', checkPermission(Permission.SHIFT_TEMPLATE_VIEW), shiftTemplateController.getShiftTemplates);
router.post('/', checkPermission(Permission.SHIFT_TEMPLATE_MANAGE), validateRequest(createShiftTemplateSchema), shiftTemplateController.createShiftTemplate);

/**
 * @openapi
 * /api/v1/shift-templates/{id}:
 *   put:
 *     tags: [Shift Templates]
 *     summary: Update a shift template
 *   delete:
 *     tags: [Shift Templates]
 *     summary: Delete (soft delete) a shift template
 */
router.put('/:id', checkPermission(Permission.SHIFT_TEMPLATE_MANAGE), validateRequest(updateShiftTemplateSchema), shiftTemplateController.updateShiftTemplate);
router.delete('/:id', checkPermission(Permission.SHIFT_TEMPLATE_MANAGE), shiftTemplateController.deleteShiftTemplate);

export default router;
