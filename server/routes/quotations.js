import express from 'express';
import { getDb } from '../db/database.js';
import { calculateQuotationTotals } from '../services/pricing.js';
import { generateQuotationPdf } from '../services/pdf.js';

const router = express.Router();

async function generateQuotationId(db) {
  const settings = await db.get("SELECT quotation_prefix FROM shop_settings WHERE id = 'default'");
  const prefix = settings?.quotation_prefix || 'QTN';
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;

  const rows = await db.all('SELECT id FROM quotations WHERE id LIKE ?', [pattern]);
  let maxNum = 0;
  for (const row of rows) {
    const parts = row.id.split('-');
    const numPart = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }

  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `${prefix}-${year}-${nextNum}`;
}

// GET /api/quotations
router.get('/', async (req, res) => {
  try {
    const { status, client_id, search } = req.query;
    const db = await getDb();

    let query = `
      SELECT q.*, c.name as client_name, c.phone as client_phone, c.email as client_email
      FROM quotations q
      LEFT JOIN clients c ON q.client_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND q.status = ?';
      params.push(status);
    }

    if (client_id) {
      query += ' AND q.client_id = ?';
      params.push(client_id);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (q.id LIKE ? OR q.build_name LIKE ? OR c.name LIKE ?)';
      params.push(term, term, term);
    }

    query += ' ORDER BY q.created_at DESC';

    const quotations = await db.all(query, params);

    // Calculate totals for each quotation
    const list = await Promise.all(
      quotations.map(async (q) => {
        const items = await db.all(
          'SELECT * FROM quotation_items WHERE quotation_id = ?',
          [q.id]
        );
        const totals = calculateQuotationTotals(items, q.discount, q.labour_charge);
        return {
          ...q,
          item_count: items.length,
          subtotal: totals.subtotal,
          total_gst: totals.total_gst,
          grand_total: totals.grand_total
        };
      })
    );

    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotations/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [req.params.id]);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const client = await db.get('SELECT * FROM clients WHERE id = ?', [quotation.client_id]);
    const rawItems = await db.all(
      `SELECT qi.*, p.category_id, c.name as category_name, c.sort_order as category_sort
       FROM quotation_items qi
       LEFT JOIN products p ON qi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE qi.quotation_id = ?`,
      [quotation.id]
    );

    const items = rawItems.map((item) => ({
      ...item,
      product_snapshot: typeof item.product_snapshot === 'string'
        ? JSON.parse(item.product_snapshot)
        : item.product_snapshot
    }));

    const totals = calculateQuotationTotals(items, quotation.discount, quotation.labour_charge);

    res.json({
      quotation,
      client,
      items: totals.items,
      totals
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotations
router.post('/', async (req, res) => {
  try {
    const { client_id, build_name, labour_charge, discount, notes, valid_until, items } = req.body;
    if (!client_id) {
      return res.status(400).json({ error: 'client_id is required' });
    }

    const db = await getDb();
    const id = await generateQuotationId(db);

    const defaultValidity = new Date();
    defaultValidity.setDate(defaultValidity.getDate() + 7);
    const validityStr = valid_until || defaultValidity.toISOString().split('T')[0];

    await db.run(
      `INSERT INTO quotations 
      (id, client_id, build_name, status, labour_charge, discount, notes, valid_until)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        id,
        client_id,
        build_name ? build_name.trim() : null,
        labour_charge ? Number(labour_charge) : 0,
        discount ? Number(discount) : 0,
        notes ? notes.trim() : null,
        validityStr
      ]
    );

    // If initial items provided
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        if (!item.product_id) continue;
        const product = await db.get('SELECT * FROM products WHERE id = ?', [item.product_id]);
        if (!product) continue;

        const snapshot = {
          id: product.id,
          category_id: product.category_id,
          brand: product.brand,
          model_name: product.model_name,
          specs: JSON.parse(product.specs || '[]'),
          base_price: product.base_price,
          gst_percent: product.gst_percent,
          price_after_gst: product.price_after_gst,
          warranty: product.warranty
        };

        const qty = item.quantity || 1;
        const lineTotal = product.price_after_gst * qty;
        const itemId = `${id}-ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        await db.run(
          `INSERT INTO quotation_items (id, quotation_id, product_id, product_snapshot, quantity, line_total)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [itemId, id, product.id, JSON.stringify(snapshot), qty, lineTotal]
        );
      }
    }

    const created = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quotations/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { client_id, build_name, status, labour_charge, discount, notes, valid_until } = req.body;

    const db = await getDb();
    const existing = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    await db.run(
      `UPDATE quotations SET
        client_id = COALESCE(?, client_id),
        build_name = COALESCE(?, build_name),
        status = COALESCE(?, status),
        labour_charge = COALESCE(?, labour_charge),
        discount = COALESCE(?, discount),
        notes = COALESCE(?, notes),
        valid_until = COALESCE(?, valid_until),
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        client_id,
        build_name !== undefined ? build_name.trim() : null,
        status,
        labour_charge !== undefined ? Number(labour_charge) : null,
        discount !== undefined ? Number(discount) : null,
        notes !== undefined ? notes.trim() : null,
        valid_until,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotations/:id/items (add line item)
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    const db = await getDb();
    const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // SNAPSHOT PRODUCT AT THIS EXACT MOMENT
    const snapshot = {
      id: product.id,
      category_id: product.category_id,
      brand: product.brand,
      model_name: product.model_name,
      specs: JSON.parse(product.specs || '[]'),
      base_price: product.base_price,
      gst_percent: product.gst_percent,
      price_after_gst: product.price_after_gst,
      warranty: product.warranty
    };

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const lineTotal = product.price_after_gst * qty;
    const itemId = `${id}-ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    await db.run(
      `INSERT INTO quotation_items (id, quotation_id, product_id, product_snapshot, quantity, line_total)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [itemId, id, product.id, JSON.stringify(snapshot), qty, lineTotal]
    );

    await db.run('UPDATE quotations SET updated_at = datetime("now") WHERE id = ?', [id]);

    const createdItem = await db.get('SELECT * FROM quotation_items WHERE id = ?', [itemId]);
    createdItem.product_snapshot = JSON.parse(createdItem.product_snapshot);
    res.status(201).json(createdItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/quotations/:id/items/:itemId (update item qty)
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const { quantity } = req.body;

    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    const db = await getDb();

    const item = await db.get(
      'SELECT * FROM quotation_items WHERE id = ? AND quotation_id = ?',
      [itemId, id]
    );
    if (!item) {
      return res.status(404).json({ error: 'Line item not found' });
    }

    const snapshot = JSON.parse(item.product_snapshot);
    const lineTotal = snapshot.price_after_gst * qty;

    await db.run(
      'UPDATE quotation_items SET quantity = ?, line_total = ? WHERE id = ?',
      [qty, lineTotal, itemId]
    );

    await db.run('UPDATE quotations SET updated_at = datetime("now") WHERE id = ?', [id]);

    const updatedItem = await db.get('SELECT * FROM quotation_items WHERE id = ?', [itemId]);
    updatedItem.product_snapshot = JSON.parse(updatedItem.product_snapshot);
    res.json(updatedItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/quotations/:id/items/:itemId (remove line item)
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const { id, itemId } = req.params;
    const db = await getDb();

    await db.run(
      'DELETE FROM quotation_items WHERE id = ? AND quotation_id = ?',
      [itemId, id]
    );

    await db.run('UPDATE quotations SET updated_at = datetime("now") WHERE id = ?', [id]);
    res.json({ message: 'Line item removed', itemId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotations/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const original = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!original) {
      return res.status(404).json({ error: 'Original quotation not found' });
    }

    const newId = await generateQuotationId(db);
    const newBuildName = original.build_name ? `${original.build_name} (Copy)` : 'Cloned Build';

    await db.run(
      `INSERT INTO quotations 
      (id, client_id, build_name, status, labour_charge, discount, notes, valid_until)
      VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`,
      [
        newId,
        original.client_id,
        newBuildName,
        original.labour_charge,
        original.discount,
        original.notes,
        original.valid_until
      ]
    );

    const originalItems = await db.all(
      'SELECT * FROM quotation_items WHERE quotation_id = ?',
      [id]
    );

    for (const item of originalItems) {
      const newItemId = `${newId}-ITEM-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      await db.run(
        `INSERT INTO quotation_items (id, quotation_id, product_id, product_snapshot, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newItemId, newId, item.product_id, item.product_snapshot, item.quantity, item.line_total]
      );
    }

    const cloned = await db.get('SELECT * FROM quotations WHERE id = ?', [newId]);
    res.status(201).json(cloned);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/quotations/:id/finalize
router.post('/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    await db.run("UPDATE quotations SET status = 'sent', updated_at = datetime('now') WHERE id = ?", [id]);
    const updated = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    await db.run('DELETE FROM quotation_items WHERE quotation_id = ?', [id]);
    await db.run('DELETE FROM quotations WHERE id = ?', [id]);

    res.json({ message: 'Quotation deleted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/quotations/:id/pdf
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const quotation = await db.get('SELECT * FROM quotations WHERE id = ?', [id]);
    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const client = await db.get('SELECT * FROM clients WHERE id = ?', [quotation.client_id]);
    const settings = await db.get("SELECT * FROM shop_settings WHERE id = 'default'");

    const rawItems = await db.all(
      `SELECT qi.*, p.category_id, c.name as category_name, c.sort_order as category_sort
       FROM quotation_items qi
       LEFT JOIN products p ON qi.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE qi.quotation_id = ?`,
      [id]
    );

    const items = rawItems.map((item) => ({
      ...item,
      product_snapshot: typeof item.product_snapshot === 'string'
        ? JSON.parse(item.product_snapshot)
        : item.product_snapshot
    }));

    const totals = calculateQuotationTotals(items, quotation.discount, quotation.labour_charge);

    // Group items by category for spec sheet rendering
    const categoriesMap = {};
    for (const item of totals.items) {
      const catId = item.product_snapshot.category_id || 'other';
      if (!categoriesMap[catId]) {
        const catRow = await db.get('SELECT name, sort_order FROM categories WHERE id = ?', [catId]);
        categoriesMap[catId] = {
          category_name: catRow ? catRow.name : catId.toUpperCase(),
          sort_order: catRow ? catRow.sort_order : 99,
          items: []
        };
      }
      categoriesMap[catId].items.push(item);
    }

    const categoriesWithItems = Object.values(categoriesMap).sort((a, b) => a.sort_order - b.sort_order);

    const pdfBuffer = await generateQuotationPdf({
      quotation,
      client,
      settings,
      categoriesWithItems,
      totals
    });

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=Quotation_${id}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Generation Error:', err);
    res.status(500).json({ error: 'Failed to generate PDF quotation: ' + err.message });
  }
});

export default router;
