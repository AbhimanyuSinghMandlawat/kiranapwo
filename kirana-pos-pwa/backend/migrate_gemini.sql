-- =====================================================
-- Kirana POS – Gemini AI Bill Engine Migration
-- Run via Node: node run_migration.js
-- =====================================================

USE kirana_pos;

CREATE TABLE IF NOT EXISTS suppliers (
  id              VARCHAR(64)   PRIMARY KEY,
  shop_id         INT           NOT NULL,
  name            VARCHAR(120)  NOT NULL,
  business_name   VARCHAR(120),
  mobile          VARCHAR(15),
  gst_number      VARCHAR(20),
  address         TEXT,
  created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id) REFERENCES shops(id) ON DELETE CASCADE,
  INDEX idx_supplier_shop   (shop_id),
  INDEX idx_supplier_mobile (mobile),
  INDEX idx_supplier_gst    (gst_number)
);

CREATE TABLE IF NOT EXISTS bill_records (
  id              VARCHAR(64)    PRIMARY KEY,
  shop_id         INT            NOT NULL,
  supplier_id     VARCHAR(64),
  bill_number     VARCHAR(60),
  bill_date       VARCHAR(20),
  total_amount    DECIMAL(12,2)  DEFAULT 0,
  tax_amount      DECIMAL(12,2)  DEFAULT 0,
  payment_method  VARCHAR(30),
  items_json      JSON,
  scan_id         VARCHAR(64),
  created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shop_id)     REFERENCES shops(id)     ON DELETE CASCADE,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  INDEX idx_bill_shop     (shop_id),
  INDEX idx_bill_supplier (supplier_id),
  INDEX idx_bill_date     (bill_date)
);
