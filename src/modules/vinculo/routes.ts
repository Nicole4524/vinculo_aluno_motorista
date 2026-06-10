import { Router } from 'express';
import { autenticar, autorizar } from '../../middleware/auth';
import { PerfilUsuario } from '../../shared/types';
import * as controller from './controller';

const router = Router();

// Todas as rotas exigem autenticação
router.use(autenticar);

// ---- Solicitações ----

// Aluno solicita motorista / Motorista solicita aluno
router.post('/solicitacoes', controller.solicitarConexao);

// Listar solicitações recebidas
router.get('/solicitacoes/recebidas', controller.listarRecebidas);

// Listar solicitações enviadas
router.get('/solicitacoes/enviadas', controller.listarEnviadas);

// Histórico completo de solicitações
router.get('/solicitacoes/historico', controller.listarHistorico);

// Responder solicitação (ACEITAR / RECUSAR)
router.patch('/solicitacoes/:id/responder', controller.responder);

// Cancelar solicitação própria
router.patch('/solicitacoes/:id/cancelar', controller.cancelar);

// ---- Motorista lookup ----

// Buscar motorista por código
router.get('/motoristas/codigo/:codigo', controller.buscarMotorista);

// ---- Vínculos ----

// Consultar vínculo ativo do aluno autenticado
router.get('/vinculos/meu', autorizar(PerfilUsuario.ALUNO), controller.consultarMeuVinculo);

// Listar alunos vinculados ao motorista autenticado
router.get('/vinculos/meus-alunos', autorizar(PerfilUsuario.MOTORISTA), controller.listarMeusAlunos);

// Encerrar vínculo
router.delete('/vinculos/:id', controller.encerrarVinculo);

// Listar todos os vínculos ativos (admin)
router.get('/vinculos/ativos', controller.listarTodosAtivos);

// Listar vínculos inativos (admin)
router.get('/vinculos/inativos', controller.listarTodosInativos);

export default router;
