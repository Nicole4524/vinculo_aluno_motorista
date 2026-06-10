-- ============================================================
-- Migration 001: Schema completo para vínculos
-- ============================================================
-- Banco próprio (PostgreSQL puro).
-- Cria todas as tabelas necessárias sem depender de Supabase.
-- ============================================================

-- Enum para status da solicitação
DO $$ BEGIN
  CREATE TYPE status_solicitacao AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Tabela: usuarios (dados locais, sincronizados da Auth API)
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id        INTEGER PRIMARY KEY,
  nome      VARCHAR(255) NOT NULL,
  tipo      VARCHAR(20) NOT NULL CHECK (tipo IN ('aluno', 'motorista')),
  codigo    VARCHAR(20) UNIQUE,
  email     VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo ON usuarios(codigo);

-- ============================================================
-- Tabela: solicitacoes_vinculo
-- ============================================================
CREATE TABLE IF NOT EXISTS solicitacoes_vinculo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  motorista_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  solicitado_por  VARCHAR(10) NOT NULL CHECK (solicitado_por IN ('ALUNO', 'MOTORISTA')),
  status          status_solicitacao NOT NULL DEFAULT 'PENDENTE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_aluno ON solicitacoes_vinculo(aluno_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_motorista ON solicitacoes_vinculo(motorista_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_vinculo(status);

-- ============================================================
-- Tabela: vinculos
-- ============================================================
CREATE TABLE IF NOT EXISTS vinculos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        INTEGER NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,
  motorista_id    INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vinculos_aluno ON vinculos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_motorista ON vinculos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_ativo ON vinculos(ativo);
