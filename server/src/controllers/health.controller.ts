import { Request, Response, NextFunction } from 'express';

export const checkHealth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      service: 'shelf360-api',
    });
  } catch (error) {
    next(error);
  }
};
