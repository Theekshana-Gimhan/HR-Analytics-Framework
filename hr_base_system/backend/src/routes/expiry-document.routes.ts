import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { checkPermission, Permission } from '../middleware/rbac';
import { validateRequest } from '../middleware/validation.middleware';
import {
  createExpiryDocumentSchema,
  updateExpiryDocumentSchema,
} from '../schemas/validation.schemas';
import * as expiryDocController from '../controllers/expiry-document.controller';

const router = Router();

router.use(authenticate);

/**
 * @openapi
 * /api/v1/expiry-documents/summary:
 *   get:
 *     tags: [Expiry Documents]
 *     summary: Get expiry document summary counts
 *     responses:
 *       200:
 *         description: Counts by status (valid, expiringSoon, expired)
 */
router.get('/summary', checkPermission(Permission.EXPIRY_DOCUMENT_VIEW), expiryDocController.getExpiryDocumentSummary);

/**
 * @openapi
 * /api/v1/expiry-documents:
 *   get:
 *     tags: [Expiry Documents]
 *     summary: List expiry documents with optional filters
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [VALID, EXPIRING_SOON, EXPIRED, RENEWED] }
 *       - in: query
 *         name: documentType
 *         schema: { type: string }
 *       - in: query
 *         name: expiringWithinDays
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 */
router.get('/', checkPermission(Permission.EXPIRY_DOCUMENT_VIEW), expiryDocController.listExpiryDocuments);

/**
 * @openapi
 * /api/v1/expiry-documents/{id}:
 *   get:
 *     tags: [Expiry Documents]
 *     summary: Get a single expiry document
 */
router.get('/:id', checkPermission(Permission.EXPIRY_DOCUMENT_VIEW), expiryDocController.getExpiryDocument);

/**
 * @openapi
 * /api/v1/expiry-documents:
 *   post:
 *     tags: [Expiry Documents]
 *     summary: Create an expiry document
 */
router.post(
  '/',
  checkPermission(Permission.EXPIRY_DOCUMENT_MANAGE),
  validateRequest(createExpiryDocumentSchema),
  expiryDocController.createExpiryDocument
);

/**
 * @openapi
 * /api/v1/expiry-documents/{id}:
 *   patch:
 *     tags: [Expiry Documents]
 *     summary: Update an expiry document
 */
router.patch(
  '/:id',
  checkPermission(Permission.EXPIRY_DOCUMENT_MANAGE),
  validateRequest(updateExpiryDocumentSchema),
  expiryDocController.updateExpiryDocument
);

/**
 * @openapi
 * /api/v1/expiry-documents/{id}:
 *   delete:
 *     tags: [Expiry Documents]
 *     summary: Delete an expiry document
 */
router.delete('/:id', checkPermission(Permission.EXPIRY_DOCUMENT_MANAGE), expiryDocController.deleteExpiryDocument);

export default router;
