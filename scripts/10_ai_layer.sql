-- =====================================================================
-- File   : 10_ai_layer.sql
-- Purpose: The execution trace of the multi-agent system.
--          Every question produces one ai.query_runs row; every number
--          shown to the user must be reachable from it through
--          ai.agent_findings -> ai.finding_evidence -> ai.tool_calls.
--          Evidence grounding rate is computed directly off these tables.
-- =====================================================================

-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.conversations (
    conversation_id  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id          BIGINT       REFERENCES erp.users(user_id),
    title            TEXT,
    started_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_message_at  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ai.messages (
    message_id       BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id  BIGINT       NOT NULL REFERENCES ai.conversations(conversation_id) ON DELETE CASCADE,
    role             TEXT         NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content          TEXT         NOT NULL,
    run_id           BIGINT,      -- FK added after ai.query_runs exists
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai.messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- query_runs : one row per natural-language question
-- The reproducibility columns are not optional. Without model_version,
-- temperature, seed and prompt_version, the experiment cannot be replayed.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.query_runs (
    run_id              BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conversation_id     BIGINT        REFERENCES ai.conversations(conversation_id) ON DELETE SET NULL,
    user_id             BIGINT        REFERENCES erp.users(user_id),
    acting_role_code    TEXT,

    question            TEXT          NOT NULL,
    variant             TEXT          NOT NULL DEFAULT 'PROPOSED_D'
                                      CHECK (variant IN ('BASELINE_A', 'BASELINE_B', 'VARIANT_C', 'PROPOSED_D')),

    -- NLP output
    detected_intent     TEXT,
    intent_confidence   NUMERIC(4,3)  CHECK (intent_confidence BETWEEN 0 AND 1),
    detected_entities   JSONB         NOT NULL DEFAULT '{}'::jsonb,
    period_start        DATE,
    period_end          DATE,
    compare_start       DATE,
    compare_end         DATE,
    routed_agents       TEXT[]        NOT NULL DEFAULT '{}',

    -- Reproducibility
    model_name          TEXT,
    model_version       TEXT,
    temperature         NUMERIC(3,2),
    random_seed         BIGINT,
    prompt_version      TEXT,

    -- Cost and timing
    started_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    completed_at        TIMESTAMPTZ,
    latency_ms          INTEGER,
    prompt_tokens       INTEGER,
    completion_tokens   INTEGER,

    status              TEXT          NOT NULL DEFAULT 'RUNNING'
                                      CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'REFUSED')),
    error_message       TEXT,
    final_answer        TEXT,
    experiment_run_id   BIGINT        -- FK added in file 12
);

