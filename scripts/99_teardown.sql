-- =====================================================================
-- File   : 99_teardown.sql
-- Purpose: Drop everything this project created, so 00_run_all.sql can
--          be re-run from clean. Destructive. Read before executing.
-- =====================================================================

DROP SCHEMA IF EXISTS tools    CASCADE;
DROP SCHEMA IF EXISTS research CASCADE;
DROP SCHEMA IF EXISTS ai       CASCADE;
DROP SCHEMA IF EXISTS erp      CASCADE;

-- Roles are cluster-wide, so their privileges must be dropped explicitly.
DO $$
DECLARE
    r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['erp_app', 'erp_ai_agent', 'erp_researcher', 'erp_readonly'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('DROP OWNED BY %I CASCADE', r);
            EXECUTE format('DROP ROLE %I', r);
        END IF;
    END LOOP;
END;
$$;
