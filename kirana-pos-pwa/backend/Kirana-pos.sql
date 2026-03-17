/* ============================
   SHOPS
============================ */

CREATE TABLE shops (
 id INT AUTO_INCREMENT PRIMARY KEY,
 shop_name VARCHAR(150) NOT NULL,
 owner_name VARCHAR(150) NOT NULL,
 owner_phone VARCHAR(20) UNIQUE NOT NULL,
 password_hash VARCHAR(255) NOT NULL,
 credit_score INT DEFAULT 100,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


/* ============================
   SALES
============================ */

CREATE TABLE sales (
 id INT AUTO_INCREMENT PRIMARY KEY,
 shop_id INT NOT NULL,
 amount DECIMAL(10,2) NOT NULL,
 payment_mode VARCHAR(20),
 sale_date DATE,
 notes TEXT,
 synced BOOLEAN DEFAULT FALSE,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (shop_id) REFERENCES shops(id)
);


/* ============================
   CUSTOMERS
============================ */

CREATE TABLE customers (
 id INT AUTO_INCREMENT PRIMARY KEY,
 shop_id INT NOT NULL,
 name VARCHAR(150),
 phone VARCHAR(20),
 loyalty_points INT DEFAULT 0,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

 FOREIGN KEY (shop_id) REFERENCES shops(id)
);


/* ============================
   STOCKS
============================ */

CREATE TABLE stocks (
 id INT AUTO_INCREMENT PRIMARY KEY,
 shop_id INT NOT NULL,
 name VARCHAR(255),
 price DECIMAL(10,2),
 qty INT,

 FOREIGN KEY (shop_id) REFERENCES shops(id)
);


/* ============================
   COUPONS
============================ */

CREATE TABLE coupons (
 id INT AUTO_INCREMENT PRIMARY KEY,
 shop_id INT NOT NULL,
 code VARCHAR(50),
 discount INT,
 min_purchase INT DEFAULT 0,
 loyalty_required VARCHAR(20),
 expiry_date DATE,

 FOREIGN KEY (shop_id) REFERENCES shops(id)
);

CREATE TABLE audit_logs (
 id INT AUTO_INCREMENT PRIMARY KEY,
 shop_id INT,
 actor VARCHAR(100),
 action VARCHAR(100),
 module VARCHAR(100),
 metadata JSON,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);