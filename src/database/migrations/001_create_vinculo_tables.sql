-- ============================================================
-- Migration 001: Create vinculação tables
-- ============================================================
-- Este script deve ser executado no SQL Editor do Supabase.
-- Cria as tabelas necessárias para o gerenciamento de vínculos
-- entre alunos e motoristas.
-- ============================================================

-- Enum para status da solicitação
DO $$ BEGIN
  CREATE TYPE status_solicitacao AS ENUM ('PENDENTE', 'ACEITA', 'RECUSADA', 'CANCELADA');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Adiciona coluna codigo para motoristas na tabela usuarios
-- ============================================================
DO $$ BEGIN
  ALTER TABLE usuarios ADD COLUMN codigo VARCHAR(20) UNIQUE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- ============================================================
-- Tabela: solicitacoes_vinculo
-- ============================================================
CREATE TABLE IF NOT EXISTS solicitacoes_vinculo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        INTEGER NOT NULL,
  motorista_id    INTEGER NOT NULL,
  solicitado_por  VARCHAR(10) NOT NULL CHECK (solicitado_por IN ('ALUNO', 'MOTORISTA')),
  status          status_solicitacao NOT NULL DEFAULT 'PENDENTE',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ
);

-- Foreign keys para tabela usuarios
DO $$ BEGIN
  ALTER TABLE solicitacoes_vinculo
    ADD CONSTRAINT fk_solicitacoes_aluno
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE solicitacoes_vinculo
    ADD CONSTRAINT fk_solicitacoes_motorista
    FOREIGN KEY (motorista_id) REFERENCES usuarios(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_solicitacoes_aluno ON solicitacoes_vinculo(aluno_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_motorista ON solicitacoes_vinculo(motorista_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes_vinculo(status);

-- ============================================================
-- Tabela: vinculos
-- ============================================================
CREATE TABLE IF NOT EXISTS vinculos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        INTEGER NOT NULL UNIQUE,
  motorista_id    INTEGER NOT NULL,
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Foreign keys para tabela usuarios
DO $$ BEGIN
  ALTER TABLE vinculos
    ADD CONSTRAINT fk_vinculos_aluno
    FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE vinculos
    ADD CONSTRAINT fk_vinculos_motorista
    FOREIGN KEY (motorista_id) REFERENCES usuarios(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_vinculos_aluno ON vinculos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_motorista ON vinculos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_vinculos_ativo ON vinculos(ativo);
