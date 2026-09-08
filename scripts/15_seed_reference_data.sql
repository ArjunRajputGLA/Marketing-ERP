-- =====================================================================
-- File   : 15_seed_reference_data.sql
-- Purpose: Reference rows only. This is NOT the synthetic dataset.
--          Transactions come from the Python generator, which records
--          its seed in research.dataset_generations.
-- Idempotent: safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
INSERT INTO erp.roles (code, name, description) VALUES
    ('ADMIN',   'Administrator', 'Full access to all modules, users and financial data'),
    ('MANAGER', 'Manager',       'Full read across modules, may operate sales, purchases and inventory'),
    ('USER',    'Staff User',    'Sales and inventory only, restricted to own records')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
-- Demo accounts. Password for all three is: Password@123
-- Replace before any deployment.
-- ---------------------------------------------------------------------
INSERT INTO erp.users (username, email, full_name, password_hash, role_id)
SELECT v.username, v.email, v.full_name, crypt('Password@123', gen_salt('bf')), r.role_id
FROM (VALUES
    ('admin',   'admin@erpdemo.local',   'System Administrator', 'ADMIN'),
    ('manager', 'manager@erpdemo.local', 'Operations Manager',   'MANAGER'),
    ('staff',   'staff@erpdemo.local',   'Sales Staff',          'USER')
) AS v(username, email, full_name, role_code)
JOIN erp.roles r ON r.code = v.role_code
ON CONFLICT (username) DO NOTHING;

-- ---------------------------------------------------------------------
INSERT INTO erp.warehouses (code, name, location, is_default) VALUES
    ('WH-MAIN', 'Main Warehouse', 'Primary storage', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------
INSERT INTO erp.categories (name, description) VALUES
    ('Electronics',      'Consumer electronics and accessories'),
    ('Home Appliances',  'Small and large household appliances'),
    ('Stationery',       'Office and school supplies'),
    ('Groceries',        'Packaged food and daily consumables'),
    ('Personal Care',    'Health, hygiene and cosmetics'),
    ('Furniture',        'Home and office furniture'),
    ('Apparel',          'Clothing and footwear'),
    ('Hardware',         'Tools and building supplies')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
INSERT INTO erp.expense_categories (name, is_fixed_cost, description) VALUES
    ('Rent',              TRUE,  'Premises rent'),
    ('Salaries',          TRUE,  'Staff salaries and wages'),
    ('Utilities',         FALSE, 'Electricity, water, internet'),
    ('Logistics',         FALSE, 'Freight, courier and delivery'),
    ('Marketing',         FALSE, 'Advertising and promotion'),
    ('Maintenance',       FALSE, 'Repairs and upkeep'),
    ('Software & IT',     TRUE,  'Subscriptions, licences, hosting'),
    ('Packaging',         FALSE, 'Packing material and consumables'),
    ('Travel',            FALSE, 'Business travel'),
    ('Professional Fees', FALSE, 'Audit, legal and consultancy'),
    ('Miscellaneous',     FALSE, 'Uncategorised spend')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------
-- Baseline forecast model, registered up front so every learned model
-- has something to be reported against.
-- ---------------------------------------------------------------------
INSERT INTO ai.model_registry (model_name, model_version, model_type, algorithm,
                               hyperparameters, is_baseline, notes)
VALUES ('naive_moving_average', 'v1', 'FORECAST', 'moving_average',
        '{"window_days": 7}'::jsonb, TRUE,
        'Mandatory comparator. Any learned forecaster must beat this on rolling-origin MAE to be worth reporting.')
ON CONFLICT (model_name, model_version) DO NOTHING;

INSERT INTO ai.model_registry (model_name, model_version, model_type, algorithm,
                               hyperparameters, is_baseline, notes)
VALUES ('zscore_threshold', 'v1', 'ANOMALY', 'rolling_zscore',
        '{"window_days": 30, "z_threshold": 3.0}'::jsonb, TRUE,
        'Statistical anomaly baseline to compare Isolation Forest against.')
ON CONFLICT (model_name, model_version) DO NOTHING;

-- ---------------------------------------------------------------------
-- Default consensus weight profile. These are starting values only.
-- Fit them on the DEV split; never on TEST.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai.consensus_weight_profiles (
    profile_name   TEXT         PRIMARY KEY,
    w_evidence     NUMERIC(4,3) NOT NULL,
    w_validity     NUMERIC(4,3) NOT NULL,
    w_confidence   NUMERIC(4,3) NOT NULL,
    w_reliability  NUMERIC(4,3) NOT NULL,
    conflict_lambda NUMERIC(4,3) NOT NULL,
    strong_threshold   NUMERIC(4,3) NOT NULL DEFAULT 0.70,
    moderate_threshold NUMERIC(4,3) NOT NULL DEFAULT 0.45,
    fitted_on_split TEXT NOT NULL DEFAULT 'DEV' CHECK (fitted_on_split = 'DEV'),
    is_frozen      BOOLEAN      NOT NULL DEFAULT FALSE,
    notes          TEXT,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT weights_sum_to_one_chk CHECK (
        ROUND(w_evidence + w_validity + w_confidence + w_reliability, 3) = 1.000
    )
);

COMMENT ON TABLE ai.consensus_weight_profiles IS 'Named weight sets for the evidence-weighted consensus score. The CHECK constraint forces the four weights to sum to 1 so the score stays on a comparable scale across ablations.';

INSERT INTO ai.consensus_weight_profiles
    (profile_name, w_evidence, w_validity, w_confidence, w_reliability, conflict_lambda, notes)
VALUES
    ('equal_weights',   0.250, 0.250, 0.250, 0.250, 0.000, 'Ablation arm: no learned weighting, no conflict penalty'),
    ('no_conflict',     0.400, 0.300, 0.200, 0.100, 0.000, 'Ablation arm: weighted but conflict penalty disabled'),
    ('default_v1',      0.400, 0.300, 0.200, 0.100, 0.250, 'Starting point before DEV-split tuning')
ON CONFLICT (profile_name) DO NOTHING;
