import { z } from 'zod';

export const criarSolicitacaoSchema = z.object({
  targetId: z.number({
    required_error: 'ID do usuário alvo é obrigatório',
    invalid_type_error: 'ID do usuário alvo deve ser um número',
  }).int().positive('ID deve ser um número positivo'),
});

export const responderSolicitacaoSchema = z.object({
  acao: z.enum(['ACEITAR', 'RECUSAR'], {
    required_error: 'Ação é obrigatória (ACEITAR ou RECUSAR)',
    invalid_type_error: 'Ação deve ser ACEITAR ou RECUSAR',
  }),
});

export const queryParamsSchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
