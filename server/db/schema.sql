CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  specs TEXT NOT NULL DEFAULT '[]',
  base_price REAL NOT NULL,
  gst_percent REAL NOT NULL DEFAULT 18,
  price_after_gst REAL NOT NULL,
  stock_qty INTEGER DEFAULT NULL,
  warranty TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories (id)
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  gstin TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  build_name TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft', 'sent', 'accepted', 'rejected')),
  labour_charge REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  notes TEXT DEFAULT NULL,
  valid_until TEXT DEFAULT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (client_id) REFERENCES clients (id)
);

CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total REAL NOT NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS shop_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'MATRIX IT WORLD',
  address TEXT NOT NULL DEFAULT 'Karamana, Trivandrum',
  phone TEXT NOT NULL DEFAULT '+91 9946678190',
  email TEXT NOT NULL DEFAULT 'sales@matrixitworld.com',
  website TEXT DEFAULT 'https://www.matrixitworld.com',
  gstin TEXT DEFAULT '32AAGFM3714M1ZB',
  pan TEXT DEFAULT 'AAFM3714M',
  bank_name TEXT DEFAULT 'Axis Bank',
  account_number TEXT DEFAULT '923020059560559',
  ifsc_code TEXT DEFAULT 'UTIB0000694',
  branch_name TEXT DEFAULT 'KARAMANA',
  terms_conditions TEXT DEFAULT '1. 100% advance payment required.\n2. Prices inclusive of GST.\n3. Goods once sold cannot be returned.',
  quotation_prefix TEXT DEFAULT 'QTN',
  consultant_name TEXT DEFAULT 'Sales Team',
  consultant_phone TEXT DEFAULT '+91 9946678190',
  validity_days INTEGER DEFAULT 2,
  enable_round_off BOOLEAN DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS product_price_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id TEXT NOT NULL,
  base_price REAL NOT NULL,
  price_after_gst REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id);
