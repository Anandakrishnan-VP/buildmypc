import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const categories = await db.all('SELECT * FROM categories ORDER BY sort_order ASC, name ASC');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { id, name, prefix, sort_order } = req.body;
    if (!name || !prefix) {
      return res.status(400).json({ error: 'Name and prefix are required' });
    }
    const slug = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const cleanPrefix = prefix.toUpperCase().trim();
    const db = await getDb();

    // Find max sort_order if not provided
    let order = sort_order;
    if (order === undefined || order === null) {
      const maxRow = await db.get('SELECT MAX(sort_order) as maxOrder FROM categories');
      order = (maxRow?.maxOrder || 0) + 1;
    }

    await db.run(
      'INSERT INTO categories (id, name, prefix, sort_order) VALUES (?, ?, ?, ?)',
      [slug, name.trim(), cleanPrefix, order]
    );

    const category = await db.get('SELECT * FROM categories WHERE id = ?', [slug]);
    res.status(201).json(category);
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Category ID or prefix already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  try {
    const { name, prefix, sort_order } = req.body;
    const { id } = req.params;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const updatedName = name !== undefined ? name.trim() : existing.name;
    const updatedPrefix = prefix !== undefined ? prefix.toUpperCase().trim() : existing.prefix;
    const updatedSort = sort_order !== undefined ? sort_order : existing.sort_order;

    await db.run(
      'UPDATE categories SET name = ?, prefix = ?, sort_order = ? WHERE id = ?',
      [updatedName, updatedPrefix, updatedSort, id]
    );

    const updated = await db.get('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    // Check if any active/inactive products exist in this category
    const productCount = await db.get(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );

    if (productCount && productCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete category: ${productCount.count} product(s) are assigned to it. Reassign or delete the products first.`
      });
    }

    await db.run('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ message: 'Category deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
