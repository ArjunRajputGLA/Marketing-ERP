-- =====================================================================
-- File   : 03_master_data.sql
-- Purpose: Warehouses, categories, products, customers, suppliers
-- =====================================================================

-- ---------------------------------------------------------------------
-- warehouses  (single default row is enough for the core scope)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.warehouses (
    warehouse_id  SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          TEXT         NOT NULL UNIQUE,
    name          TEXT         NOT NULL,
    location      TEXT,
    is_default    BOOLEAN      NOT NULL DEFAULT FALSE,
    is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Exactly one default warehouse
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_single_default
    ON erp.warehouses((is_default)) WHERE is_default;

DROP TRIGGER IF EXISTS trg_warehouses_updated_at ON erp.warehouses;
CREATE TRIGGER trg_warehouses_updated_at
    BEFORE UPDATE ON erp.warehouses
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

-- ---------------------------------------------------------------------
-- categories  (self-referencing, one level is plenty)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.categories (
    category_id         INTEGER      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                TEXT         NOT NULL UNIQUE,
    parent_category_id  INTEGER      REFERENCES erp.categories(category_id),
    description         TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT categories_not_self_parent_chk CHECK (parent_category_id IS DISTINCT FROM category_id)
);

DROP TRIGGER IF EXISTS trg_categories_updated_at ON erp.categories;
CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON erp.categories
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

-- ---------------------------------------------------------------------
-- products
-- stock_on_hand is a cached projection of erp.inventory_movements,
-- maintained by trigger. erp.recalculate_stock_on_hand() rebuilds it
-- from the ledger and must be used to assert consistency in tests.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.products (
    product_id     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sku            TEXT          NOT NULL UNIQUE,
    name           TEXT          NOT NULL,
    description    TEXT,
    category_id    INTEGER       REFERENCES erp.categories(category_id),
    unit           TEXT          NOT NULL DEFAULT 'PCS'
                                 CHECK (unit IN ('PCS', 'KG', 'GM', 'LTR', 'ML', 'BOX', 'PACK', 'MTR')),
    cost_price     NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (cost_price  >= 0),
    selling_price  NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
    reorder_level  NUMERIC(14,3) NOT NULL DEFAULT 0 CHECK (reorder_level >= 0),
    stock_on_hand  NUMERIC(14,3) NOT NULL DEFAULT 0,
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON erp.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active   ON erp.products(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_products_reorder  ON erp.products(product_id) WHERE stock_on_hand <= reorder_level;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON erp.products USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_products_updated_at ON erp.products;
CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON erp.products
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

COMMENT ON COLUMN erp.products.stock_on_hand IS 'Cached from erp.inventory_movements by trigger. Never write directly; rebuild with erp.recalculate_stock_on_hand().';
COMMENT ON INDEX erp.idx_products_name_trgm IS 'Trigram index for fuzzy product-name resolution when the NLP layer maps an entity mention to a product_id.';

-- ---------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.customers (
    customer_id    BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           TEXT          NOT NULL UNIQUE,
    name           TEXT          NOT NULL,
    email          TEXT,
    phone          TEXT,
    address        TEXT,
    city           TEXT,
    state          TEXT,
    customer_type  TEXT          NOT NULL DEFAULT 'RETAIL'
                                 CHECK (customer_type IN ('RETAIL', 'WHOLESALE', 'CORPORATE')),
    credit_limit   NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (credit_limit >= 0),
    is_active      BOOLEAN       NOT NULL DEFAULT TRUE,
    created_by     BIGINT        REFERENCES erp.users(user_id),
    created_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_active    ON erp.customers(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_customers_type      ON erp.customers(customer_type);
CREATE INDEX IF NOT EXISTS idx_customers_owner     ON erp.customers(created_by);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON erp.customers USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_customers_updated_at ON erp.customers;
CREATE TRIGGER trg_customers_updated_at
    BEFORE UPDATE ON erp.customers
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

-- ---------------------------------------------------------------------
-- suppliers
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.suppliers (
    supplier_id     BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code            TEXT         NOT NULL UNIQUE,
    name            TEXT         NOT NULL,
    contact_person  TEXT,
    email           TEXT,
    phone           TEXT,
    address         TEXT,
    city            TEXT,
    state           TEXT,
    lead_time_days  SMALLINT     NOT NULL DEFAULT 7 CHECK (lead_time_days >= 0),
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    created_by      BIGINT       REFERENCES erp.users(user_id),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active    ON erp.suppliers(is_active) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_suppliers_name_trgm ON erp.suppliers USING gin (name gin_trgm_ops);

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON erp.suppliers;
CREATE TRIGGER trg_suppliers_updated_at
    BEFORE UPDATE ON erp.suppliers
    FOR EACH ROW EXECUTE FUNCTION erp.set_updated_at();

-- ---------------------------------------------------------------------
-- product_suppliers  (which supplier supplies what, at what cost)
-- Needed for the supplier price-anomaly automation.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS erp.product_suppliers (
    product_id      BIGINT        NOT NULL REFERENCES erp.products(product_id)  ON DELETE CASCADE,
    supplier_id     BIGINT        NOT NULL REFERENCES erp.suppliers(supplier_id) ON DELETE CASCADE,
    last_cost_price NUMERIC(14,2) CHECK (last_cost_price >= 0),
    is_preferred    BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, supplier_id)
);
