import express from 'express';
import { getDb } from '../db/database.js';
import { calculateProductPrice } from '../services/pricing.js';

const router = express.Router();

// Helper to generate product ID: e.g. "CPU-0007"
async function generateProductId(db, categoryId) {
  const category = await db.get('SELECT prefix FROM categories WHERE id = ?', [categoryId]);
  const prefix = category ? category.prefix : 'PRD';

  const rows = await db.all(
    'SELECT id FROM products WHERE id LIKE ?',
    [`${prefix}-%`]
  );

  let maxNum = 0;
  for (const row of rows) {
    const numPart = parseInt(row.id.split('-')[1], 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}-${nextNum}`;
}

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, activeOnly } = req.query;
    const db = await getDb();

    let query = `
      SELECT p.*, c.name as category_name, c.prefix as category_prefix 
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly !== 'false') {
      query += ' AND p.is_active = 1';
    }

    if (category) {
      query += ' AND p.category_id = ?';
      params.push(category);
    }

    if (minPrice) {
      query += ' AND p.price_after_gst >= ?';
      params.push(Number(minPrice));
    }

    if (maxPrice) {
      query += ' AND p.price_after_gst <= ?';
      params.push(Number(maxPrice));
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ` AND (p.brand LIKE ? OR p.model_name LIKE ? OR p.specs LIKE ? OR p.id LIKE ?)`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY c.sort_order ASC, p.brand ASC, p.model_name ASC';

    const products = await db.all(query, params);
    
    // Parse specs JSON
    const formatted = products.map((p) => ({
      ...p,
      specs: p.specs ? JSON.parse(p.specs) : []
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const product = await db.get(
      `SELECT p.*, c.name as category_name 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    product.specs = product.specs ? JSON.parse(product.specs) : [];
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  try {
    const { category_id, brand, model_name, specs, base_price, gst_percent, stock_qty, warranty, image_url } = req.body;

    if (!category_id || !brand || !model_name || base_price === undefined) {
      return res.status(400).json({ error: 'category_id, brand, model_name, and base_price are required' });
    }

    const db = await getDb();
    const id = await generateProductId(db, category_id);
    const pricing = calculateProductPrice(base_price, gst_percent ?? 18);
    const specsJson = JSON.stringify(Array.isArray(specs) ? specs : []);

    await db.run(
      `INSERT INTO products 
      (id, category_id, brand, model_name, specs, base_price, gst_percent, price_after_gst, stock_qty, warranty, image_url, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        category_id,
        brand.trim(),
        model_name.trim(),
        specsJson,
        pricing.base_price,
        pricing.gst_percent,
        pricing.price_after_gst,
        stock_qty !== undefined && stock_qty !== '' ? parseInt(stock_qty, 10) : null,
        warranty ? warranty.trim() : null,
        image_url ? image_url.trim() : null
      ]
    );

    const created = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    created.specs = JSON.parse(created.specs);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, brand, model_name, specs, base_price, gst_percent, stock_qty, warranty, image_url, is_active } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT * FROM products WHERE id = ?', [id]);

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const updatedCategoryId = category_id || existing.category_id;
    const updatedBrand = brand !== undefined ? brand.trim() : existing.brand;
    const updatedModel = model_name !== undefined ? model_name.trim() : existing.model_name;
    const updatedSpecs = specs !== undefined ? JSON.stringify(specs) : existing.specs;
    const updatedBase = base_price !== undefined ? base_price : existing.base_price;
    const updatedGst = gst_percent !== undefined ? gst_percent : existing.gst_percent;
    const updatedStock = stock_qty !== undefined && stock_qty !== '' ? parseInt(stock_qty, 10) : existing.stock_qty;
    const updatedWarranty = warranty !== undefined ? warranty : existing.warranty;
    const updatedImage = image_url !== undefined ? image_url : existing.image_url;
    const updatedActive = is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active;

    const pricing = calculateProductPrice(updatedBase, updatedGst);

    await db.run(
      `UPDATE products SET 
        category_id = ?, brand = ?, model_name = ?, specs = ?, 
        base_price = ?, gst_percent = ?, price_after_gst = ?, 
        stock_qty = ?, warranty = ?, image_url = ?, is_active = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        updatedCategoryId,
        updatedBrand,
        updatedModel,
        updatedSpecs,
        pricing.base_price,
        pricing.gst_percent,
        pricing.price_after_gst,
        updatedStock,
        updatedWarranty,
        updatedImage,
        updatedActive,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM products WHERE id = ?', [id]);
    updated.specs = JSON.parse(updated.specs);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/products/:id (soft delete if referenced, hard delete if not)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const quoteUsage = await db.get(
      'SELECT COUNT(*) as count FROM quotation_items WHERE product_id = ?',
      [id]
    );

    if (quoteUsage && quoteUsage.count > 0) {
      // Soft delete: set is_active = 0
      await db.run('UPDATE products SET is_active = 0, updated_at = datetime("now") WHERE id = ?', [id]);
      res.json({ message: 'Product deactivated (soft-deleted) as it is referenced in past quotations.', id, softDeleted: true });
    } else {
      // Hard delete
      await db.run('DELETE FROM products WHERE id = ?', [id]);
      res.json({ message: 'Product permanently deleted', id, softDeleted: false });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/products/import (CSV import)
router.post('/import', async (req, res) => {
  try {
    const { items } = req.body; // Array of product objects from CSV parser
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for import' });
    }

    const db = await getDb();
    let importedCount = 0;

    for (const item of items) {
      if (!item.category_id || !item.brand || !item.model_name || !item.base_price) {
        continue;
      }

      const id = await generateProductId(db, item.category_id);
      const pricing = calculateProductPrice(item.base_price, item.gst_percent || 18);
      const specsJson = JSON.stringify(item.specs || []);

      await db.run(
        `INSERT INTO products 
        (id, category_id, brand, model_name, specs, base_price, gst_percent, price_after_gst, stock_qty, warranty, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          id,
          item.category_id,
          item.brand,
          item.model_name,
          specsJson,
          pricing.base_price,
          pricing.gst_percent,
          pricing.price_after_gst,
          item.stock_qty || null,
          item.warranty || null
        ]
      );
      importedCount++;
    }

    res.json({ message: `Successfully imported ${importedCount} products.`, count: importedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
