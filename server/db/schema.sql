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
  name TEXT NOT NULL DEFAULT 'Zeus PC Custom Builds',
  logo_url TEXT DEFAULT NULL,
  address TEXT DEFAULT '123 Tech Street, Electronic City, Bengaluru, Karnataka 560100',
  phone TEXT DEFAULT '+91 98765 43210',
  email TEXT DEFAULT 'sales@zeuspc.in',
  gstin TEXT DEFAULT '29ABCDE1234F1Z5',
  default_gst_percent REAL DEFAULT 18,
  terms_conditions TEXT DEFAULT '1. Quotation valid for 7 days from issue date.\n2. Prices inclusive of GST as indicated.\n3. Warranty as per manufacturer terms.',
  quotation_prefix TEXT DEFAULT 'QTN'
);
