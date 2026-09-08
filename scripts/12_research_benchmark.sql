-- =====================================================================
-- File   : 12_research_benchmark.sql
-- Purpose: Dataset provenance, injected ground truth, the frozen
--          benchmark, experiment configurations and scored results.
--
-- Two design rules are enforced structurally here:
--   1. Questions carry a DEV / TEST split. Consensus weights and agent
--      reliability may only be fitted on DEV. TEST is scored once.
--   2. Injected events can be marked as decoys. A decoy is a real,
--      detectable anomaly that does NOT explain the outcome. Without
--      decoys, a single-agent baseline scores as well as the multi-agent
--      system and the ablation demonstrates nothing.
-- =====================================================================

-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.dataset_generations (
    dataset_id         BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               TEXT         NOT NULL UNIQUE,
    random_seed        BIGINT       NOT NULL,
    generator_version  TEXT         NOT NULL,
    period_start       DATE         NOT NULL,
    period_end         DATE         NOT NULL,
    n_products         INTEGER,
    n_customers        INTEGER,
    n_suppliers        INTEGER,
    n_sales_invoices   INTEGER,
    parameters         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    git_commit         TEXT,
    generated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    notes              TEXT,
    CONSTRAINT dataset_period_chk CHECK (period_end > period_start)
);

COMMENT ON TABLE research.dataset_generations IS 'One row per synthetic-data build. random_seed plus generator_version must be sufficient to reproduce the database byte-for-byte.';

-- ---------------------------------------------------------------------
-- injected_events : the ground truth
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.injected_events (
    event_id        BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id      BIGINT        NOT NULL REFERENCES research.dataset_generations(dataset_id) ON DELETE CASCADE,
    event_code      TEXT          NOT NULL,
    event_type      TEXT          NOT NULL
                                  CHECK (event_type IN ('SEASONAL_SHIFT', 'DEMAND_DROP', 'DEMAND_SPIKE',
                                                        'DISCOUNT_INCREASE', 'PRICE_CHANGE',
                                                        'STOCK_OUT', 'SUPPLY_DELAY',
                                                        'PURCHASE_COST_INCREASE', 'EXPENSE_SPIKE',
                                                        'CUSTOMER_CHURN', 'CUSTOMER_GROWTH',
                                                        'UNUSUAL_TRANSACTION', 'MARGIN_COMPRESSION')),
    entity_type     TEXT          CHECK (entity_type IN ('PRODUCT', 'CUSTOMER', 'SUPPLIER',
                                                         'CATEGORY', 'EXPENSE_CATEGORY', 'GLOBAL')),
    entity_id       BIGINT,
    start_date      DATE          NOT NULL,
    end_date        DATE,
    magnitude       NUMERIC(10,4),
    magnitude_unit  TEXT,

    -- The anti-shortcut controls
    is_causal       BOOLEAN       NOT NULL DEFAULT TRUE,
    is_decoy        BOOLEAN       NOT NULL DEFAULT FALSE,
    is_detectable   BOOLEAN       NOT NULL DEFAULT TRUE,
    affects_module  TEXT[]        NOT NULL DEFAULT '{}',

    description     TEXT,
    ground_truth    JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_event_code UNIQUE (dataset_id, event_code),
    CONSTRAINT event_dates_chk CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT decoy_not_causal_chk CHECK (NOT (is_decoy AND is_causal))
);

CREATE INDEX IF NOT EXISTS idx_events_dataset ON research.injected_events(dataset_id, start_date);
CREATE INDEX IF NOT EXISTS idx_events_entity  ON research.injected_events(entity_type, entity_id);

COMMENT ON COLUMN research.injected_events.is_decoy       IS 'A genuine, detectable anomaly that is not a cause of the outcome under test. Systems that report it as an explanation are penalised.';
COMMENT ON COLUMN research.injected_events.is_detectable  IS 'FALSE for events deliberately left below the detection floor, used to build the insufficient-evidence question tier.';
COMMENT ON COLUMN research.injected_events.affects_module IS 'Which agents could in principle see this event, e.g. {SALES,INVENTORY}. Used to score routing decisions.';

