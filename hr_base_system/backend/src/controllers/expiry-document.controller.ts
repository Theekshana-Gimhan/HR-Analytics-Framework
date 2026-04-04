import { Response } from 'express';
import { CustomRequest } from '../middleware/auth.middleware';
import * as expiryDocService from '../services/expiry-document.service';
import logger from '../utils/logger';

/**
 * GET /api/v1/expiry-documents
 */
export const listExpiryDocuments = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;

    const params: expiryDocService.ExpiryDocumentListParams = {};
    if (req.query.employeeId) params.employeeId = Number(req.query.employeeId);
    if (req.query.status) params.status = String(req.query.status);
    if (req.query.documentType) params.documentType = String(req.query.documentType);
    if (req.query.expiringWithinDays) params.expiringWithinDays = Number(req.query.expiringWithinDays);
    if (req.query.limit) params.limit = Math.min(Number(req.query.limit), 100);
    if (req.query.offset) params.offset = Number(req.query.offset);

    const result = await expiryDocService.listExpiryDocuments(companyId, params);
    return res.json(result);
  } catch (error) {
    logger.error('Failed to list expiry documents', { error });
    return res.status(500).json({ message: 'Failed to list expiry documents' });
  }
};

/**
 * GET /api/v1/expiry-documents/summary
 */
export const getExpiryDocumentSummary = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const summary = await expiryDocService.getExpiryDocumentSummary(companyId);
    return res.json(summary);
  } catch (error) {
    logger.error('Failed to get expiry document summary', { error });
    return res.status(500).json({ message: 'Failed to get expiry document summary' });
  }
};

/**
 * GET /api/v1/expiry-documents/:id
 */
export const getExpiryDocument = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const id = Number(req.params.id);

    const doc = await expiryDocService.getExpiryDocumentById(id, companyId);
    if (!doc) {
      return res.status(404).json({ message: 'Expiry document not found' });
    }

    return res.json(doc);
  } catch (error) {
    logger.error('Failed to get expiry document', { error });
    return res.status(500).json({ message: 'Failed to get expiry document' });
  }
};

/**
 * POST /api/v1/expiry-documents
 */
export const createExpiryDocument = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const doc = await expiryDocService.createExpiryDocument(req.body, companyId);
    return res.status(201).json(doc);
  } catch (error: any) {
    if (error.message === 'Employee not found in your company') {
      return res.status(400).json({ message: error.message });
    }
    logger.error('Failed to create expiry document', { error });
    return res.status(500).json({ message: 'Failed to create expiry document' });
  }
};

/**
 * PATCH /api/v1/expiry-documents/:id
 */
export const updateExpiryDocument = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const id = Number(req.params.id);

    const doc = await expiryDocService.updateExpiryDocument(id, req.body, companyId);
    return res.json(doc);
  } catch (error: any) {
    if (error.message === 'Expiry document not found') {
      return res.status(404).json({ message: error.message });
    }
    logger.error('Failed to update expiry document', { error });
    return res.status(500).json({ message: 'Failed to update expiry document' });
  }
};

/**
 * DELETE /api/v1/expiry-documents/:id
 */
export const deleteExpiryDocument = async (req: CustomRequest, res: Response) => {
  try {
    const companyId = req.user!.companyId;
    const id = Number(req.params.id);

    await expiryDocService.deleteExpiryDocument(id, companyId);
    return res.status(204).send();
  } catch (error: any) {
    if (error.message === 'Expiry document not found') {
      return res.status(404).json({ message: error.message });
    }
    logger.error('Failed to delete expiry document', { error });
    return res.status(500).json({ message: 'Failed to delete expiry document' });
  }
};
