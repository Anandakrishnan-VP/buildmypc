-- ========================================================
-- ZEUS PC BUILDER — SUPABASE POSTGRESQL SCHEMA SCRIPT
-- Paste this whole file directly into Supabase SQL Editor!
-- ========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  icon TEXT DEFAULT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  specs TEXT NOT NULL DEFAULT '[]',
  base_price NUMERIC NOT NULL DEFAULT 0,
  gst_percent NUMERIC NOT NULL DEFAULT 18,
  price_after_gst NUMERIC NOT NULL DEFAULT 0,
  stock_qty INTEGER DEFAULT NULL,
  warranty TEXT DEFAULT NULL,
  image_url TEXT DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);

-- 3. Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT DEFAULT NULL,
  address TEXT DEFAULT NULL,
  gstin TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  build_name TEXT DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  labour_charge NUMERIC DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  notes TEXT DEFAULT NULL,
  valid_until TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Quotation Items Table
CREATE TABLE IF NOT EXISTS quotation_items (
  id TEXT PRIMARY KEY,
  quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_snapshot TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  line_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Shop Settings Table
CREATE TABLE IF NOT EXISTS shop_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  name TEXT NOT NULL DEFAULT 'MATRIX IT WORLD',
  logo_url TEXT DEFAULT NULL,
  address TEXT DEFAULT 'Karamana, Trivandrum',
  phone TEXT DEFAULT '+91 9946678190',
  email TEXT DEFAULT 'sales@matrixitworld.com',
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Migrations for existing Supabase databases
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS website TEXT DEFAULT 'https://www.matrixitworld.com';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS pan TEXT DEFAULT 'AAFM3714M';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT 'Axis Bank';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS account_number TEXT DEFAULT '923020059560559';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS ifsc_code TEXT DEFAULT 'UTIB0000694';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS branch_name TEXT DEFAULT 'KARAMANA';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS consultant_name TEXT DEFAULT 'Sales Team';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS consultant_phone TEXT DEFAULT '+91 9946678190';
ALTER TABLE shop_settings ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 2;

-- Disable Row Level Security (RLS) or grant public access for easy multi-device API access
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE shop_settings DISABLE ROW LEVEL SECURITY;

-- Initial Preloaded PC Hardware Categories Seed
INSERT INTO categories (id, name, prefix, description, sort_order) VALUES
  ('cat_1', 'Processor (CPU)', 'CPU', 'Desktop CPUs from Intel & AMD', 1),
  ('cat_2', 'Graphics Card (GPU)', 'GPU', 'NVIDIA GeForce & AMD Radeon graphics cards', 2),
  ('cat_3', 'RAM / Memory', 'RAM', 'DDR4 & DDR5 high-speed RAM sticks', 3),
  ('cat_4', 'Motherboard', 'MB', 'ATX, Micro-ATX & ITX system boards', 4),
  ('cat_5', 'Storage (SSD / HDD)', 'STO', 'M.2 NVMe SSDs & 3.5 SATA Hard Drives', 5),
  ('cat_6', 'Power Supply (PSU)', 'PSU', '80+ Bronze/Gold modular power supplies', 6),
  ('cat_7', 'Cabinet / Chassis', 'CASE', 'ATX Mid-Tower & Dual-Chamber RGB PC cases', 7),
  ('cat_8', 'CPU Cooling', 'COOL', 'AIO Liquid Coolers & Heavy Air Coolers', 8),
  ('cat_9', 'Monitor & Display', 'MON', 'Gaming & Professional IPS / OLED displays', 9),
  ('cat_10', 'Peripherals & Accessories', 'ACC', 'Keyboards, Mice, Headsets & Cables', 10)
ON CONFLICT (id) DO NOTHING;

-- 7. Product Price History Table
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  base_price NUMERIC NOT NULL,
  price_after_gst NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON product_price_history(product_id);
ALTER TABLE product_price_history DISABLE ROW LEVEL SECURITY;
