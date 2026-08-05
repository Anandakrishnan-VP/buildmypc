import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    let settings = await db.get("SELECT * FROM shop_settings WHERE id = 'default'");
    if (!settings) {
      await db.run(
        `INSERT INTO shop_settings (id, name, address, phone, email, gstin, default_gst_percent, terms_conditions, quotation_prefix)
         VALUES ('default', 'Zeus PC Custom Builds', '123 Tech Street, Electronic City, Bengaluru', '+91 98765 43210', 'sales@zeuspc.in', '29ABCDE1234F1Z5', 18, '1. Quotation valid for 7 days.\n2. Prices inclusive of GST.', 'QTN')`
      );
      settings = await db.get("SELECT * FROM shop_settings WHERE id = 'default'");
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const { name, logo_url, address, phone, email, gstin, default_gst_percent, terms_conditions, quotation_prefix } = req.body;
    const db = await getDb();

    await db.run(
      `UPDATE shop_settings SET
        name = COALESCE(?, name),
        logo_url = ?,
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        gstin = COALESCE(?, gstin),
        default_gst_percent = COALESCE(?, default_gst_percent),
        terms_conditions = COALESCE(?, terms_conditions),
        quotation_prefix = COALESCE(?, quotation_prefix)
       WHERE id = 'default'`,
      [
        name ? name.trim() : null,
        logo_url ? logo_url.trim() : null,
        address ? address.trim() : null,
        phone ? phone.trim() : null,
        email ? email.trim() : null,
        gstin ? gstin.trim().toUpperCase() : null,
        default_gst_percent !== undefined ? Number(default_gst_percent) : null,
        terms_conditions !== undefined ? terms_conditions : null,
        quotation_prefix ? quotation_prefix.trim().toUpperCase() : null
      ]
    );

    const updated = await db.get("SELECT * FROM shop_settings WHERE id = 'default'");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
