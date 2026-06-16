import { Request, Response, NextFunction } from 'express';
import { DadosUsuario, PerfilUsuario } from '../shared/types';
import { validarTokenAluno, validarTokenMotorista } from '../config/authApi';
import { UnauthorizedError } from '../shared/errors';
import { upsertUsuario } from '../modules/vinculo/repository';
import { garantirCodigoMotorista } from '../modules/vinculo/service';

declare global {
  namespace Express {
    interface Request {
      usuario?: DadosUsuario;
    }
  }
}

export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Token de acesso não fornecido'));
  }

  const token = header.slice(7);

  try {
    const perfil = await validarTokenAluno(token);
    req.usuario = {
      id: perfil.id,
      tipo: PerfilUsuario.ALUNO,
      nome: perfil.nome,
    };
    await upsertUsuario(perfil.id, perfil.nome, 'aluno').catch(() => {});
    return next();
  } catch {
    // Token não é de aluno, tenta como motorista
  }

  try {
    const perfil = await validarTokenMotorista(token);
    const codigo = await garantirCodigoMotorista(perfil.id, perfil.nome).catch((err) => {
      console.error('[CODIGO_MOTORISTA] Erro ao garantir código do motorista:', err);
      return null;
    });
    req.usuario = {
      id: perfil.id,
      tipo: PerfilUsuario.MOTORISTA,
      nome: perfil.nome,
      codigo,
    };
    return next();
  } catch {
    return next(new UnauthorizedError('Token inválido ou expirado'));
  }
}

export function autorizar(...perfis: PerfilUsuario[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.usuario) {
      return next(new UnauthorizedError('Usuário não autenticado'));
    }
    if (!perfis.includes(req.usuario.tipo)) {
      return next(new UnauthorizedError('Perfil sem permissão para esta ação'));
    }
    next();
  };
}
