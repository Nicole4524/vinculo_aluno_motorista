import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.code || 'APP_ERROR',
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: err.errors.map((e) => ({
        campo: e.path.join('.'),
        mensagem: e.message,
      })),
    });
  }

  console.error('Erro não tratado:', err);
  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
  });
}
