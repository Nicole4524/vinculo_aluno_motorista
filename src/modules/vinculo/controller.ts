import { Request, Response, NextFunction } from 'express';
import * as service from './service';
import { criarSolicitacaoSchema, responderSolicitacaoSchema } from './validation';
import { StatusSolicitacao } from '../../shared/types';

export async function solicitarConexao(req: Request, res: Response, next: NextFunction) {
  try {
    const { targetId } = criarSolicitacaoSchema.parse(req.body);
    const result = await service.criarSolicitacao(req.usuario!, targetId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listarRecebidas(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as StatusSolicitacao | undefined;
    const result = await service.listarSolicitacoesRecebidas(req.usuario!, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listarEnviadas(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as StatusSolicitacao | undefined;
    const result = await service.listarSolicitacoesEnviadas(req.usuario!, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listarHistorico(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listarHistoricoSolicitacoes(req.usuario!);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function responder(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { acao } = responderSolicitacaoSchema.parse(req.body);
    const result = await service.responderSolicitacao(req.usuario!, id, acao);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function cancelar(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await service.cancelarSolicitacao(req.usuario!, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function consultarMeuVinculo(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.consultarVinculoAluno(req.usuario!);
    if (!result) return res.json(null);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listarMeusAlunos(req: Request, res: Response, next: NextFunction) {
  try {
    const ativo = req.query.ativo !== undefined ? req.query.ativo === 'true' : undefined;
    const result = await service.listarAlunosVinculados(req.usuario!, ativo);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function encerrarVinculo(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const result = await service.encerrarVinculo(req.usuario!, id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function buscarMotorista(req: Request, res: Response, next: NextFunction) {
  try {
    const { codigo } = req.params;
    const result = await service.buscarMotoristaPorCodigo(codigo.toUpperCase());
    if (!result) return res.status(404).json({ error: 'NOT_FOUND', message: 'Motorista não encontrado' });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listarTodosAtivos(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listarVinculosAtivos();
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function listarTodosInativos(_req: Request, res: Response, next: NextFunction) {
  try {
    const result = await service.listarVinculosInativos();
    res.json(result);
  } catch (err) {
    next(err);
  }
}
