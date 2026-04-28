-- =============================================
-- Kirana POS  –  migrate.sql  (v2, MySQL 8.0 safe)
-- Adds all new columns and tables safely.
-- Run: mysql -u root -p kirana_pos < migrate.sql
-- =============================================

USE kirana_pos;

DROP PROCEDURE IF EXISTS kp_add_col;

DELIMITER $$
CREATE PROCEDURE kp_add_col(
  IN tbl   VARCHAR(64),
  IN col   VARCHAR(64),
  IN def   TEXT
)
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'kirana_pos'
      AND TABLE_NAME   = tbl
      AND COLUMN_NAME  = col
  ) THEN
    SET @ddl = CONCAT('ALTER TABLE `', tbl, '` ADD COLUMN `', col, '` ', def);
    PREPARE s FROM @ddl;
    EXECUTE s;
    DEALLOCATE PREPARE s;
  END IF;
END$$
DELIMITER ;

-- ----------------------------------------
-- SHOPS  –  new owner contact fields
-- ----------------------------------------
CALL kp_add_col('shops', 'owner_email',  'VARCHAR(180)');
CALL kp_add_col('shops', 'owner_mobile', 'VARCHAR(15)');

-- ----------------------------------------
-- SALES
-- ----------------------------------------

SET @has_mode = (
  SELECT COUNT(1) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='kirana_pos' AND TABLE_NAME='sales' AND COLUMN_NAME='payment_mode'
);
SET @has_method = (
  SELECT COUNT(1) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA='kirana_pos' AND TABLE_NAME='sales' AND COLUMN_NAME='payment_method'
);

SET @sql = IF(@has_mode > 0 AND @has_method = 0,
  'ALTER TABLE sales CHANGE payment_mode payment_method VARCHAR(20)',
  IF(@has_method = 0,
    'ALTER TABLE sales ADD COLUMN payment_method VARCHAR(20)',
    'SELECT 1'
  )
);
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

ALTER TABLE sales MODIFY COLUMN id VARCHAR(64) NOT NULL;

CALL kp_add_col('sales', 'account_type',     'VARCHAR(40)');
CALL kp_add_col('sales', 'customer_name',    'VARCHAR(120)');
CALL kp_add_col('sales', 'customer_phone',   'VARCHAR(15)');
CALL kp_add_col('sales', 'transaction_type', "VARCHAR(40) DEFAULT 'sale'");
CALL kp_add_col('sales', 'stock_effect',     'VARCHAR(20)');
CALL kp_add_col('sales', 'liability_effect', 'VARCHAR(40)');
CALL kp_add_col('sales', 'reference_source', 'VARCHAR(40)');
CALL kp_add_col('sales', 'estimated_profit', 'DECIMAL(12,2) DEFAULT 0');

-- ----------------------------------------
-- CUSTOMERS
-- ----------------------------------------
ALTER TABLE customers MODIFY COLUMN id VARCHAR(64) NOT NULL;

