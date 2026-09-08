-- =====================================================================
-- File   : 17_security_probe.sql
-- Purpose: Prove the AI service's access boundary is enforced by the
--          database, not by the prompt. This is an experimental result,
--          so it is tested rather than assumed.
--
--          Six probes. Run as a superuser; the script switches into the
--          erp_ai_agent role itself via SET ROLE, so privilege checks
--          apply exactly as they would over a real connection.
--
-- Usage  : psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 17_security_probe.sql
-- Expect : six PASS lines, then RESULT: all six probes passed.
-- =====================================================================

BEGIN;

DO $$
DECLARE
    v_pass  INT := 0;
    v_fail  INT := 0;
    v_dummy TEXT;
    v_rev   NUMERIC;
BEGIN
    SET LOCAL ROLE erp_ai_agent;
    RAISE NOTICE 'acting as: %', current_user;

    -- Probe 1: direct read of business data must be refused
    BEGIN
        EXECUTE 'SELECT 1 FROM erp.sales_invoices LIMIT 1' INTO v_dummy;
        RAISE NOTICE 'FAIL  1  erp.sales_invoices was readable';
        v_fail := v_fail + 1;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS  1  erp.sales_invoices refused (%)', SQLERRM;
        v_pass := v_pass + 1;
    END;

    -- Probe 2: direct write to business data must be refused
    BEGIN
        EXECUTE 'INSERT INTO erp.products (sku, name) VALUES (''HACK-1'', ''injected'')';
        RAISE NOTICE 'FAIL  2  erp.products accepted an INSERT';
        v_fail := v_fail + 1;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS  2  erp.products write refused';
        v_pass := v_pass + 1;
    END;

    -- Probe 3: benchmark gold answers must be invisible to the system under test
    BEGIN
        EXECUTE 'SELECT 1 FROM research.benchmark_questions LIMIT 1' INTO v_dummy;
        RAISE NOTICE 'FAIL  3  research.benchmark_questions was readable';
        v_fail := v_fail + 1;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS  3  research.benchmark_questions refused';
        v_pass := v_pass + 1;
    END;

    -- Probe 4: injected ground truth must be invisible
    BEGIN
        EXECUTE 'SELECT 1 FROM research.injected_events LIMIT 1' INTO v_dummy;
        RAISE NOTICE 'FAIL  4  research.injected_events was readable';
        v_fail := v_fail + 1;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS  4  research.injected_events refused';
        v_pass := v_pass + 1;
    END;

    -- Probe 5: the sanctioned path must still work
    PERFORM set_config('app.user_id',   '2',       TRUE);
    PERFORM set_config('app.role_code', 'MANAGER', TRUE);
    BEGIN
        SELECT s.net_revenue INTO v_rev
          FROM tools.get_sales_summary(CURRENT_DATE - 30, CURRENT_DATE) s;
        RAISE NOTICE 'PASS  5  tools.get_sales_summary reachable as MANAGER';
        v_pass := v_pass + 1;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL  5  sanctioned tool call broke: %', SQLERRM;
        v_fail := v_fail + 1;
    END;

    -- Probe 6: scope guard holds inside the sanctioned path
    PERFORM set_config('app.role_code', 'USER', TRUE);
    BEGIN
        PERFORM * FROM tools.get_profit_breakdown(CURRENT_DATE - 30, CURRENT_DATE);
        RAISE NOTICE 'FAIL  6  USER role reached the FINANCE scope';
        v_fail := v_fail + 1;
    EXCEPTION WHEN insufficient_privilege THEN
        RAISE NOTICE 'PASS  6  FINANCE scope denied to USER';
        v_pass := v_pass + 1;
    END;

    RESET ROLE;

    IF v_fail > 0 THEN
        RAISE EXCEPTION 'RESULT: % of 6 probes FAILED. The access boundary is not enforced.', v_fail;
    END IF;
    RAISE NOTICE 'RESULT: all six probes passed. Boundary is enforced by the database.';
END;
$$;

ROLLBACK;
