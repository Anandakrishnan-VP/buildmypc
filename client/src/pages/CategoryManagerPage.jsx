import React, { useState } from 'react';
import { Plus, Edit3, Trash2, ArrowUp, ArrowDown, FolderKanban } from 'lucide-react';
import { api } from '../api/client';
import CategoryModal from '../components/CategoryModal';

export default function CategoryManagerPage({ categories = [], onRefresh, showToast = () => {}, showConfirm = () => {} }) {
  const [showModal, setShowModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);

  const handleSaveCategory = async (formData) => {
    try {
      if (editCategory) {
        await api.updateCategory(editCategory.id, formData);
        showToast(`Category "${formData.name}" updated`, 'success');
      } else {
        await api.createCategory(formData);
        showToast(`Category "${formData.name}" created`, 'success');
      }
      setShowModal(false);
      setEditCategory(null);
      onRefresh();
    } catch (err) {
      showToast('Failed to save category: ' + err.message, 'error');
    }
  };

  const handleDeleteCategory = (cat) => {
    showConfirm(
      'Delete Category',
      `Are you sure you want to delete category "${cat.name}"?`,
      async () => {
        try {
          await api.deleteCategory(cat.id);
          showToast(`Category "${cat.name}" deleted successfully`, 'success');
          onRefresh();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  };

  const moveOrder = async (cat, direction) => {
    const newOrder = direction === 'up' ? cat.sort_order - 1 : cat.sort_order + 1;
    try {
      await api.updateCategory(cat.id, { sort_order: newOrder });
      onRefresh();
    } catch (err) {
      showToast('Failed to reorder: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Category Manager</h1>
          <p className="page-subtitle">Organize component categories, product ID prefixes, and tab display order</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditCategory(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Add Category
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sort Order</th>
                <th>Category ID (Slug)</th>
                <th>Category Name</th>
                <th>Product ID Prefix</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700, width: '24px' }}>{cat.sort_order}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 4px' }}
                          onClick={() => moveOrder(cat, 'up')}
                          disabled={idx === 0}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '2px 4px' }}
                          onClick={() => moveOrder(cat, 'down')}
                          disabled={idx === categories.length - 1}
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{cat.id}</td>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FolderKanban size={16} color="var(--primary)" />
                      {cat.name}
                    </div>
                  </td>
                  <td>
                    <span className="spec-chip" style={{ background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 700 }}>
                      {cat.prefix}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setEditCategory(cat);
                          setShowModal(true);
                        }}
                      >
                        <Edit3 size={14} /> Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CategoryModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditCategory(null);
        }}
        onSave={handleSaveCategory}
        initialData={editCategory}
        showToast={showToast}
      />
    </div>
  );
}
