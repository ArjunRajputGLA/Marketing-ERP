-- =====================================================================
-- File   : 14_security_roles_rls.sql
-- Purpose: Database roles, privilege grants, row-level security.
--
-- The point of this file, for the paper: the AI service holds no table
-- privileges at all. It cannot read erp.* directly, cannot see the
-- benchmark gold answers, and cannot write anything except its own
-- execution trace. Access control is a property of the database, not of
-- the system prompt.
--
-- CHANGE THE PASSWORDS BEFORE ANY DEPLOYMENT.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_app') THEN
        CREATE ROLE erp_app LOGIN PASSWORD 'change_me_app';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_ai_agent') THEN
        CREATE ROLE erp_ai_agent LOGIN PASSWORD 'change_me_ai';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_researcher') THEN
        CREATE ROLE erp_researcher LOGIN PASSWORD 'change_me_research';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'erp_readonly') THEN
        CREATE ROLE erp_readonly LOGIN PASSWORD 'change_me_readonly';
    END IF;
END;
$$;

COMMENT ON ROLE erp_app        IS 'Next.js application. Full DML on erp, read/write on ai. No access to research gold labels.';
COMMENT ON ROLE erp_ai_agent   IS 'FastAPI AI service. EXECUTE on tools only, plus INSERT/UPDATE on its own trace tables. No table privileges on erp. No access to research.';
COMMENT ON ROLE erp_researcher IS 'Evaluation harness and data generator. Full access including research gold labels.';
COMMENT ON ROLE erp_readonly   IS 'Baseline A dashboards and manual SQL analytics.';

-- ---------------------------------------------------------------------
-- Baseline: revoke public, then grant deliberately
-- ---------------------------------------------------------------------
REVOKE ALL ON SCHEMA erp, ai, research, tools FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp, ai, research REVOKE ALL ON TABLES FROM PUBLIC;

-- ---------------------------------------------------------------------
-- erp_app : runs the ERP
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA erp, ai, tools TO erp_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA erp TO erp_app;
GRANT SELECT, INSERT, UPDATE           ON ALL TABLES IN SCHEMA ai  TO erp_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA erp TO erp_app;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ai  TO erp_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA erp   TO erp_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tools TO erp_app;

-- ---------------------------------------------------------------------
-- erp_ai_agent : the constrained one. No erp table privileges, ever.
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA tools TO erp_ai_agent;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tools TO erp_ai_agent;

GRANT USAGE ON SCHEMA ai TO erp_ai_agent;
GRANT SELECT, INSERT, UPDATE ON
      ai.conversations, ai.messages, ai.query_runs, ai.tool_calls,
      ai.agent_findings, ai.finding_evidence, ai.consensus_results,
      ai.consensus_inputs, ai.alerts
   TO erp_ai_agent;
GRANT SELECT ON ai.model_registry, ai.forecasts, ai.anomaly_scores, ai.agent_reliability TO erp_ai_agent;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ai TO erp_ai_agent;

-- Explicitly withheld. Listed rather than merely omitted so the intent
-- is visible in the file and quotable in the paper.
REVOKE ALL ON SCHEMA erp      FROM erp_ai_agent;
REVOKE ALL ON SCHEMA research FROM erp_ai_agent;
REVOKE ALL ON ALL TABLES IN SCHEMA erp      FROM erp_ai_agent;
REVOKE ALL ON ALL TABLES IN SCHEMA research FROM erp_ai_agent;

-- ---------------------------------------------------------------------
-- erp_researcher : generator + evaluation harness
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA erp, ai, research, tools TO erp_researcher;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA erp      TO erp_researcher;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ai       TO erp_researcher;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA research TO erp_researcher;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA erp      TO erp_researcher;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ai       TO erp_researcher;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA research TO erp_researcher;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA erp, tools TO erp_researcher;

-- ---------------------------------------------------------------------
-- erp_readonly : Baseline A
-- ---------------------------------------------------------------------
GRANT USAGE ON SCHEMA erp TO erp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA erp TO erp_readonly;

-- ---------------------------------------------------------------------
-- Future objects inherit the same shape
-- ---------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA erp GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erp_app, erp_researcher;
ALTER DEFAULT PRIVILEGES IN SCHEMA erp GRANT SELECT ON TABLES TO erp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA ai  GRANT SELECT, INSERT, UPDATE ON TABLES TO erp_app, erp_ai_agent, erp_researcher;
ALTER DEFAULT PRIVILEGES IN SCHEMA research GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO erp_researcher;
ALTER DEFAULT PRIVILEGES IN SCHEMA tools GRANT EXECUTE ON FUNCTIONS TO erp_app, erp_ai_agent, erp_researcher;

-- =====================================================================
-- Row-level security
-- Applies to erp_app. The AI service is already fenced off by the
-- absence of table grants; RLS is the second, independent layer.
-- =====================================================================

ALTER TABLE erp.customers      ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE erp.expenses       ENABLE ROW LEVEL SECURITY;

-- Admins and managers see everything
DROP POLICY IF EXISTS p_customers_manage ON erp.customers;
CREATE POLICY p_customers_manage ON erp.customers
    FOR ALL
    USING (erp.current_role_code() IN ('ADMIN', 'MANAGER'))
    WITH CHECK (erp.current_role_code() IN ('ADMIN', 'MANAGER'));

-- Ordinary users only see the customers they created
DROP POLICY IF EXISTS p_customers_own ON erp.customers;
CREATE POLICY p_customers_own ON erp.customers
    FOR ALL
    USING (erp.current_role_code() = 'USER' AND created_by = erp.current_user_id())
    WITH CHECK (erp.current_role_code() = 'USER' AND created_by = erp.current_user_id());

DROP POLICY IF EXISTS p_sales_manage ON erp.sales_invoices;
CREATE POLICY p_sales_manage ON erp.sales_invoices
    FOR ALL
    USING (erp.current_role_code() IN ('ADMIN', 'MANAGER'))
    WITH CHECK (erp.current_role_code() IN ('ADMIN', 'MANAGER'));

DROP POLICY IF EXISTS p_sales_own ON erp.sales_invoices;
CREATE POLICY p_sales_own ON erp.sales_invoices
    FOR ALL
    USING (erp.current_role_code() = 'USER' AND created_by = erp.current_user_id())
    WITH CHECK (erp.current_role_code() = 'USER' AND created_by = erp.current_user_id());

-- Expenses are finance data: managers and admins only
DROP POLICY IF EXISTS p_expenses_manage ON erp.expenses;
CREATE POLICY p_expenses_manage ON erp.expenses
    FOR ALL
    USING (erp.current_role_code() IN ('ADMIN', 'MANAGER'))
    WITH CHECK (erp.current_role_code() IN ('ADMIN', 'MANAGER'));

-- The generator and harness bypass RLS deliberately
ALTER TABLE erp.customers      FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.sales_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE erp.expenses       FORCE ROW LEVEL SECURITY;
ALTER ROLE erp_researcher BYPASSRLS;

COMMENT ON POLICY p_sales_own ON erp.sales_invoices IS 'Scopes an ordinary user to their own invoices. Authorisation probes in research.authorisation_probes test whether the AI layer can be talked past this.';
