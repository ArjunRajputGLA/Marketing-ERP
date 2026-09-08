-- =====================================================================
-- File   : 01_schemas_and_extensions.sql
-- Project: Minimal ERP + Evidence-Grounded Multi-Agent AI
-- Purpose: Schemas, extensions, shared helper functions, request context
-- Run as : postgres (superuser) on the target database
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid(), crypt(), gen_salt()
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- fuzzy name matching for NL entity resolution

-- ---------------------------------------------------------------------
-- Schemas
--   erp      : master + transactional business data (source of truth)
--   ai       : agent runs, findings, evidence, tool logs, consensus, ML outputs
--   research : dataset provenance, ground truth, benchmark, experiment results
--   tools    : the ONLY surface the AI service is allowed to touch
-- ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS erp;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS research;
CREATE SCHEMA IF NOT EXISTS tools;

COMMENT ON SCHEMA erp      IS 'Business master and transaction data. Single source of truth for every number the system reports.';
COMMENT ON SCHEMA ai       IS 'Agent execution traces: runs, findings, evidence rows, tool calls, consensus, ML outputs.';
COMMENT ON SCHEMA research IS 'Dataset provenance, injected ground truth, frozen benchmark, experiment results. Never readable by the AI service role.';
COMMENT ON SCHEMA tools    IS 'Parameterised, authorisation-checked read functions. The AI service holds no table privileges; it may only call these.';

-- ---------------------------------------------------------------------
-- Request context
-- The application sets these per connection/transaction:
--     SELECT set_config('app.user_id',   '7',       true);
--     SELECT set_config('app.role_code', 'MANAGER', true);
-- Row-level security and the tools layer both read from here.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.current_user_id()
RETURNS BIGINT
LANGUAGE sql STABLE
AS $$
    SELECT NULLIF(current_setting('app.user_id', true), '')::BIGINT;
$$;

CREATE OR REPLACE FUNCTION erp.current_role_code()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
    SELECT UPPER(COALESCE(NULLIF(current_setting('app.role_code', true), ''), 'NONE'));
$$;

COMMENT ON FUNCTION erp.current_user_id()   IS 'User id for the current request, injected by the application via set_config(''app.user_id'', ...).';
COMMENT ON FUNCTION erp.current_role_code() IS 'Role code for the current request. Drives RLS policies and tools-layer authorisation.';

-- ---------------------------------------------------------------------
-- Shared trigger: maintain updated_at
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------
-- Shared trigger: make a table append-only (ledger / audit protection)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION erp.forbid_update_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION
        'Table %.% is append-only; % is not permitted. Post a reversing entry instead.',
        TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
END;
$$;
