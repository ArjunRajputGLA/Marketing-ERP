-- =====================================================================
-- File   : 00_run_all.sql
-- Purpose: Run every schema file in order.
--
-- IMPORTANT: \i is a psql meta-command. It does NOT work in the pgAdmin 4
-- Query Tool. Use one of these instead:
--
--   psql (recommended):
--       cd erp_schema
--       psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 00_run_all.sql
--
--   pgAdmin 4:
--       Open each file below in the Query Tool and execute in this order.
--       Do not skip or reorder: later files depend on earlier ones.
-- =====================================================================

\echo '=== 01 schemas and extensions ==='
\i 01_schemas_and_extensions.sql
\echo '=== 02 auth and users ==='
\i 02_auth_and_users.sql
\echo '=== 03 master data ==='
\i 03_master_data.sql
\echo '=== 04 sales ==='
\i 04_sales.sql
\echo '=== 05 purchases ==='
\i 05_purchases.sql
\echo '=== 06 inventory ledger ==='
\i 06_inventory.sql
\echo '=== 07 expenses and payments ==='
\i 07_expenses_payments.sql
\echo '=== 08 business logic triggers ==='
\i 08_business_logic_triggers.sql
\echo '=== 09 reporting views ==='
\i 09_reporting_views.sql
\echo '=== 10 ai layer ==='
\i 10_ai_layer.sql
\echo '=== 11 ml layer ==='
\i 11_ml_layer.sql
\echo '=== 12 research benchmark ==='
\i 12_research_benchmark.sql
\echo '=== 13 controlled tools ==='
\i 13_controlled_tools.sql
\echo '=== 14 security roles and rls ==='
\i 14_security_roles_rls.sql
\echo '=== 15 seed reference data ==='
\i 15_seed_reference_data.sql
\echo '=== done. run 16_smoke_test.sql to verify. ==='
