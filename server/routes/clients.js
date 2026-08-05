import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

async function generateClientId(db) {
  const rows = await db.all("SELECT id FROM clients WHERE id LIKE 'CLI-%'");
  let maxNum = 0;
  for (const row of rows) {
    const numPart = parseInt(row.id.split('-')[1], 10);
    if (!isNaN(numPart) && numPart > maxNum) {
      maxNum = numPart;
    }
  }
  const nextNum = (maxNum + 1).toString().padStart(4, '0');
  return `CLI-${nextNum}`;
}

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    const db = await getDb();
    let query = 'SELECT * FROM clients WHERE 1=1';
    const params = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query += ' AND (name LIKE ? OR phone LIKE ? OR email LIKE ? OR gstin LIKE ?)';
      params.push(term, term, term, term);
    }

    query += ' ORDER BY created_at DESC';
    const clients = await db.all(query, params);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const client = await db.get('SELECT * FROM clients WHERE id = ?', [req.params.id]);
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const quotations = await db.all(
      'SELECT * FROM quotations WHERE client_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );

    res.json({ ...client, quotations });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, address, gstin } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }

    const db = await getDb();
    const id = await generateClientId(db);

    await db.run(
      'INSERT INTO clients (id, name, phone, email, address, gstin) VALUES (?, ?, ?, ?, ?, ?)',
      [
        id,
        name.trim(),
        phone.trim(),
        email ? email.trim() : null,
        address ? address.trim() : null,
        gstin ? gstin.trim().toUpperCase() : null
      ]
    );

    const created = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, gstin } = req.body;
    const db = await getDb();

    const existing = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Client not found' });
    }

    await db.run(
      'UPDATE clients SET name = ?, phone = ?, email = ?, address = ?, gstin = ? WHERE id = ?',
      [
        name !== undefined ? name.trim() : existing.name,
        phone !== undefined ? phone.trim() : existing.phone,
        email !== undefined ? (email ? email.trim() : null) : existing.email,
        address !== undefined ? (address ? address.trim() : null) : existing.address,
        gstin !== undefined ? (gstin ? gstin.trim().toUpperCase() : null) : existing.gstin,
        id
      ]
    );

    const updated = await db.get('SELECT * FROM clients WHERE id = ?', [id]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    const quoteCount = await db.get(
      'SELECT COUNT(*) as count FROM quotations WHERE client_id = ?',
      [id]
    );

    if (quoteCount && quoteCount.count > 0) {
      return res.status(400).json({
        error: `Cannot delete client: ${quoteCount.count} quotation(s) associated with this client exist.`
      });
    }

    await db.run('DELETE FROM clients WHERE id = ?', [id]);
    res.json({ message: 'Client deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
