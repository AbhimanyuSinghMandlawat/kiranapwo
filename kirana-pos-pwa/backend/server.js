const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');

const app = express();

// CONFIG
const JWT_SECRET = 'very_secret_key_change_later';

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',          // change if different
  password: '',          // put your MySQL password
  database: 'kirana_pos'
});

// MIDDLEWARE
app.use(cors());
app.use(express.json());

// AUTH MIDDLEWARE
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ message: 'No token' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
}

// REGISTER SHOP
app.post('/api/register', async (req, res) => {
  const { shop_name, owner_name, owner_phone, password } = req.body;
  if (!shop_name || !owner_name || !owner_phone || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const password_hash = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO shops (shop_name, owner_name, owner_phone, password_hash) VALUES (?,?,?,?)',
    [shop_name, owner_name, owner_phone, password_hash],
    (err, result) => {
      if (err) {
        console.error(err);
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Phone already registered' });
        }
        return res.status(500).json({ message: 'DB error' });
      }
      return res.json({ message: 'Shop registered', shop_id: result.insertId });
    }
  );
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { owner_phone, password } = req.body;
  if (!owner_phone || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  db.query(
    'SELECT * FROM shops WHERE owner_phone = ?',
    [owner_phone],
    async (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }
      if (rows.length === 0) {
        return res.status(400).json({ message: 'Shop not found' });
      }

      const shop = rows[0];
      const valid = await bcrypt.compare(password, shop.password_hash);
      if (!valid) {
        return res.status(400).json({ message: 'Invalid password' });
      }

      const token = jwt.sign(
        { shop_id: shop.id, owner_phone: shop.owner_phone },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login success',
        token,
        shop: {
          id: shop.id,
          shop_name: shop.shop_name,
          owner_name: shop.owner_name,
          credit_score: shop.credit_score
        }
      });
    }
  );
});

// ADD SALE
app.post('/api/sales', authMiddleware, (req, res) => {
  const { amount, payment_mode, sale_date, notes } = req.body;
  const shop_id = req.user.shop_id;

  if (!amount || !payment_mode) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const dateToUse = sale_date || new Date().toISOString().slice(0, 10);

  db.query(
    'INSERT INTO sales (shop_id, amount, payment_mode, sale_date, notes, synced) VALUES (?,?,?,?,?,?)',
    [shop_id, amount, payment_mode, dateToUse, notes || null, true],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }
      res.json({ message: 'Sale added', sale_id: result.insertId });
    }
  );
});

// GET TODAY SALES SUMMARY (for dashboard later)
app.get('/api/sales/today', authMiddleware, (req, res) => {
  const shop_id = req.user.shop_id;
  const today = new Date().toISOString().slice(0, 10);

  db.query(
    'SELECT * FROM sales WHERE shop_id = ? AND sale_date = ?',
    [shop_id, today],
    (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'DB error' });
      }
      const total = rows.reduce((sum, s) => sum + Number(s.amount), 0);
      res.json({ date: today, total, count: rows.length, sales: rows });
    }
  );
});

// SIMPLE HEALTH CHECK
app.get('/', (req, res) => {
  res.send('Kirana POS backend running');
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
