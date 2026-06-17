import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors';
import { ZodError } from 'zod';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('=== ERRO ===');
  console.error(`Mensagem completa: ${err.message}`);
  console.error(`Stack trace completo:\n${err.stack}`);
  const origem = (err.stack || '').split('\n')[1] || '';
  const match = origem.match(/\(?(.*):(\d+):(\d+)\)?$/);
  console.error(`Arquivo do erro: ${match ? match[1].replace(/^.*\(/, '') : 'desconhecido'}`);
  console.error(`Linha do erro: ${match ? match[2] : 'desconhecida'}`);

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

  return res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: 'Erro interno do servidor',
  });
}