CREATE INDEX IF NOT EXISTS idx_ai_runs_user    ON ai.query_runs(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_runs_variant ON ai.query_runs(variant);
CREATE INDEX IF NOT EXISTS idx_ai_runs_intent  ON ai.query_runs(detected_intent);

COMMENT ON COLUMN ai.query_runs.status  IS 'REFUSED is a first-class outcome, used when the evidence is insufficient. It is scored as correct on the insufficient-evidence benchmark tier.';
COMMENT ON COLUMN ai.query_runs.variant IS 'Which system produced this run. Lets all four evaluation arms share one trace schema.';

ALTER TABLE ai.messages
    DROP CONSTRAINT IF EXISTS fk_messages_run;
ALTER TABLE ai.messages
    ADD CONSTRAINT fk_messages_run FOREIGN KEY (run_id)
    REFERENCES ai.query_runs(run_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- tool_calls : every controlled-tool invocation, logged by FastAPI
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.tool_calls (
    tool_call_id   BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id         BIGINT       NOT NULL REFERENCES ai.query_runs(run_id) ON DELETE CASCADE,
    agent_code     TEXT         NOT NULL
                                CHECK (agent_code IN ('SALES', 'INVENTORY', 'FINANCE',
                                                      'CUSTOMER', 'SUPPLIER', 'COORDINATOR')),
    tool_name      TEXT         NOT NULL,
    parameters     JSONB        NOT NULL DEFAULT '{}'::jsonb,
    row_count      INTEGER,
    result_sample  JSONB,
    result_hash    TEXT,
    latency_ms     INTEGER,
    status         TEXT         NOT NULL DEFAULT 'OK'
                                CHECK (status IN ('OK', 'ERROR', 'DENIED', 'EMPTY')),
    error_message  TEXT,
    called_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_run  ON ai.tool_calls(run_id);
CREATE INDEX IF NOT EXISTS idx_tool_calls_name ON ai.tool_calls(tool_name);

COMMENT ON COLUMN ai.tool_calls.result_hash IS 'Hash of the full result set. Two runs of the same question on the same dataset must produce identical hashes; a mismatch means non-determinism somewhere in the pipeline.';
COMMENT ON COLUMN ai.tool_calls.status      IS 'DENIED means the tools layer refused on authorisation grounds. Counting these gives the access-control result.';

-- ---------------------------------------------------------------------
-- agent_findings : structured output contract for every specialist agent
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.agent_findings (
    finding_id           BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id               BIGINT        NOT NULL REFERENCES ai.query_runs(run_id) ON DELETE CASCADE,
    agent_code           TEXT          NOT NULL
                                       CHECK (agent_code IN ('SALES', 'INVENTORY', 'FINANCE',
                                                             'CUSTOMER', 'SUPPLIER')),
    conclusion           TEXT          NOT NULL,
    recommendation       TEXT,
    direction            TEXT          CHECK (direction IN ('SUPPORTS', 'REFUTES', 'NEUTRAL', 'INSUFFICIENT')),

    -- The three inputs to the consensus score, all in [0,1]
    confidence           NUMERIC(4,3)  CHECK (confidence         BETWEEN 0 AND 1),
    evidence_strength    NUMERIC(4,3)  CHECK (evidence_strength  BETWEEN 0 AND 1),
    analytical_validity  NUMERIC(4,3)  CHECK (analytical_validity BETWEEN 0 AND 1),

    is_causal_claim      BOOLEAN       NOT NULL DEFAULT FALSE,
    raw_payload          JSONB         NOT NULL DEFAULT '{}'::jsonb,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT uq_finding_per_agent_run UNIQUE (run_id, agent_code)
);

CREATE INDEX IF NOT EXISTS idx_findings_run ON ai.agent_findings(run_id);

COMMENT ON COLUMN ai.agent_findings.evidence_strength   IS 'Derived from the evidence rows, not asserted by the LLM. Suggested basis: sample size, period coverage, effect size relative to historical variance.';
COMMENT ON COLUMN ai.agent_findings.analytical_validity IS 'Whether the metric actually answers the question asked. Set by the tool contract, not by the model.';
COMMENT ON COLUMN ai.agent_findings.is_causal_claim     IS 'Flags a claim that goes beyond correlation. The coordinator must downweight or hedge these.';

-- ---------------------------------------------------------------------
-- finding_evidence : one row per number the agent used.
-- Relational, not JSON, so grounding can be checked with plain SQL.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.finding_evidence (
    evidence_id    BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    finding_id     BIGINT        NOT NULL REFERENCES ai.agent_findings(finding_id) ON DELETE CASCADE,
    tool_call_id   BIGINT        REFERENCES ai.tool_calls(tool_call_id) ON DELETE SET NULL,
    metric_name    TEXT          NOT NULL,
    metric_value   NUMERIC(18,4),
    metric_text    TEXT,
    unit           TEXT,
    period_start   DATE,
    period_end     DATE,
    entity_type    TEXT          CHECK (entity_type IN ('PRODUCT', 'CUSTOMER', 'SUPPLIER',
                                                        'CATEGORY', 'EXPENSE_CATEGORY', 'GLOBAL')),
    entity_id      BIGINT,
    source_object  TEXT,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_evidence_finding ON ai.finding_evidence(finding_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tool    ON ai.finding_evidence(tool_call_id);

COMMENT ON TABLE  ai.finding_evidence     IS 'Every figure an agent asserts. A row with tool_call_id IS NULL is an ungrounded number and must be counted against the evidence grounding rate.';
COMMENT ON COLUMN ai.finding_evidence.source_object IS 'The view or tool function the value came from, e.g. tools.get_profit_breakdown.';

-- ---------------------------------------------------------------------
-- consensus_results : the coordinator's fused verdict
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.consensus_results (
    consensus_id      BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    run_id            BIGINT        NOT NULL UNIQUE REFERENCES ai.query_runs(run_id) ON DELETE CASCADE,
    support_level     TEXT          NOT NULL
                                    CHECK (support_level IN ('STRONGLY_SUPPORTED',
                                                             'MODERATELY_SUPPORTED',
                                                             'CONFLICTING',
                                                             'INSUFFICIENT_EVIDENCE')),
    consensus_score   NUMERIC(6,4),
    agreement_score   NUMERIC(6,4),
    conflict_penalty  NUMERIC(6,4),
    weight_profile    TEXT,
    weights           JSONB         NOT NULL DEFAULT '{}'::jsonb,
    synthesis         TEXT,
    caveats           TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

COMMENT ON COLUMN ai.consensus_results.weight_profile IS 'Named weight set, e.g. "dev_tuned_v3". Records which configuration produced the verdict so results stay attributable.';
COMMENT ON COLUMN ai.consensus_results.weights        IS 'The actual w_evidence / w_validity / w_confidence / w_reliability / conflict_lambda used for this run.';

-- ---------------------------------------------------------------------
-- consensus_inputs : how much each finding contributed. Drives the UI panel.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.consensus_inputs (
    consensus_id  BIGINT        NOT NULL REFERENCES ai.consensus_results(consensus_id) ON DELETE CASCADE,
    finding_id    BIGINT        NOT NULL REFERENCES ai.agent_findings(finding_id)      ON DELETE CASCADE,
    weight        NUMERIC(6,4),
    contribution  NUMERIC(8,4),
    in_conflict   BOOLEAN       NOT NULL DEFAULT FALSE,
    rank_position SMALLINT,
    PRIMARY KEY (consensus_id, finding_id)
);

-- ---------------------------------------------------------------------
-- agent_reliability : the "historical reliability" term, made honest.
-- Calibrated on the DEV split only, then frozen before TEST is run.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.agent_reliability (
    reliability_id     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    agent_code         TEXT          NOT NULL,
    calibration_split  TEXT          NOT NULL DEFAULT 'DEV' CHECK (calibration_split IN ('DEV')),
    question_type      TEXT,
    n_observations     INTEGER       NOT NULL CHECK (n_observations > 0),
    accuracy           NUMERIC(5,4)  CHECK (accuracy BETWEEN 0 AND 1),
    reliability_score  NUMERIC(5,4)  CHECK (reliability_score BETWEEN 0 AND 1),
    calibrated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_frozen          BOOLEAN       NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_reliability UNIQUE (agent_code, question_type, calibration_split)
);

COMMENT ON TABLE ai.agent_reliability IS 'Prior agent accuracy per question type. The CHECK restricts calibration to the DEV split so the reliability term can never be fitted on TEST questions.';

-- ---------------------------------------------------------------------
-- alerts : proactive AI Insights screen
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.alerts (
    alert_id         BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    alert_type       TEXT          NOT NULL
                                   CHECK (alert_type IN ('LOW_STOCK', 'STOCK_OUT_RISK', 'SLOW_MOVER',
                                                         'SALES_ANOMALY', 'INVENTORY_ANOMALY',
                                                         'EXPENSE_ANOMALY', 'PURCHASE_PRICE_ANOMALY',
                                                         'CUSTOMER_BEHAVIOUR_CHANGE', 'MARGIN_DROP')),
    severity         TEXT          NOT NULL DEFAULT 'MEDIUM'
                                   CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    entity_type      TEXT          CHECK (entity_type IN ('PRODUCT', 'CUSTOMER', 'SUPPLIER',
                                                          'CATEGORY', 'EXPENSE_CATEGORY', 'GLOBAL')),
    entity_id        BIGINT,
    title            TEXT          NOT NULL,
    detail           TEXT,
    metric_name      TEXT,
    observed_value   NUMERIC(18,4),
    expected_value   NUMERIC(18,4),
    threshold_value  NUMERIC(18,4),
    detected_for     DATE,
    detected_by      TEXT          CHECK (detected_by IN ('RULE', 'STATISTICAL', 'ML_MODEL', 'AGENT')),
    model_id         BIGINT,       -- FK added in file 11
    status           TEXT          NOT NULL DEFAULT 'OPEN'
                                   CHECK (status IN ('OPEN', 'ACKNOWLEDGED', 'DISMISSED', 'RESOLVED')),
    acknowledged_by  BIGINT        REFERENCES erp.users(user_id),
    acknowledged_at  TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_open   ON ai.alerts(status, severity) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON ai.alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_type   ON ai.alerts(alert_type, detected_for);

-- ---------------------------------------------------------------------
-- Grounding rate, computed rather than self-reported
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW ai.v_run_grounding AS
SELECT r.run_id,
       r.variant,
       r.question,
       COUNT(fe.evidence_id)                                        AS evidence_rows,
       COUNT(fe.evidence_id) FILTER (WHERE fe.tool_call_id IS NOT NULL) AS grounded_rows,
       ROUND(100.0 * COUNT(fe.evidence_id) FILTER (WHERE fe.tool_call_id IS NOT NULL)
             / NULLIF(COUNT(fe.evidence_id), 0), 2)                 AS grounding_rate_pct,
       COUNT(DISTINCT af.agent_code)                                AS agents_reporting,
       COUNT(DISTINCT tc.tool_call_id)                              AS tool_calls_made
FROM ai.query_runs r
LEFT JOIN ai.agent_findings   af ON af.run_id     = r.run_id
LEFT JOIN ai.finding_evidence fe ON fe.finding_id = af.finding_id
LEFT JOIN ai.tool_calls       tc ON tc.run_id     = r.run_id
GROUP BY r.run_id, r.variant, r.question;
