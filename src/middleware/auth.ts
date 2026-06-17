import { Request, Response, NextFunction } from 'express';
import { DadosUsuario, PerfilUsuario } from '../shared/types';

declare global {
  namespace Express {
    interface Request {
      usuario?: DadosUsuario;
    }
  }
}

// ============================================================================
// MODO DESENVOLVIMENTO — AUTENTICAÇÃO TEMPORARIAMENTE DESABILITADA
// ============================================================================
// A validação de JWT/Bearer Token contra a Auth API e a verificação de perfil
// (ALUNO/MOTORISTA) foram removidas para permitir testes de integração do
// frontend com esta API sem a necessidade de login real.
//
// Nenhum header Authorization é exigido ou verificado. Como várias regras de
// negócio do serviço (criar solicitação, consultar perfil, etc.) dependem de
// saber "quem" está chamando, a identidade do usuário agora é aceita por
// headers de teste, sem qualquer validação:
//   x-user-id    -> ID do usuário (padrão: 0)
//   x-user-tipo  -> 'ALUNO' ou 'MOTORISTA' (padrão: 'ALUNO')
//   x-user-nome  -> nome de exibição (padrão: 'Usuário de Teste')
//
// REATIVAR ANTES DE PRODUÇÃO: restaurar a verificação de Authorization Bearer
// + validarTokenAluno/validarTokenMotorista (ver histórico do git deste
// arquivo, commit anterior a esta alteração) e reativar a checagem de perfil
// em `autorizar`. NÃO FAZER DEPLOY EM PRODUÇÃO COM ESTE ARQUIVO COMO ESTÁ.
// ============================================================================

export async function autenticar(req: Request, res: Response, next: NextFunction) {
  const idHeader = req.header('x-user-id');
  const tipoHeader = (req.header('x-user-tipo') || '').toUpperCase();
  const nomeHeader = req.header('x-user-nome') || 'Usuário de Teste';

  req.usuario = {
    id: idHeader ? Number(idHeader) : 0,
    tipo: tipoHeader === 'MOTORISTA' ? PerfilUsuario.MOTORISTA : PerfilUsuario.ALUNO,
    nome: nomeHeader,
    codigo: null,
  };

  res.on('finish', () => {
    console.log('=== ACESSO PUBLICO ===');
    console.log(`Endpoint acessado: ${req.originalUrl}`);
    console.log(`Método: ${req.method}`);
    console.log(`IP: ${req.ip}`);
    console.log(`Status: ${res.statusCode}`);
  });

  next();
}

export function autorizar(..._perfis: PerfilUsuario[]) {
  // MODO DESENVOLVIMENTO: checagem de perfil (Roles) desabilitada — qualquer
  // chamada passa, independentemente do tipo de usuário.
  return (_req: Request, _res: Response, next: NextFunction) => next();
}
