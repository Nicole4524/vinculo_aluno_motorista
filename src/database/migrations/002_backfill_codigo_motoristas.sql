-- ============================================================
-- Migration 002: Backfill de código único para motoristas
-- ============================================================
-- Gera um código MTR + 6 caracteres alfanuméricos para todo
-- motorista já cadastrado que ainda não possui código.
-- A unicidade é garantida pela constraint UNIQUE em usuarios.codigo
-- (criada na migration 001); colisões são tratadas com retry.
-- ============================================================

DO $$
DECLARE
  r RECORD;
  novo_codigo VARCHAR(20);
  tentativas INT;
BEGIN
  FOR r IN SELECT id FROM usuarios WHERE tipo = 'motorista' AND codigo IS NULL LOOP
    tentativas := 0;
    LOOP
      novo_codigo := 'MTR' || (
        SELECT string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 32)::int + 1, 1), '')
        FROM generate_series(1, 6)
      );

      BEGIN
        UPDATE usuarios SET codigo = novo_codigo WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        tentativas := tentativas + 1;
        IF tentativas > 10 THEN
          RAISE EXCEPTION 'Não foi possível gerar código único para o motorista %', r.id;
        END IF;
      END;
    END LOOP;
  END LOOP;
END $$;
