import { OpenAPIV3 } from 'openapi-types';

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Vínculo Aluno-Motorista API',
    version: '1.0.1',
    description:
      'Microserviço de gerenciamento de vínculos entre alunos e motoristas. Gerencia solicitações de conexão, aceitação, recusa e encerramento de vínculos, além de consultas de motoristas por código. ' +
      'MODO DESENVOLVIMENTO: a autenticação (Bearer Token) está temporariamente desabilitada em todos os endpoints para testes de integração com o frontend. Reativar antes de produção. ' +
      '\n\n**v1.0.1**: corrigido bug em que o código de um motorista deixava de ser encontrado (404) após o primeiro vínculo, sempre que um aluno com o mesmo id numérico (vindo da Auth API) fizesse qualquer requisição autenticada. A identidade local de cada usuário agora é o par (id, tipo), não apenas o id — alunos e motoristas nunca mais se sobrescrevem mesmo compartilhando o mesmo id por coincidência.',
  },
  servers: [
    {
      url: '/',
      description: 'Servidor local',
    },
  ],
  tags: [
    { name: 'Health', description: 'Endpoints de verificação de saúde' },
    { name: 'Solicitações', description: 'Gerenciamento de solicitações de vínculo' },
    { name: 'Motoristas', description: 'Consulta de motoristas' },
    { name: 'Vínculos', description: 'Gerenciamento de vínculos ativos e inativos' },
  ],
  components: {
    // MODO DESENVOLVIMENTO: securitySchemes removido — nenhum endpoint exige
    // Bearer Token enquanto a autenticação estiver desabilitada (ver
    // src/middleware/auth.ts). Reativar antes de produção.
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error', 'message'],
        properties: {
          error: { type: 'string', description: 'Código do erro' },
          message: { type: 'string', description: 'Mensagem descritiva do erro' },
        },
      },
      ValidationErrorDetails: {
        type: 'object',
        properties: {
          campo: { type: 'string', description: 'Nome do campo com erro' },
          mensagem: { type: 'string', description: 'Descrição do erro de validação' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'VALIDATION_ERROR' },
          message: { type: 'string', example: 'Dados inválidos' },
          details: {
            type: 'array',
            items: { $ref: '#/components/schemas/ValidationErrorDetails' },
          },
        },
      },
      CriarSolicitacaoInput: {
        type: 'object',
        required: ['targetId'],
        properties: {
          targetId: {
            type: 'integer',
            description: 'ID do usuário alvo (motorista se o solicitante for aluno, aluno se o solicitante for motorista)',
            example: 42,
          },
        },
      },
      ResponderSolicitacaoInput: {
        type: 'object',
        required: ['acao'],
        properties: {
          acao: {
            type: 'string',
            enum: ['ACEITAR', 'RECUSAR'],
            description: 'Ação a ser tomada: ACEITAR para aprovar ou RECUSAR para recusar a solicitação',
            example: 'ACEITAR',
          },
        },
      },
      UsuarioInfo: {
        type: 'object',
        properties: {
          id: { type: 'integer', description: 'ID do usuário', example: 1 },
          nome: { type: 'string', description: 'Nome do usuário', example: 'João Silva' },
          codigo: {
            type: 'string',
            nullable: true,
            description: 'Código único do usuário (preenchido apenas para motoristas)',
            example: 'MTR7X92AB',
          },
        },
      },
      SolicitacaoResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'ID da solicitação' },
          alunoId: { type: 'integer', description: 'ID do aluno' },
          motoristaId: { type: 'integer', description: 'ID do motorista' },
          solicitadoPor: {
            type: 'string',
            enum: ['ALUNO', 'MOTORISTA'],
            description: 'Indica quem iniciou a solicitação',
          },
          status: {
            type: 'string',
            enum: ['PENDENTE', 'ACEITA', 'RECUSADA', 'CANCELADA'],
            description: 'Status atual da solicitação',
          },
          createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Data da última atualização' },
          respondedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            description: 'Data de resposta (se houver)',
          },
          aluno: {
            allOf: [{ $ref: '#/components/schemas/UsuarioInfo' }],
            description: 'Dados do aluno envolvido',
          },
          motorista: {
            allOf: [{ $ref: '#/components/schemas/UsuarioInfo' }],
            description: 'Dados do motorista envolvido',
          },
        },
      },
      VinculoResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'ID do vínculo' },
          alunoId: { type: 'integer', description: 'ID do aluno' },
          motoristaId: { type: 'integer', description: 'ID do motorista' },
          ativo: { type: 'boolean', description: 'Indica se o vínculo está ativo' },
          createdAt: { type: 'string', format: 'date-time', description: 'Data de criação' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Data da última atualização' },
          aluno: {
            allOf: [{ $ref: '#/components/schemas/UsuarioInfo' }],
            description: 'Dados do aluno envolvido',
          },
          motorista: {
            allOf: [{ $ref: '#/components/schemas/UsuarioInfo' }],
            description: 'Dados do motorista envolvido',
          },
        },
      },
      MotoristaLookup: {
        type: 'object',
        required: ['id', 'nome', 'codigo'],
        properties: {
          id: {
            type: 'integer',
            description:
              'ID do motorista na Auth API. Não é uma chave global única do sistema: um aluno pode ter, por coincidência, o mesmo id numérico (alunos e motoristas vêm de sequências independentes). A identidade real de cada usuário neste serviço é o par (id, tipo).',
            example: 1,
          },
          nome: { type: 'string', description: 'Nome do motorista', example: 'João Silva' },
          codigo: {
            type: 'string',
            description:
              'Código único e permanente do motorista (formato MTR + 6 caracteres alfanuméricos). Gerado automaticamente na primeira autenticação e nunca recriado. Pode ser reutilizado por qualquer número de alunos para solicitar vínculo — encontrar o motorista por este código nunca depende de quantos alunos já o usaram.',
            example: 'MTR7X92AB',
          },
        },
        example: {
          id: 1,
          nome: 'João Silva',
          codigo: 'MTR7X92AB',
        },
      },
      StatusSolicitacao: {
        type: 'string',
        enum: ['PENDENTE', 'ACEITA', 'RECUSADA', 'CANCELADA'],
        description: 'Filtro por status da solicitação',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Verificação de saúde',
        description: 'Endpoint de health check para monitoramento da aplicação.',
        operationId: 'healthCheck',
        responses: {
          '200': {
            description: 'Aplicação saudável',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/solicitacoes': {
      post: {
        tags: ['Solicitações'],
        summary: 'Criar solicitação de conexão',
        description:
          'Aluno solicita conexão com motorista ou motorista solicita conexão com aluno. O tipo de usuário autenticado determina o papel do solicitante.',
        operationId: 'criarSolicitacao',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CriarSolicitacaoInput' },
            },
          },
        },
        responses: {
          '201': {
            description: 'Solicitação criada com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SolicitacaoResponse' },
              },
            },
          },
          '400': {
            description: 'Dados inválidos (ex: targetId não informado ou solicitação para si mesmo)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Usuário alvo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Conflito (aluno já possui vínculo ativo ou já existe solicitação pendente)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/solicitacoes/recebidas': {
      get: {
        tags: ['Solicitações'],
        summary: 'Listar solicitações recebidas',
        description:
          'Lista as solicitações de conexão recebidas pelo usuário autenticado. Para alunos, retorna solicitações onde o aluno é o alvo. Para motoristas, retorna solicitações onde o motorista é o alvo.',
        operationId: 'listarSolicitacoesRecebidas',
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status da solicitação',
            schema: { $ref: '#/components/schemas/StatusSolicitacao' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de solicitações recebidas',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SolicitacaoResponse' },
                },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/solicitacoes/enviadas': {
      get: {
        tags: ['Solicitações'],
        summary: 'Listar solicitações enviadas',
        description:
          'Lista as solicitações de conexão enviadas pelo usuário autenticado.',
        operationId: 'listarSolicitacoesEnviadas',
        parameters: [
          {
            name: 'status',
            in: 'query',
            description: 'Filtrar por status da solicitação',
            schema: { $ref: '#/components/schemas/StatusSolicitacao' },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de solicitações enviadas',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SolicitacaoResponse' },
                },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/solicitacoes/historico': {
      get: {
        tags: ['Solicitações'],
        summary: 'Histórico completo de solicitações',
        description:
          'Retorna todas as solicitações de conexão relacionadas ao usuário autenticado, independentemente de status.',
        operationId: 'listarHistoricoSolicitacoes',
        responses: {
          '200': {
            description: 'Histórico de solicitações',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/SolicitacaoResponse' },
                },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/solicitacoes/{id}/responder': {
      patch: {
        tags: ['Solicitações'],
        summary: 'Responder a uma solicitação',
        description:
          'Aceita ou recusa uma solicitação de conexão pendente. Apenas o usuário alvo da solicitação pode respondê-la.',
        operationId: 'responderSolicitacao',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da solicitação',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResponderSolicitacaoInput' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Solicitação respondida com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SolicitacaoResponse' },
              },
            },
          },
          '400': {
            description: 'Dados inválidos ou solicitação não está mais pendente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Usuário não tem permissão para responder esta solicitação',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Solicitação não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '409': {
            description: 'Aluno já possui um vínculo ativo (ao aceitar)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/solicitacoes/{id}/cancelar': {
      patch: {
        tags: ['Solicitações'],
        summary: 'Cancelar solicitação própria',
        description:
          'Cancela uma solicitação de conexão pendente. Apenas o solicitante original pode cancelar a solicitação.',
        operationId: 'cancelarSolicitacao',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID da solicitação a ser cancelada',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Solicitação cancelada com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SolicitacaoResponse' },
              },
            },
          },
          '400': {
            description: 'Solicitação não está mais pendente',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
          '403': {
            description: 'Apenas o solicitante pode cancelar a solicitação',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Solicitação não encontrada',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/motoristas/codigo/{codigo}': {
      get: {
        tags: ['Motoristas'],
        summary: 'Buscar motorista por código',
        description:
          'Consulta os dados de um motorista a partir do seu código único. O código é convertido para maiúsculas automaticamente. ' +
          'O mesmo código pode ser usado por qualquer número de alunos, em qualquer ordem, e continua válido indefinidamente — ele nunca é invalidado por uma vinculação anterior, por outro aluno autenticar-se, ou por logout/login do motorista.',
        operationId: 'buscarMotoristaPorCodigo',
        parameters: [
          {
            name: 'codigo',
            in: 'path',
            required: true,
            description: 'Código único do motorista (formato MTR + 6 caracteres alfanuméricos)',
            schema: { type: 'string', example: 'MTR7X92AB' },
          },
        ],
        responses: {
          '200': {
            description: 'Dados do motorista encontrados',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MotoristaLookup' },
                example: { id: 1, nome: 'João Silva', codigo: 'MTR7X92AB' },
              },
            },
          },
          '404': {
            description: 'Motorista não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'NOT_FOUND', message: 'Motorista não encontrado' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/motoristas/perfil': {
      get: {
        tags: ['Motoristas'],
        summary: 'Consultar perfil do motorista autenticado',
        description:
          'Retorna os dados do usuário autenticado, incluindo o código único e permanente (preenchido apenas para motoristas), persistido no banco de dados deste serviço. Se o motorista ainda não possuir um código (primeiro acesso), ele é gerado e salvo automaticamente antes da resposta. O código nunca é recriado para o mesmo motorista. ' +
          'MODO TESTE: a exigência de perfil MOTORISTA está temporariamente desabilitada — qualquer usuário autenticado pode consultar este endpoint (alunos recebem codigo: null).',
        operationId: 'consultarPerfilMotorista',
        responses: {
          '200': {
            description: 'Perfil do usuário autenticado, com o código real persistido no banco (null se não for motorista)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MotoristaLookup' },
                example: { id: 1, nome: 'João Silva', codigo: 'MTR7X92AB' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/vinculos/meu': {
      get: {
        tags: ['Vínculos'],
        summary: 'Consultar vínculo ativo do aluno',
        description:
          'Retorna o vínculo ativo do aluno autenticado. Acesso restrito a alunos.',
        operationId: 'consultarMeuVinculo',
        responses: {
          '200': {
            description: 'Vínculo ativo do aluno (ou null se não houver)',
            content: {
              'application/json': {
                schema: {
                  nullable: true,
                  allOf: [{ $ref: '#/components/schemas/VinculoResponse' }],
                },
              },
            },
          },
          '403': {
            description: 'Apenas alunos podem consultar seu vínculo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/vinculos/meus-alunos': {
      get: {
        tags: ['Vínculos'],
        summary: 'Listar alunos vinculados ao motorista',
        description:
          'Retorna todos os alunos vinculados ao motorista autenticado. Acesso restrito a motoristas.',
        operationId: 'listarMeusAlunos',
        parameters: [
          {
            name: 'ativo',
            in: 'query',
            description: 'Filtrar por vínculos ativos (true) ou inativos (false)',
            schema: { type: 'string', enum: ['true', 'false'] },
          },
        ],
        responses: {
          '200': {
            description: 'Lista de alunos vinculados',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/VinculoResponse' },
                },
              },
            },
          },
          '403': {
            description: 'Apenas motoristas podem listar alunos vinculados',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/vinculos/{id}': {
      delete: {
        tags: ['Vínculos'],
        summary: 'Encerrar vínculo',
        description:
          'Encerra um vínculo existente. Apenas o aluno ou motorista proprietário do vínculo pode encerrá-lo.',
        operationId: 'encerrarVinculo',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'ID do vínculo a ser encerrado',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Vínculo encerrado com sucesso',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VinculoResponse' },
              },
            },
          },
          '403': {
            description: 'Usuário não tem permissão para encerrar este vínculo',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'Vínculo não encontrado',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/vinculos/ativos': {
      get: {
        tags: ['Vínculos'],
        summary: 'Listar todos os vínculos ativos',
        description: 'Retorna todos os vínculos ativos do sistema.',
        operationId: 'listarVinculosAtivos',
        responses: {
          '200': {
            description: 'Lista de vínculos ativos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/VinculoResponse' },
                },
              },
            },
          },
        },
      },
    },
    '/api/vinculo/vinculos/inativos': {
      get: {
        tags: ['Vínculos'],
        summary: 'Listar todos os vínculos inativos',
        description: 'Retorna todos os vínculos inativos (encerrados) do sistema.',
        operationId: 'listarVinculosInativos',
        responses: {
          '200': {
            description: 'Lista de vínculos inativos',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/VinculoResponse' },
                },
              },
            },
          },
        },
      },
    },
  },
};
