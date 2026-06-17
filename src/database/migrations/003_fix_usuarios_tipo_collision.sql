-- ============================================================
-- Migration 003: Corrige colisão de id entre aluno e motorista
-- ============================================================
-- CAUSA RAIZ DO BUG: a coluna usuarios.id guarda o id retornado pela
-- Auth API externa (endpoints /alunos/perfil e /motoristas/perfil), que
-- são entidades independentes com suas próprias sequências de id. Um
-- aluno e um motorista podem ter o MESMO id numérico por coincidência.
--
-- Como usuarios.id era PRIMARY KEY isolada (sem o tipo), o upsert feito
-- a cada requisição autenticada (upsertUsuario, em
-- src/middleware/auth.ts) usava "ON CONFLICT (id) DO UPDATE SET
-- tipo = EXCLUDED.tipo". Quando um aluno autenticava com o mesmo id
-- numérico de um motorista já cadastrado, a linha do motorista era
-- silenciosamente sobrescrita para tipo = 'aluno' (o código permanecia
-- intacto por causa do COALESCE, mas deixava de ser encontrado, pois
-- findMotoristaByCode filtra "AND tipo = 'motorista'").
--
-- Resultado observado: o código de vinculação nunca muda no banco, mas
-- a busca por código passa a retornar 404 "Motorista não encontrado"
-- depois que qualquer aluno com id colidente faz qualquer requisição
-- autenticada neste serviço.
--
-- Correção: a identidade real do usuário local é o par (id, tipo), não
-- apenas id. Passamos a PK de usuarios para (id, tipo), o que permite
-- que um aluno e um motorista com o mesmo id externo coexistam como
-- linhas distintas, sem nunca mais se sobrescreverem.
-- ============================================================

-- 1) Remove as FKs que dependiam da unicidade de usuarios.id isolado.
ALTER TABLE solicitacoes_vinculo DROP CONSTRAINT IF EXISTS solicitacoes_vinculo_aluno_id_fkey;
ALTER TABLE solicitacoes_vinculo DROP CONSTRAINT IF EXISTS solicitacoes_vinculo_motorista_id_fkey;
ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_aluno_id_fkey;
ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_motorista_id_fkey;

-- 2) Troca a PK de usuarios(id) por usuarios(id, tipo).
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id, tipo);

-- 3) Repara identidades que o bug já apagou em produção: a UPDATE feita por
-- upsertUsuario (ON CONFLICT (id) DO UPDATE SET tipo = EXCLUDED.tipo) não só
-- ocultava o motorista da busca por código — ela de fato SOBRESCREVIA a
-- linha, deixando solicitacoes_vinculo/vinculos com motorista_id (ou
-- aluno_id) sem nenhuma linha correspondente em usuarios com o tipo certo.
-- Antes de recriar as FKs (passo 5), recriamos essas linhas. Quando a linha
-- foi corrompida (não apagada), o código antigo continua na coluna codigo
-- da linha que "roubou" o id — recuperamos ele aqui antes de limpá-la.
--
-- A UNIQUE em usuarios.codigo é suspensa temporariamente: durante a
-- transição, a linha recuperada e a linha corrompida doadora chegam a
-- coexistir com o mesmo código por uma fração da migration (até o passo 4
-- limpar a doadora). A constraint é restaurada no final do passo 4.
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_codigo_key;

INSERT INTO usuarios (id, nome, tipo, codigo)
SELECT DISTINCT ids.motorista_id,
       'Motorista (perfil recuperado automaticamente — corrigir nome no próximo login)',
       'motorista',
       (SELECT u.codigo FROM usuarios u WHERE u.id = ids.motorista_id AND u.codigo IS NOT NULL LIMIT 1)
FROM (
  SELECT motorista_id FROM solicitacoes_vinculo
  UNION
  SELECT motorista_id FROM vinculos
) ids
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios u WHERE u.id = ids.motorista_id AND u.tipo = 'motorista'
)
ON CONFLICT (id, tipo) DO NOTHING;

