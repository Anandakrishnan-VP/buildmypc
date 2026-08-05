import React, { useState, useEffect } from 'react';
import { Save, Store, FileText, Play } from 'lucide-react';
import { api } from '../api/client';

export default function SettingsPage({ showToast = () => {}, onReplayIntro = () => {} }) {
  const [settings, setSettings] = useState({
    name: '',
    logo_url: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
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
        gstin: data.gstin || '',
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
      showToast('Shop settings updated successfully!', 'success');
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
          <p className="page-subtitle">Configure business letterhead, GSTIN, default tax rates, and PDF terms & conditions</p>
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
              <label className="form-label">Shop / Business Name *</label>
              <input
                type="text"
                className="form-input"
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                required
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
                placeholder="e.g. 29ABCDE1234F1Z5"
                value={settings.gstin}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value })}
              />
            </div>
          </div>

          {/* Quotation & PDF Config Card */}
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="var(--accent)" /> Quotation & PDF Preferences
            </h3>

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
                rows="6"
                placeholder="1. Quotation valid for 7 days. 2. Prices inclusive of GST."
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