-- ---------------------------------------------------------------------
-- benchmark_questions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.benchmark_questions (
    question_id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    dataset_id            BIGINT       NOT NULL REFERENCES research.dataset_generations(dataset_id) ON DELETE CASCADE,
    question_code         TEXT         NOT NULL,
    question_text         TEXT         NOT NULL,

    question_type         TEXT         NOT NULL
                                       CHECK (question_type IN ('SIMPLE_LOOKUP', 'COMPARISON', 'RANKING',
                                                                'TREND', 'FORECAST', 'ANOMALY',
                                                                'CAUSAL_SINGLE_MODULE', 'CAUSAL_MULTI_MODULE',
                                                                'CONFLICTING_EVIDENCE', 'INSUFFICIENT_EVIDENCE',
                                                                'AUTHORISATION_PROBE')),
    difficulty            TEXT         NOT NULL DEFAULT 'MEDIUM'
                                       CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD')),
    split                 TEXT         NOT NULL
                                       CHECK (split IN ('DEV', 'TEST')),

    -- Gold NLP labels
    gold_intent           TEXT,
    gold_entities         JSONB        NOT NULL DEFAULT '{}'::jsonb,
    gold_period_start     DATE,
    gold_period_end       DATE,
    required_agents       TEXT[]       NOT NULL DEFAULT '{}',

    -- Gold answer
    expected_answer       TEXT,
    expected_numeric      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    numeric_tolerance_pct NUMERIC(6,3) NOT NULL DEFAULT 0.5,
    expected_support_level TEXT        CHECK (expected_support_level IN ('STRONGLY_SUPPORTED',
                                                                        'MODERATELY_SUPPORTED',
                                                                        'CONFLICTING',
                                                                        'INSUFFICIENT_EVIDENCE')),
    -- Authorisation probes
    asked_as_role         TEXT         CHECK (asked_as_role IN ('ADMIN', 'MANAGER', 'USER')),
    must_be_refused       BOOLEAN      NOT NULL DEFAULT FALSE,

    is_frozen             BOOLEAN      NOT NULL DEFAULT FALSE,
    frozen_at             TIMESTAMPTZ,
    author                TEXT,
    created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_question_code UNIQUE (dataset_id, question_code)
);

CREATE INDEX IF NOT EXISTS idx_bench_split ON research.benchmark_questions(split, question_type);

COMMENT ON COLUMN research.benchmark_questions.split                 IS 'DEV is for tuning consensus weights, thresholds and prompts. TEST is scored once, at the end, unchanged.';
COMMENT ON COLUMN research.benchmark_questions.numeric_tolerance_pct IS 'Relative tolerance when scoring a numeric answer against expected_numeric.';
COMMENT ON COLUMN research.benchmark_questions.must_be_refused       IS 'TRUE for authorisation probes and for genuinely unanswerable questions. Refusal is the correct behaviour and is scored as such.';

-- Once frozen, a question cannot be edited. Prevents quiet post-hoc tuning.
CREATE OR REPLACE FUNCTION research.protect_frozen_questions()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.is_frozen AND NOT (TG_OP = 'UPDATE' AND NEW.is_frozen AND
                              NEW.question_text        IS NOT DISTINCT FROM OLD.question_text AND
                              NEW.expected_answer      IS NOT DISTINCT FROM OLD.expected_answer AND
                              NEW.expected_numeric     IS NOT DISTINCT FROM OLD.expected_numeric AND
                              NEW.expected_support_level IS NOT DISTINCT FROM OLD.expected_support_level AND
                              NEW.split                IS NOT DISTINCT FROM OLD.split) THEN
        RAISE EXCEPTION
            'Benchmark question % is frozen. Unfreeze deliberately and record why before changing gold labels.',
            OLD.question_code;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_frozen_questions ON research.benchmark_questions;
CREATE TRIGGER trg_protect_frozen_questions
    BEFORE UPDATE OR DELETE ON research.benchmark_questions
    FOR EACH ROW EXECUTE FUNCTION research.protect_frozen_questions();

