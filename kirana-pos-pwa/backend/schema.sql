-- =============================================
-- Kirana POS  –  MySQL Schema  (v3)
-- =============================================

-- ----------------------------------------
-- SHOPS  (one per kirana store)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS shops (
  id             INT          AUTO_INCREMENT PRIMARY KEY,
  shop_name      VARCHAR(120) NOT NULL,
  owner_name     VARCHAR(120) NOT NULL,
  owner_phone    VARCHAR(15)  NOT NULL UNIQUE,
  owner_email    VARCHAR(180),
  owner_mobile   VARCHAR(15),
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------
-- SALES  (every transaction synced from IndexedDB)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS sales (
  id                VARCHAR(64)    PRIMARY KEY,   -- UUID from frontend
  shop_id           INT            NOT NULL,
  amount            DECIMAL(12,2)  NOT NULL,
  payment_method    VARCHAR(20),
  account_type      VARCHAR(40),
  customer_name     VARCHAR(120),
  customer_phone    VARCHAR(15),
  transaction_type  VARCHAR(40)    DEFAULT 'sale',
  stock_effect      VARCHAR(20),
  liability_effect  VARCHAR(40),
  reference_source  VARCHAR(40),
  estimated_profit  DECIMAL(12,2)  DEFAULT 0,
  sale_date         VARCHAR(20),
  notes             TEXT,
  created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_sales_shop  (shop_id),
  INDEX idx_sales_date  (sale_date),
  INDEX idx_sales_cust  (customer_name)
);

-- ----------------------------------------
-- CUSTOMERS
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id             VARCHAR(64)    PRIMARY KEY,   -- UUID from frontend
  shop_id        INT            NOT NULL,
  display_name   VARCHAR(120),
  phone          VARCHAR(15),
  lifetime_spend DECIMAL(12,2)  DEFAULT 0,
  loyalty_level  VARCHAR(20)    DEFAULT 'bronze',
  visit_count    INT            DEFAULT 0,
  created_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_cust_shop  (shop_id),
  INDEX idx_cust_phone (phone)
);

-- ----------------------------------------
-- STOCKS  (inventory items)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS stocks (
  id               VARCHAR(64)    PRIMARY KEY,
  shop_id          INT            NOT NULL,
  name             VARCHAR(120)   NOT NULL,
  price            DECIMAL(12,2)  DEFAULT 0,
  cost_price       DECIMAL(12,2)  DEFAULT 0,
  quantity         INT            DEFAULT 0,
  opening_quantity INT            DEFAULT 0,
  is_opening       TINYINT(1)     DEFAULT 0,
  created_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP      DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_stock_shop (shop_id)
);

-- ----------------------------------------
-- COUPONS
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
  id             VARCHAR(64)   PRIMARY KEY,
  shop_id        INT           NOT NULL,
  customer_id    VARCHAR(64),
  code           VARCHAR(50),
  title          VARCHAR(120),
  type           VARCHAR(30)    DEFAULT 'discount',
  value          DECIMAL(10,2)  DEFAULT 0,
  min_purchase   DECIMAL(10,2)  DEFAULT 0,
  loyalty_required VARCHAR(20)  DEFAULT 'bronze',
  used           TINYINT(1)     DEFAULT 0,
  active         TINYINT(1)     DEFAULT 1,
  issued_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  expires_at     TIMESTAMP      NULL,
  expiry_date    VARCHAR(20),
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_coupon_shop     (shop_id),
  INDEX idx_coupon_customer (customer_id)
);

-- ----------------------------------------
-- AUDIT LOGS
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
-- DAILY SUMMARIES
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
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  UNIQUE KEY uq_shop_date (shop_id, summary_date),
  INDEX idx_summary_shop (shop_id),
  INDEX idx_summary_date (summary_date)
);

-- ----------------------------------------
-- BILL SCANS  (AI scanner results)
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
  scanned_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_scan_shop (shop_id)
);

-- ----------------------------------------
-- SUPPLIERS
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
  id           VARCHAR(64)  PRIMARY KEY,
  shop_id      INT          NOT NULL,
  name         VARCHAR(120) NOT NULL,
  business_name VARCHAR(180),
  mobile       VARCHAR(15),
  gst_number   VARCHAR(20),
  address      TEXT,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sup_shop   (shop_id),
  INDEX idx_sup_name   (name),
  INDEX idx_sup_mobile (mobile),
  INDEX idx_sup_gst    (gst_number)
);

-- ----------------------------------------
-- BILL RECORDS
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS bill_records (
  id             VARCHAR(64)   PRIMARY KEY,
  shop_id        INT           NOT NULL,
  supplier_id    VARCHAR(64),
  bill_number    VARCHAR(60),
  bill_date      VARCHAR(20),
  total_amount   DECIMAL(12,2) DEFAULT 0,
  tax_amount     DECIMAL(12,2) DEFAULT 0,
  payment_method VARCHAR(30),
  items_json     JSON,
  scan_id        VARCHAR(64),
  created_at     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_br_shop     (shop_id),
  INDEX idx_br_supplier (supplier_id),
  INDEX idx_br_date     (bill_date)
);