CALL kp_add_col('customers', 'shop_id',        'INT DEFAULT NULL');
CALL kp_add_col('customers', 'display_name',   'VARCHAR(120)');
CALL kp_add_col('customers', 'lifetime_spend', 'DECIMAL(12,2) DEFAULT 0');
CALL kp_add_col('customers', 'loyalty_level',  "VARCHAR(20) DEFAULT 'bronze'");
CALL kp_add_col('customers', 'visit_count',    'INT DEFAULT 0');
CALL kp_add_col('customers', 'updated_at',     'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- ----------------------------------------
-- STOCKS
-- ----------------------------------------
ALTER TABLE stocks MODIFY COLUMN id VARCHAR(64) NOT NULL;

CALL kp_add_col('stocks', 'shop_id',          'INT DEFAULT NULL');
CALL kp_add_col('stocks', 'cost_price',       'DECIMAL(12,2) DEFAULT 0');
CALL kp_add_col('stocks', 'opening_quantity', 'INT DEFAULT 0');
CALL kp_add_col('stocks', 'is_opening',       'TINYINT(1) DEFAULT 0');
CALL kp_add_col('stocks', 'updated_at',       'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

-- ----------------------------------------
-- COUPONS
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id               VARCHAR(64)    PRIMARY KEY,
  shop_id          INT            DEFAULT NULL,
  customer_id      VARCHAR(64)    DEFAULT NULL,
  code             VARCHAR(50)    DEFAULT NULL,
  title            VARCHAR(120)   DEFAULT NULL,
  type             VARCHAR(30)    DEFAULT 'discount',
  value            DECIMAL(10,2)  DEFAULT 0,
  min_purchase     DECIMAL(10,2)  DEFAULT 0,
  loyalty_required VARCHAR(20)    DEFAULT 'bronze',
  used             TINYINT(1)     DEFAULT 0,
  active           TINYINT(1)     DEFAULT 1,
  issued_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  expires_at       TIMESTAMP      NULL,
  expiry_date      VARCHAR(20)    DEFAULT NULL
);

CALL kp_add_col('coupons', 'title',            'VARCHAR(120)');
CALL kp_add_col('coupons', 'loyalty_required', "VARCHAR(20) DEFAULT 'bronze'");
CALL kp_add_col('coupons', 'active',           'TINYINT(1) DEFAULT 1');
CALL kp_add_col('coupons', 'expiry_date',      'VARCHAR(20)');

-- ----------------------------------------
-- AUDIT LOGS  (new table)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id           VARCHAR(64)   PRIMARY KEY,
  shop_id      INT,
  actor_id     VARCHAR(64),
  actor_name   VARCHAR(120),
  actor_role   VARCHAR(30),
  action       VARCHAR(60)   NOT NULL,
  module       VARCHAR(40),
  target_id    VARCHAR(64),
  metadata     JSON,
  log_date     VARCHAR(20),
  timestamp    BIGINT,
  created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_shop   (shop_id),
  INDEX idx_audit_date   (log_date),
  INDEX idx_audit_module (module)
);

-- ----------------------------------------
-- DAILY SUMMARIES  (new table)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS daily_summaries (
  id             VARCHAR(64)   PRIMARY KEY,
  shop_id        INT           NOT NULL,
  summary_date   VARCHAR(20)   NOT NULL,
  total_sales    DECIMAL(12,2) DEFAULT 0,
  total_profit   DECIMAL(12,2) DEFAULT 0,
  transactions   INT           DEFAULT 0,
  credit_given   DECIMAL(12,2) DEFAULT 0,
  cash_total     DECIMAL(12,2) DEFAULT 0,
  upi_total      DECIMAL(12,2) DEFAULT 0,
  card_total     DECIMAL(12,2) DEFAULT 0,
  top_items      JSON,
  breakdown      JSON,
  sent_email     TINYINT(1)    DEFAULT 0,
  sent_whatsapp  TINYINT(1)    DEFAULT 0,
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_shop_date (shop_id, summary_date)
);

-- ----------------------------------------
-- BILL SCANS  (AI scanner, new table)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS bill_scans (
  id              VARCHAR(64)   PRIMARY KEY,
  shop_id         INT,
  gst_number      VARCHAR(20),
  bill_number     VARCHAR(60),
  supplier_name   VARCHAR(120),
  supplier_mobile VARCHAR(15),
  raw_text        LONGTEXT,
  items_json      JSON,
  confidence      DECIMAL(5,2)  DEFAULT 0,
  scanned_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------
-- SUPPLIERS  (AI Bill Engine)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id            VARCHAR(64)   PRIMARY KEY,
  shop_id       INT           NOT NULL,
  name          VARCHAR(120)  NOT NULL,
  business_name VARCHAR(180),
  mobile        VARCHAR(15),
  gst_number    VARCHAR(20),
  address       TEXT,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sup_shop (shop_id),
  INDEX idx_sup_name (name)
);

-- ----------------------------------------
-- BILL RECORDS  (AI Bill Engine)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS bill_records (
  id             VARCHAR(64)   PRIMARY KEY,
  shop_id        INT           NOT NULL,
  supplier_id    VARCHAR(64),
  bill_number    VARCHAR(60),
  bill_date      VARCHAR(20),
  total_amount   DECIMAL(12,2) DEFAULT 0,
  tax_amount     DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(20),
  items_json     JSON,
  scan_id        VARCHAR(64),
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_br_shop     (shop_id),
  INDEX idx_br_supplier (supplier_id),
  INDEX idx_br_date     (bill_date)
);

-- Cleanup
DROP PROCEDURE IF EXISTS kp_add_col;

SELECT 'Migration v2 complete ✓' AS status;
