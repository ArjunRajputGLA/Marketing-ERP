# Minimal ERP + Evidence-Grounded Multi-Agent AI — PostgreSQL Schema

Twenty SQL files, run in numeric order. Verified end-to-end on PostgreSQL 16: a full
teardown-and-rebuild followed by `16_smoke_test.sql` passes with every assertion green.

**41 tables** (17 `erp`, 16 `ai`, 8 `research`), **14 views**, **17 controlled tool functions**.

---

## 1. How to run it

### psql (recommended — one command)

```bash
createdb -U postgres erp_ai
cd erp_schema
psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 00_run_all.sql
psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 16_smoke_test.sql
psql -U postgres -d erp_ai -v ON_ERROR_STOP=1 -f 17_security_probe.sql
```

### pgAdmin 4

`00_run_all.sql` uses `\i`, which is a psql meta-command and will **not** run in the pgAdmin
Query Tool. In pgAdmin, create the database, then open files `01` through `15` in the Query
Tool and execute them one at a time, in order. Then run `16_smoke_test.sql` — it wraps itself
in a transaction and rolls back, so it leaves no data behind.

`14_security_roles_rls.sql` issues `CREATE ROLE`, so connect as `postgres` or another
superuser for that file at minimum.

`99_teardown.sql` drops all four schemas and the four roles. Use it to get back to clean.

---

## 2. File map

| File | Contents |
|---|---|
| `01_schemas_and_extensions.sql` | Four schemas, `pgcrypto` + `pg_trgm`, request-context helpers, shared triggers |
| `02_auth_and_users.sql` | `roles`, `users`, append-only `audit_log` |
| `03_master_data.sql` | `warehouses`, `categories`, `products`, `customers`, `suppliers`, `product_suppliers` |
| `04_sales.sql` | `sales_invoices`, `sales_invoice_items` with generated line arithmetic |
| `05_purchases.sql` | `purchase_invoices`, `purchase_invoice_items` |
| `06_inventory.sql` | Append-only `inventory_movements` ledger + `recalculate_stock_on_hand()` |
| `07_expenses_payments.sql` | `expense_categories`, `expenses`, `payments` |
| `08_business_logic_triggers.sql` | Cost snapshot, header recomputation, payment status, stock posting |
| `09_reporting_views.sql` | 12 deterministic analytics views — Baseline A reads these |
| `10_ai_layer.sql` | `query_runs`, `tool_calls`, `agent_findings`, `finding_evidence`, `consensus_results`, `alerts` |
| `11_ml_layer.sql` | `model_registry`, `forecasts`, per-fold `forecast_evaluations`, `anomaly_scores` |
| `12_research_benchmark.sql` | `dataset_generations`, `injected_events`, `benchmark_questions`, `experiment_runs`, `evaluation_results` |
| `13_controlled_tools.sql` | The 17 functions the AI service is allowed to call |
| `14_security_roles_rls.sql` | Four database roles, grants, row-level security |
| `15_seed_reference_data.sql` | Roles, three demo users, categories, baseline models, consensus weight profiles |
| `16_smoke_test.sql` | Transaction-flow regression test. Run after every schema change. |
| `17_security_probe.sql` | Six probes proving the AI role's access boundary. Run after any grant change. |
| `99_teardown.sql` | Drop everything |

---

## 3. Schema boundaries

```
erp       business master + transaction data (source of truth)
ai        agent execution traces, ML outputs
research  ground truth, benchmark, experiment results
tools     the ONLY surface the AI service can touch
```

The separation is not cosmetic — it is the access-control result in your evaluation.
`erp_ai_agent` has **zero table privileges** on `erp` and **zero access** to `research`.
It can only `EXECUTE` functions in `tools`, and write its own trace rows in `ai`. That means
your leakage metric measures an enforced database guarantee rather than how well a prompt
held up.

The `tools` functions are `SECURITY DEFINER`, owned by **`erp_tools_owner`** — a NOLOGIN role
with read-only access to `erp` and nothing on `research`. That is the privilege ceiling for
every tool call: a bug in any tool function is a read of business data, never a write and
never a superuser compromise. `17_security_probe.sql` asserts all of this in six probes.

Connection strings:

```
erp_app         postgresql://erp_app:...@host/erp_ai          Next.js
erp_ai_agent    postgresql://erp_ai_agent:...@host/erp_ai     FastAPI
erp_researcher  postgresql://erp_researcher:...@host/erp_ai   generator + harness (BYPASSRLS)
erp_readonly    postgresql://erp_readonly:...@host/erp_ai     Baseline A dashboards
erp_tools_owner  (NOLOGIN)                                    owns the tools functions
```

**Change the four placeholder passwords in `14` before anything leaves localhost.**

