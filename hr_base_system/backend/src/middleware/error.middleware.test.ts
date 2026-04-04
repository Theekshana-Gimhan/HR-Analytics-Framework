import { Request, Response, NextFunction } from 'express';
import {
    handleError,
    HttpError,
    BadRequestError,
    NotFoundError
} from './error.middleware';
import logger from '../utils/logger';

jest.mock('../utils/logger');

describe('Error Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    const nextFunction: NextFunction = jest.fn();

    beforeEach(() => {
        mockRequest = {
            originalUrl: '/api/test',
            method: 'GET',
            ip: '127.0.0.1',
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
            headersSent: false,
        };
        jest.clearAllMocks();
    });

    it('should handle HttpError with specified status and message', () => {
        const error = new HttpError('Test HTTP Error', 418);
        handleError(error as Error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(418);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Test HTTP Error' });
    });

    it('should handle BadRequestError with 400 status', () => {
        const error = new BadRequestError('Invalid input');
        handleError(error as Error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Invalid input' });
    });

    it('should handle NotFoundError with 404 status', () => {
        const error = new NotFoundError('User not found');
        handleError(error as Error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'User not found' });
    });

    it('should handle Zod validation errors (ValidationError) with 400 status', () => {
        const error = new Error('Zod validation failed');
        error.name = 'ValidationError';
        handleError(error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Zod validation failed' });
    });

    it('should handle Prisma P2025 (Record not found) with 404 status', () => {
        const error = new Error('Prisma error') as any;
        error.code = 'P2025';
        handleError(error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Record not found' });
    });

    it('should handle unknown errors with 500 status', () => {
        const error = new Error('Random unexpected error');
        handleError(error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Something went wrong' });
        expect(logger.error).toHaveBeenCalled();
    });

    it('should call next if headers are already sent', () => {
        const error = new Error('Error after headers sent');
        mockResponse.headersSent = true;
        handleError(error, mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalledWith(error);
        expect(mockResponse.status).not.toHaveBeenCalled();
    });
});
