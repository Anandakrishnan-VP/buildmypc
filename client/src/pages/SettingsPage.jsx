import React, { useState, useEffect } from 'react';
import { Save, Store, FileText, Play, Building2 } from 'lucide-react';
import { api } from '../api/client';

export default function SettingsPage({ showToast = () => {}, onReplayIntro = () => {} }) {
  const [settings, setSettings] = useState({
    name: '',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    website: 'https://www.matrixitworld.com',
    gstin: '',
    consultant_name: 'Sales Team',
    consultant_phone: '',
    bank_name: 'Axis Bank',
    account_number: '923020059560559',
    ifsc_code: 'UTIB0000694',
    branch_name: 'KARAMANA',
    validity_days: 2,
    default_gst_percent: 18,
    terms_conditions: '',
    quotation_prefix: 'QTN'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((data) => {
      setSettings({
        name: data.name || '',
        logo_url: data.logo_url || '',
        address: data.address || '',
        phone: data.phone || '',
        email: data.email || '',
        website: data.website || 'https://www.matrixitworld.com',
        gstin: data.gstin || '',
        consultant_name: data.consultant_name || 'Sales Team',
        consultant_phone: data.consultant_phone || '',
        bank_name: data.bank_name || 'Axis Bank',
        account_number: data.account_number || '923020059560559',
        ifsc_code: data.ifsc_code || 'UTIB0000694',
        branch_name: data.branch_name || 'KARAMANA',
        validity_days: data.validity_days ?? 2,
        default_gst_percent: data.default_gst_percent ?? 18,
        terms_conditions: data.terms_conditions || '',
        quotation_prefix: data.quotation_prefix || 'QTN'
      });
      setLoading(false);
    }).catch((err) => {
      showToast('Failed to load settings: ' + err.message, 'error');
      setLoading(false);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await api.updateSettings(settings);
      setSettings(updated);
      showToast('Shop & PDF settings updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update settings: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading shop settings...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Settings & PDF Config</h1>
          <p className="page-subtitle">Configure business letterhead, GSTIN, Bank details, consultant contact, and PDF terms</p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={onReplayIntro}
          title="Replay 3D PC Build Intro Animation"
        >
          <Play size={16} color="var(--primary)" /> Play 3D Intro
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          {/* Shop Branding Card */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Store size={20} color="var(--primary)" /> Business Information
            </h3>

            <div className="form-group">
              <label className="form-label">Shop / Business Name (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. MATRIX IT WORLD"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Website Link (Appears on PDF Letterhead)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. https://www.matrixitworld.com"
                value={settings.website}
                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Consultant Name (Appears on PDF)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Ashiq Kabeer"
                value={settings.consultant_name}
                onChange={(e) => setSettings({ ...settings, consultant_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Consultant Phone / Contact Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. +91 9946678190"
                value={settings.consultant_phone}
                onChange={(e) => setSettings({ ...settings, consultant_phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shop Address (Appears on PDF Letterhead)</label>
              <textarea
                className="form-textarea"
                rows="3"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                type="text"
                className="form-input"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Shop GSTIN Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 32AAGFM3714M1ZB"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
              />
            </div>
          </div>

          {/* Bank Account Details Card */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 size={20} color="#10b981" /> Bank Account Details (PDF Invoice)
            </h3>

            <div className="form-group">
              <label className="form-label">Bank Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Axis Bank / SOUTH INDIAN BANK"
                value={settings.bank_name}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Account Number</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 923020059560559"
                value={settings.account_number}
                onChange={(e) => setSettings({ ...settings, account_number: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">IFSC Code</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. UTIB0000694 / SIBL0000347"
                value={settings.ifsc_code}
                onChange={(e) => setSettings({ ...settings, ifsc_code: e.target.value.toUpperCase() })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Branch Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. KARAMANA / CALICUT"
                value={settings.branch_name}
                onChange={(e) => setSettings({ ...settings, branch_name: e.target.value })}
              />
            </div>
          </div>

          {/* Quotation & PDF Config Card */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--accent)" /> Quotation & PDF Preferences
            </h3>

            <div className="form-group">
              <label className="form-label">Default Quote Validity (Days)</label>
              <input
                type="number"
                min="1"
                max="90"
                className="form-input"
                placeholder="e.g. 2"
                value={settings.validity_days}
                onChange={(e) => setSettings({ ...settings, validity_days: Math.max(1, Number(e.target.value) || 2) })}
              />
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Automatically sets validity date (e.g. 2 days from quote creation date)
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Quotation Number Prefix</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. QTN (Generates QTN-2026-0001)"
                value={settings.quotation_prefix}
                onChange={(e) => setSettings({ ...settings, quotation_prefix: e.target.value.toUpperCase() })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default GST Rate %</label>
              <input
                type="number"
                className="form-input"
                value={settings.default_gst_percent}
                onChange={(e) => setSettings({ ...settings, default_gst_percent: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Default Terms & Conditions (PDF Footer)</label>
              <textarea
                className="form-textarea"
                rows="5"
                placeholder="Price valid for 2 days from quote issue date. Warranty as per component manufacturer guidelines."
                value={settings.terms_conditions}
                onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
              />
            </div>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