-- ---------------------------------------------------------------------
-- Many-to-many: a question may have several true causes plus decoys
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.question_expected_causes (
    question_id  BIGINT   NOT NULL REFERENCES research.benchmark_questions(question_id) ON DELETE CASCADE,
    event_id     BIGINT   NOT NULL REFERENCES research.injected_events(event_id)        ON DELETE CASCADE,
    role         TEXT     NOT NULL DEFAULT 'PRIMARY_CAUSE'
                          CHECK (role IN ('PRIMARY_CAUSE', 'SECONDARY_CAUSE', 'DECOY', 'CONTEXT')),
    weight       NUMERIC(4,3) NOT NULL DEFAULT 1.0 CHECK (weight BETWEEN 0 AND 1),
    PRIMARY KEY (question_id, event_id)
);

COMMENT ON TABLE research.question_expected_causes IS 'Multi-cause gold labels. Cause recall and cause precision are computed against role = PRIMARY_CAUSE / SECONDARY_CAUSE, with DECOY rows counted as false positives when reported.';

-- ---------------------------------------------------------------------
-- experiment_runs : one per (variant x configuration) sweep
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.experiment_runs (
    experiment_run_id  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               TEXT         NOT NULL,
    dataset_id         BIGINT       NOT NULL REFERENCES research.dataset_generations(dataset_id),
    variant            TEXT         NOT NULL
                                    CHECK (variant IN ('BASELINE_A', 'BASELINE_B', 'VARIANT_C', 'PROPOSED_D')),
    split              TEXT         NOT NULL CHECK (split IN ('DEV', 'TEST')),
    ablation_label     TEXT,
    model_name         TEXT,
    model_version      TEXT,
    temperature        NUMERIC(3,2) NOT NULL DEFAULT 0.0,
    random_seed        BIGINT,
    prompt_version     TEXT,
    weight_profile     TEXT,
    consensus_weights  JSONB        NOT NULL DEFAULT '{}'::jsonb,
    config             JSONB        NOT NULL DEFAULT '{}'::jsonb,
    git_commit         TEXT,
    started_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ,
    notes              TEXT,
    CONSTRAINT uq_experiment_name UNIQUE (name)
);

COMMENT ON COLUMN research.experiment_runs.ablation_label IS 'Which component was removed, e.g. "no_conflict_penalty", "equal_weights", "no_evidence_term".';

