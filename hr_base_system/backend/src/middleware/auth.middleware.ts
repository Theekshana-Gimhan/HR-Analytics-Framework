import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError, JsonWebTokenError } from 'jsonwebtoken';
import type { Role } from './rbac';

export interface CustomRequest extends Request {
  user?: { id: number; role: Role; companyId: number };
}

export const authenticate = (req: CustomRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded as { id: number; role: Role; companyId: number };
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    if (error instanceof JsonWebTokenError) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: CustomRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
};
