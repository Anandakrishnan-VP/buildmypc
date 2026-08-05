import React, { useState, useEffect } from 'react';
import { X, Calculator } from 'lucide-react';
import SpecEditor from './SpecEditor';

export default function ProductFormModal({ isOpen, onClose, onSave, categories = [], initialData = null, showToast = () => {} }) {
  const [formData, setFormData] = useState({
    category_id: categories[0]?.id || '',
    brand: '',
    model_name: '',
    specs: [],
    base_price: '',
    gst_percent: 18,
    stock_qty: '',
    warranty: '',
    image_url: '',
    is_active: 1
  });

  const [calcPriceAfterGst, setCalcPriceAfterGst] = useState(0);

  useEffect(() => {
    if (initialData) {
      setFormData({
        category_id: initialData.category_id || categories[0]?.id || '',
        brand: initialData.brand || '',
        model_name: initialData.model_name || '',
        specs: initialData.specs || [],
        base_price: initialData.base_price ?? '',
        gst_percent: initialData.gst_percent ?? 18,
        stock_qty: initialData.stock_qty ?? '',
        warranty: initialData.warranty || '',
        image_url: initialData.image_url || '',
        is_active: initialData.is_active ?? 1
      });
    } else {
      setFormData({
        category_id: categories[0]?.id || '',
        brand: '',
        model_name: '',
        specs: [],
        base_price: '',
        gst_percent: 18,
        stock_qty: '',
        warranty: '',
        image_url: '',
        is_active: 1
      });
    }
  }, [initialData, categories, isOpen]);

  // Real-time calculation of price_after_gst
  useEffect(() => {
    const base = Number(formData.base_price) || 0;
    const gst = Number(formData.gst_percent) || 0;
    const total = base + (base * gst / 100);
    setCalcPriceAfterGst(Math.round((total + Number.EPSILON) * 100) / 100);
  }, [formData.base_price, formData.gst_percent]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category_id || !formData.brand || !formData.model_name || formData.base_price === '') {
      showToast('Please fill in Category, Brand, Model Name, and Base Price.', 'error');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
            {initialData ? `Edit Product (${initialData.id})` : 'Add New Component'}
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Category *</label>
              <select
                className="form-select"
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.prefix})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Brand *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Intel, Corsair, ASUS"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Model Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Core i5-14600K"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Base Price (Excl. GST ₹) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="form-input"
                placeholder="e.g. 27500"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">GST Rate % *</label>
              <select
                className="form-select"
                value={formData.gst_percent}
                onChange={(e) => setFormData({ ...formData, gst_percent: Number(e.target.value) })}
              >
                <option value={0}>0% (Tax Exempt)</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Standard PC Parts)</option>
                <option value={28}>28% (High Tax Items)</option>
              </select>
            </div>

            {/* Price After GST Live Preview */}
            <div style={{
              gridColumn: 'span 2',
              background: 'var(--primary-light)',
              border: '1px solid var(--border-accent)',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 600, fontSize: '13px' }}>
                <Calculator size={18} /> Price After GST (Auto-calculated):
              </div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)' }} className="price-display">
                ₹{calcPriceAfterGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Stock Quantity (Optional)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="e.g. 10"
                value={formData.stock_qty}
                onChange={(e) => setFormData({ ...formData, stock_qty: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Warranty (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 3 Years / Lifetime"
                value={formData.warranty}
                onChange={(e) => setFormData({ ...formData, warranty: e.target.value })}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <SpecEditor
                specs={formData.specs}
                onChange={(updatedSpecs) => setFormData({ ...formData, specs: updatedSpecs })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Update Product' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
