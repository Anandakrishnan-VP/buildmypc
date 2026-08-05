import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function CategoryModal({ isOpen, onClose, onSave, initialData = null, showToast = () => {} }) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    prefix: '',
    sort_order: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || '',
        name: initialData.name || '',
        prefix: initialData.prefix || '',
        sort_order: initialData.sort_order ?? ''
      });
    } else {
      setFormData({
        id: '',
        name: '',
        prefix: '',
        sort_order: ''
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.prefix.trim()) {
      showToast('Category Name and Prefix are required.', 'error');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
            {initialData ? `Edit Category (${initialData.name})` : 'Add New Category'}
          </h3>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Category Name *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CPU, Cabinet, Cooling Fan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Product ID Prefix * (2-4 Letters)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. CPU, CAB, FAN — used to auto-generate IDs like CPU-0001"
                value={formData.prefix}
                onChange={(e) => setFormData({ ...formData, prefix: e.target.value.toUpperCase() })}
                required
                maxLength={5}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sort Order (Optional)</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 1, 2, 3..."
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: e.target.value })}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {initialData ? 'Update Category' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