---

## 4. Rules the application must follow

**Transaction flow.** Insert the header as `DRAFT`, insert the line items, then update
`status` to `'CONFIRMED'`. Confirmation is what posts inventory movements. Nothing in a
`DRAFT` or `CANCELLED` document appears in any reporting view.

```sql
INSERT INTO erp.sales_invoices (invoice_no, invoice_date, customer_id, warehouse_id, created_by)
VALUES ('SI-0001', CURRENT_DATE, 12, 1, 2) RETURNING sales_invoice_id;

INSERT INTO erp.sales_invoice_items
  (sales_invoice_id, line_no, product_id, quantity, unit_price, discount_percent, tax_percent)
VALUES (101, 1, 55, 30, 200.00, 10, 5);

UPDATE erp.sales_invoices SET status = 'CONFIRMED' WHERE sales_invoice_id = 101;
```

**Never write these columns directly.** All are trigger-maintained:
`subtotal`, `discount_amount`, `tax_amount`, `total_amount`, `cogs_amount`, `amount_paid`,
`payment_status`, `products.stock_on_hand`.

**Set the request context on every connection** before touching RLS-protected tables or
calling `tools`:

```sql
SELECT set_config('app.user_id',   '7',       true);
SELECT set_config('app.role_code', 'MANAGER', true);
```

**Corrections to stock are reversing entries, not edits.** `inventory_movements` rejects
`UPDATE` and `DELETE` by trigger.

---

## 5. Design decisions worth knowing

**Line arithmetic is in `GENERATED ALWAYS AS ... STORED` columns.** No application code can
produce an internally inconsistent invoice line. Since your central claim is that every
number traces to the database, the database has to be right by construction.

**`unit_cost` is snapshotted onto each sales line at insert time.** Gross profit stays
correct even after product costs change later. Purchases update `cost_price` by weighted
moving average.

**`net_revenue = subtotal - discount_amount`, tax excluded.** Used identically in every view
and tool. Pick one convention and never deviate; mixed conventions are the most common source
of "the AI's number disagrees with the dashboard."

**`stock_on_hand` is a cache, the ledger is the truth.** `erp.recalculate_stock_on_hand(NULL)`
returns any drift. An empty result means consistent — assert that in CI.

**`ai.finding_evidence` is relational, not JSON.** One row per number an agent asserts, each
pointing at the `tool_call_id` that produced it. Evidence grounding rate is then a plain SQL
count (`ai.v_run_grounding`) rather than something the model reports about itself. A row with
`tool_call_id IS NULL` is an ungrounded number.

**`research.injected_events.is_decoy`** marks a real, detectable anomaly that is *not* a cause.
`decoy_not_causal_chk` keeps the flags coherent. Without decoys in your generated data, a
single-agent baseline will match the multi-agent system and your ablation will show nothing.

**`benchmark_questions.split`** is `DEV` or `TEST`, and frozen questions are protected by
trigger. Fit consensus weights, thresholds and prompts on `DEV` only. `ai.agent_reliability`
has a `CHECK` that restricts calibration to `DEV`, so the historical-reliability term in your
consensus score cannot be fitted on test questions even by accident.

**`ai.consensus_weight_profiles`** stores named weight sets whose four weights must sum to 1.
Three are pre-seeded: `default_v1`, plus `equal_weights` and `no_conflict` as ready-made
ablation arms.

**`ai.forecasts.origin_date`** records the cut-off the model was allowed to see, and
`forecast_evaluations` stores results per fold. Report mean and standard deviation across
folds from a rolling origin — a single random split leaks the future.

---

## 6. ORM configuration

Prisma needs the multi-schema preview feature:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["erp", "ai"]
}
```

Then `npx prisma db pull` to introspect. Do **not** include `research` in the Next.js
datasource — the frontend has no business reading gold answers.

Drizzle: use `pgSchema("erp")` and `pgSchema("ai")`.

Either way, treat the SQL files as the source of truth and introspect from them. Do not let
the ORM generate migrations that redefine these tables; it will drop the generated columns
and the triggers.

---

## 7. What is deliberately not here

No GST/compliance engine, no payroll, no multi-company, no payment gateway — matching §16 of
the scope report. Warehouses exist as a single default row so the ledger has a foreign key,
not as a multi-location feature.

Not yet built, in dependency order:

1. Python synthetic data generator writing to `research.dataset_generations` and `research.injected_events`
2. The agent finding JSON contract that FastAPI serialises into `ai.agent_findings` + `ai.finding_evidence`
3. The consensus score formula, written out properly, reading `ai.consensus_weight_profiles`
4. The benchmark question set with its DEV/TEST split
5. The scoring harness that populates `research.evaluation_results`