INSERT INTO usuarios (id, nome, tipo, codigo)
SELECT DISTINCT ids.aluno_id,
       'Aluno (perfil recuperado automaticamente — corrigir nome no próximo login)',
       'aluno',
       NULL
FROM (
  SELECT aluno_id FROM solicitacoes_vinculo
  UNION
  SELECT aluno_id FROM vinculos
) ids
WHERE NOT EXISTS (
  SELECT 1 FROM usuarios u WHERE u.id = ids.aluno_id AND u.tipo = 'aluno'
)
ON CONFLICT (id, tipo) DO NOTHING;

-- 4) Limpeza: nenhuma linha que não seja motorista deveria carregar um
-- código de vinculação — isso só podia ocorrer pelo bug de colisão
-- corrigido aqui. O passo 3 já recuperou o código para a linha de
-- motorista correta antes desta limpeza, então nada se perde.
UPDATE usuarios SET codigo = NULL WHERE tipo <> 'motorista' AND codigo IS NOT NULL;

-- Restaura a UNIQUE em codigo agora que cada código existe em exatamente
-- uma linha (a do motorista).
ALTER TABLE usuarios ADD CONSTRAINT usuarios_codigo_key UNIQUE (codigo);

-- 5) Recria as FKs como compostas (aluno_id, 'aluno') / (motorista_id,
-- 'motorista'), usando colunas geradas com o tipo fixo, já que o
-- Postgres não permite literais diretamente em FOREIGN KEY.
-- (DROP CONSTRAINT IF EXISTS antes de cada ADD para que esta migration
-- continue idempotente caso o runner a execute mais de uma vez — mesmo
-- padrão usado nas migrations 001/002 deste projeto.)
ALTER TABLE solicitacoes_vinculo ADD COLUMN IF NOT EXISTS aluno_tipo VARCHAR(20) GENERATED ALWAYS AS ('aluno') STORED;
ALTER TABLE solicitacoes_vinculo ADD COLUMN IF NOT EXISTS motorista_tipo VARCHAR(20) GENERATED ALWAYS AS ('motorista') STORED;
ALTER TABLE solicitacoes_vinculo DROP CONSTRAINT IF EXISTS solicitacoes_vinculo_aluno_fkey;
ALTER TABLE solicitacoes_vinculo ADD CONSTRAINT solicitacoes_vinculo_aluno_fkey FOREIGN KEY (aluno_id, aluno_tipo) REFERENCES usuarios(id, tipo) ON DELETE CASCADE;
ALTER TABLE solicitacoes_vinculo DROP CONSTRAINT IF EXISTS solicitacoes_vinculo_motorista_fkey;
ALTER TABLE solicitacoes_vinculo ADD CONSTRAINT solicitacoes_vinculo_motorista_fkey FOREIGN KEY (motorista_id, motorista_tipo) REFERENCES usuarios(id, tipo) ON DELETE CASCADE;

ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS aluno_tipo VARCHAR(20) GENERATED ALWAYS AS ('aluno') STORED;
ALTER TABLE vinculos ADD COLUMN IF NOT EXISTS motorista_tipo VARCHAR(20) GENERATED ALWAYS AS ('motorista') STORED;
ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_aluno_fkey;
ALTER TABLE vinculos ADD CONSTRAINT vinculos_aluno_fkey FOREIGN KEY (aluno_id, aluno_tipo) REFERENCES usuarios(id, tipo) ON DELETE CASCADE;
ALTER TABLE vinculos DROP CONSTRAINT IF EXISTS vinculos_motorista_fkey;
ALTER TABLE vinculos ADD CONSTRAINT vinculos_motorista_fkey FOREIGN KEY (motorista_id, motorista_tipo) REFERENCES usuarios(id, tipo) ON DELETE CASCADE;
