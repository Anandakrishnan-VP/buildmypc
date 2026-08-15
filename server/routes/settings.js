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
        `INSERT INTO shop_settings 
         (id, name, address, phone, email, gstin, consultant_name, consultant_phone, bank_name, account_number, ifsc_code, branch_name, validity_days, default_gst_percent, terms_conditions, quotation_prefix)
         VALUES ('default', 'MATRIX IT WORLD', 'Karamana, Trivandrum', '+91 9946678190', 'sales@matrixit.in', '32AAGFM3714M1ZB', 'Sales Team', '+91 9946678190', 'Axis Bank', '923020059560559', 'UTIB0000694', 'KARAMANA', 2, 18, '1. Quotation valid for 2 days from issue date.\n2. Prices inclusive of GST as indicated.\n3. Goods once sold cannot be returned.', 'QTN')`
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
    const {
      name, logo_url, address, phone, email, website, gstin,
      consultant_name, consultant_phone, bank_name, account_number, ifsc_code, branch_name,
      validity_days, default_gst_percent, terms_conditions, quotation_prefix, enable_round_off
    } = req.body;
    const db = await getDb();

    await db.run(
      `UPDATE shop_settings SET
        name = ?,
        logo_url = ?,
        address = ?,
        phone = ?,
        email = ?,
        website = ?,
        gstin = ?,
        consultant_name = ?,
        consultant_phone = ?,
        bank_name = ?,
        account_number = ?,
        ifsc_code = ?,
        branch_name = ?,
        validity_days = ?,
        default_gst_percent = ?,
        terms_conditions = ?,
        quotation_prefix = ?,
        enable_round_off = ?,
        updated_at = datetime('now')
       WHERE id = 'default'`,
      [
        name !== undefined ? name.trim() : '',
        logo_url !== undefined ? logo_url.trim() : null,
        address !== undefined ? address.trim() : '',
        phone !== undefined ? phone.trim() : '',
        email !== undefined ? email.trim() : '',
        website !== undefined ? website.trim() : 'https://www.matrixitworld.com',
        gstin !== undefined ? gstin.trim().toUpperCase() : '',
        consultant_name !== undefined ? consultant_name.trim() : 'Sales Team',
        consultant_phone !== undefined ? consultant_phone.trim() : '',
        bank_name !== undefined ? bank_name.trim() : '',
        account_number !== undefined ? account_number.trim() : '',
        ifsc_code !== undefined ? ifsc_code.trim().toUpperCase() : '',
        branch_name !== undefined ? branch_name.trim() : '',
        validity_days !== undefined ? Number(validity_days) || 2 : 2,
        default_gst_percent !== undefined ? Number(default_gst_percent) || 18 : 18,
        terms_conditions !== undefined ? terms_conditions : '',
        quotation_prefix !== undefined ? quotation_prefix.trim().toUpperCase() : 'QTN',
        enable_round_off !== undefined ? (enable_round_off ? 1 : 0) : 1
      ]
    );

    const updated = await db.get("SELECT * FROM shop_settings WHERE id = 'default'");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