ALTER TABLE ai.query_runs DROP CONSTRAINT IF EXISTS fk_runs_experiment;
ALTER TABLE ai.query_runs
    ADD CONSTRAINT fk_runs_experiment FOREIGN KEY (experiment_run_id)
    REFERENCES research.experiment_runs(experiment_run_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- evaluation_results : the scored outcome of one question in one run
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.evaluation_results (
    result_id             BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    experiment_run_id     BIGINT        NOT NULL REFERENCES research.experiment_runs(experiment_run_id) ON DELETE CASCADE,
    question_id           BIGINT        NOT NULL REFERENCES research.benchmark_questions(question_id),
    run_id                BIGINT        REFERENCES ai.query_runs(run_id) ON DELETE SET NULL,

    numeric_correct       BOOLEAN,
    max_relative_error    NUMERIC(10,4),
    intent_correct        BOOLEAN,
    entity_f1             NUMERIC(5,4),
    routing_precision     NUMERIC(5,4),
    routing_recall        NUMERIC(5,4),
    grounding_rate_pct    NUMERIC(5,2),
    support_level_correct BOOLEAN,
    cause_precision       NUMERIC(5,4),
    cause_recall          NUMERIC(5,4),
    decoys_reported       SMALLINT      NOT NULL DEFAULT 0,
    hallucinated_figures  SMALLINT      NOT NULL DEFAULT 0,
    refused               BOOLEAN       NOT NULL DEFAULT FALSE,
    refusal_correct       BOOLEAN,
    latency_ms            INTEGER,
    total_tokens          INTEGER,
    answer_text           TEXT,
    scorer_version        TEXT,
    scored_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    notes                 TEXT,

    CONSTRAINT uq_result_per_question UNIQUE (experiment_run_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_results_run ON research.evaluation_results(experiment_run_id);

COMMENT ON COLUMN research.evaluation_results.decoys_reported      IS 'Count of DECOY events the system offered as explanations. This is the metric a single-agent baseline is expected to lose on.';
COMMENT ON COLUMN research.evaluation_results.hallucinated_figures IS 'Numbers in the answer text with no matching ai.finding_evidence row. Should be zero for a grounded system.';

-- ---------------------------------------------------------------------
-- human_ratings : several raters per result, so agreement is computable
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.human_ratings (
    rating_id       BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    result_id       BIGINT       NOT NULL REFERENCES research.evaluation_results(result_id) ON DELETE CASCADE,
    rater_code      TEXT         NOT NULL,
    is_blind        BOOLEAN      NOT NULL DEFAULT TRUE,
    correctness     SMALLINT     CHECK (correctness    BETWEEN 1 AND 5),
    clarity         SMALLINT     CHECK (clarity        BETWEEN 1 AND 5),
    usefulness      SMALLINT     CHECK (usefulness     BETWEEN 1 AND 5),
    explainability  SMALLINT     CHECK (explainability BETWEEN 1 AND 5),
    comments        TEXT,
    rated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_rating_per_rater UNIQUE (result_id, rater_code)
);

COMMENT ON COLUMN research.human_ratings.is_blind IS 'Raters must not know which variant produced the answer. Record it so the paper can state the protocol honestly.';

-- ---------------------------------------------------------------------
-- authorisation_probes : the data-leakage result
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS research.authorisation_probes (
    probe_id           BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    experiment_run_id  BIGINT       NOT NULL REFERENCES research.experiment_runs(experiment_run_id) ON DELETE CASCADE,
    question_id        BIGINT       REFERENCES research.benchmark_questions(question_id),
    run_id             BIGINT       REFERENCES ai.query_runs(run_id) ON DELETE SET NULL,
    asked_as_role      TEXT         NOT NULL CHECK (asked_as_role IN ('ADMIN', 'MANAGER', 'USER')),
    protected_scope    TEXT         NOT NULL,
    leaked             BOOLEAN      NOT NULL,
    leak_detail        TEXT,
    blocked_at_layer   TEXT         CHECK (blocked_at_layer IN ('TOOL_FUNCTION', 'RLS', 'PROMPT', 'NOT_BLOCKED')),
    tested_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

COMMENT ON COLUMN research.authorisation_probes.blocked_at_layer IS 'A block at TOOL_FUNCTION or RLS is an enforced guarantee. A block at PROMPT is only a persuasion and should be reported as such.';

-- ---------------------------------------------------------------------
-- Headline results table for the paper, computed not typed
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW research.v_variant_scorecard AS
SELECT er.variant,
       er.split,
       er.ablation_label,
       COUNT(*)                                                              AS n_questions,
       ROUND(100.0 * AVG((rr.numeric_correct)::int), 2)                      AS numeric_accuracy_pct,
       ROUND(100.0 * AVG((rr.intent_correct)::int), 2)                       AS intent_accuracy_pct,
       ROUND(AVG(rr.grounding_rate_pct), 2)                                  AS mean_grounding_pct,
       ROUND(100.0 * AVG((rr.support_level_correct)::int), 2)                AS support_level_accuracy_pct,
       ROUND(AVG(rr.cause_precision), 4)                                     AS mean_cause_precision,
       ROUND(AVG(rr.cause_recall), 4)                                        AS mean_cause_recall,
       SUM(rr.decoys_reported)                                               AS total_decoys_reported,
       SUM(rr.hallucinated_figures)                                          AS total_hallucinated_figures,
       ROUND(AVG(rr.latency_ms))                                             AS mean_latency_ms,
       ROUND(AVG(rr.total_tokens))                                           AS mean_tokens
FROM research.experiment_runs er
JOIN research.evaluation_results rr ON rr.experiment_run_id = er.experiment_run_id
GROUP BY er.variant, er.split, er.ablation_label;
