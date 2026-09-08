-- =====================================================================
-- File   : 11_ml_layer.sql
-- Purpose: Model registry, forecasts with rolling-origin evaluation,
--          and anomaly scores.
-- Note   : Forecast evaluation is stored per fold, not as a single
--          aggregate. Time-series models must be back-tested with an
--          expanding origin; a random train/test split leaks the future
--          and will be picked apart in review.
-- =====================================================================

CREATE TABLE IF NOT EXISTS ai.model_registry (
    model_id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_name            TEXT         NOT NULL,
    model_version         TEXT         NOT NULL DEFAULT 'v1',
    model_type            TEXT         NOT NULL
                                       CHECK (model_type IN ('FORECAST', 'ANOMALY', 'SEGMENTATION')),
    algorithm             TEXT         NOT NULL,
    hyperparameters       JSONB        NOT NULL DEFAULT '{}'::jsonb,
    feature_spec          JSONB        NOT NULL DEFAULT '{}'::jsonb,
    training_window_start DATE,
    training_window_end   DATE,
    random_seed           BIGINT,
    library_versions      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    artifact_path         TEXT,
    training_metrics      JSONB        NOT NULL DEFAULT '{}'::jsonb,
    is_baseline           BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active             BOOLEAN      NOT NULL DEFAULT TRUE,
    trained_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
    notes                 TEXT,
    CONSTRAINT uq_model_name_version UNIQUE (model_name, model_version)
);

COMMENT ON COLUMN ai.model_registry.is_baseline      IS 'Marks the moving-average / naive comparator. Every learned model must be reported against it.';
COMMENT ON COLUMN ai.model_registry.library_versions IS 'e.g. {"scikit-learn":"1.5.2","numpy":"2.1.0"}. Needed for the reproducibility section of the paper.';

ALTER TABLE ai.alerts DROP CONSTRAINT IF EXISTS fk_alerts_model;
ALTER TABLE ai.alerts
    ADD CONSTRAINT fk_alerts_model FOREIGN KEY (model_id)
    REFERENCES ai.model_registry(model_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------
-- forecasts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.forecasts (
    forecast_id        BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id           BIGINT        NOT NULL REFERENCES ai.model_registry(model_id) ON DELETE CASCADE,
    product_id         BIGINT        REFERENCES erp.products(product_id) ON DELETE CASCADE,
    category_id        INTEGER       REFERENCES erp.categories(category_id) ON DELETE CASCADE,
    granularity        TEXT          NOT NULL DEFAULT 'DAY'
                                     CHECK (granularity IN ('DAY', 'WEEK', 'MONTH')),
    origin_date        DATE          NOT NULL,
    target_date        DATE          NOT NULL,
    horizon_steps      SMALLINT      NOT NULL CHECK (horizon_steps > 0),
    predicted_quantity NUMERIC(14,3),
    lower_bound        NUMERIC(14,3),
    upper_bound        NUMERIC(14,3),
    actual_quantity    NUMERIC(14,3),
    generated_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),

    CONSTRAINT forecasts_target_after_origin_chk CHECK (target_date > origin_date),
    CONSTRAINT forecasts_one_subject_chk CHECK (
        (product_id IS NOT NULL)::int + (category_id IS NOT NULL)::int = 1
    ),
    CONSTRAINT uq_forecast_point UNIQUE (model_id, product_id, category_id, origin_date, target_date)
);

CREATE INDEX IF NOT EXISTS idx_forecast_product ON ai.forecasts(product_id, target_date);
CREATE INDEX IF NOT EXISTS idx_forecast_model   ON ai.forecasts(model_id, origin_date);

COMMENT ON COLUMN ai.forecasts.origin_date IS 'The cut-off date the model was allowed to see. Storing it makes the rolling-origin protocol auditable and makes leakage detectable.';

-- ---------------------------------------------------------------------
-- forecast_evaluations : one row per backtest fold
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.forecast_evaluations (
    evaluation_id  BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id       BIGINT        NOT NULL REFERENCES ai.model_registry(model_id) ON DELETE CASCADE,
    fold_no        SMALLINT      NOT NULL,
    origin_date    DATE          NOT NULL,
    horizon_steps  SMALLINT      NOT NULL,
    n_points       INTEGER       NOT NULL CHECK (n_points > 0),
    mae            NUMERIC(14,4),
    rmse           NUMERIC(14,4),
    mape           NUMERIC(9,4),
    smape          NUMERIC(9,4),
    evaluated_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_forecast_eval UNIQUE (model_id, fold_no, horizon_steps)
);

COMMENT ON TABLE ai.forecast_evaluations IS 'Per-fold rolling-origin results. Report mean and standard deviation across folds, never a single split.';

-- ---------------------------------------------------------------------
-- anomaly_scores
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.anomaly_scores (
    score_id       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id       BIGINT        REFERENCES ai.model_registry(model_id) ON DELETE CASCADE,
    entity_type    TEXT          NOT NULL
                                 CHECK (entity_type IN ('PRODUCT', 'CUSTOMER', 'SUPPLIER',
                                                        'CATEGORY', 'EXPENSE_CATEGORY', 'GLOBAL')),
    entity_id      BIGINT,
    metric_name    TEXT          NOT NULL,
    observed_date  DATE          NOT NULL,
    observed_value NUMERIC(18,4),
    expected_value NUMERIC(18,4),
    deviation      NUMERIC(18,4),
    z_score        NUMERIC(10,4),
    anomaly_score  NUMERIC(10,6),
    threshold      NUMERIC(10,6),
    is_anomaly     BOOLEAN       NOT NULL DEFAULT FALSE,
    detected_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_anomaly_point UNIQUE (model_id, entity_type, entity_id, metric_name, observed_date)
);

CREATE INDEX IF NOT EXISTS idx_anomaly_flagged ON ai.anomaly_scores(observed_date) WHERE is_anomaly;
CREATE INDEX IF NOT EXISTS idx_anomaly_entity  ON ai.anomaly_scores(entity_type, entity_id, observed_date);

-- ---------------------------------------------------------------------
-- customer_segments : optional RFM output, only if time remains
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.customer_segments (
    segment_row_id  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id        BIGINT       REFERENCES ai.model_registry(model_id) ON DELETE CASCADE,
    customer_id     BIGINT       NOT NULL REFERENCES erp.customers(customer_id) ON DELETE CASCADE,
    as_of_date      DATE         NOT NULL,
    recency_days    INTEGER,
    frequency       INTEGER,
    monetary        NUMERIC(14,2),
    cluster_id      SMALLINT,
    segment_label   TEXT,
    assigned_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_segment_point UNIQUE (model_id, customer_id, as_of_date)
);
