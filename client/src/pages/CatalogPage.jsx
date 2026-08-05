import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit3, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import ProductFormModal from '../components/ProductFormModal';

export default function CatalogPage({ categories = [], showToast = () => {}, showConfirm = () => {} }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const data = await api.getProducts({
        search,
        category: selectedCategory,
        activeOnly: false
      });
      setProducts(data);
    } catch (err) {
      showToast('Error loading catalog: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [search, selectedCategory]);

  const handleSaveProduct = async (formData) => {
    try {
      if (editProduct) {
        await api.updateProduct(editProduct.id, formData);
        showToast(`Product ${editProduct.id} updated successfully`, 'success');
      } else {
        const created = await api.createProduct(formData);
        showToast(`Product ${created.id} created successfully`, 'success');
      }
      setShowModal(false);
      setEditProduct(null);
      fetchProducts();
    } catch (err) {
      showToast('Failed to save product: ' + err.message, 'error');
    }
  };

  const handleDeleteProduct = (product) => {
    showConfirm(
      'Delete Product',
      `Are you sure you want to delete "${product.brand} ${product.model_name}"?`,
      async () => {
        try {
          const res = await api.deleteProduct(product.id);
          showToast(res.message, 'success');
          fetchProducts();
        } catch (err) {
          showToast('Failed to delete product: ' + err.message, 'error');
        }
      }
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Product Catalog</h1>
          <p className="page-subtitle">Manage component inventory, base prices, GST rates, and specs</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditProduct(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Add Component
        </button>
      </div>

      {/* Filters Bar */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search brand, model (e.g. 16GB, RTX 4070, i5)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ width: '220px' }}>
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading catalog...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No products found matching your search.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Category</th>
                  <th>Brand & Model</th>
                  <th>Specifications</th>
                  <th>Base Price</th>
                  <th>GST %</th>
                  <th>Price After GST</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} style={{ opacity: p.is_active ? 1 : 0.5 }}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      {p.id}
                    </td>
                    <td>
                      <span className="spec-chip" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                        {p.category_name || p.category_id}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{p.brand}</div>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{p.model_name}</div>
                    </td>
                    <td style={{ maxWidth: '280px' }}>
                      {Array.isArray(p.specs) && p.specs.length > 0 ? (
                        p.specs.map((specObj, idx) => {
                          const k = Object.keys(specObj)[0];
                          const v = specObj[k];
                          return (
                            <span key={idx} className="spec-chip">
                              <strong>{k}:</strong> {v}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No specs</span>
                      )}
                    </td>
                    <td className="price-display">₹{p.base_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{p.gst_percent}%</td>
                    <td className="price-display" style={{ fontWeight: 700, color: '#10b981' }}>
                      ₹{p.price_after_gst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      {p.stock_qty !== null ? (
                        <span style={{ color: p.stock_qty > 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                          {p.stock_qty} in stock
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>N/A</span>
                      )}
                    </td>
                    <td>
                      {p.is_active ? (
                        <span className="badge badge-accepted" style={{ fontSize: '10px' }}>Active</span>
                      ) : (
                        <span className="badge badge-rejected" style={{ fontSize: '10px' }}>Inactive</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditProduct(p);
                            setShowModal(true);
                          }}
                          title="Edit Product"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteProduct(p)}
                          title="Delete / Deactivate Product"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ProductFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditProduct(null);
        }}
        onSave={handleSaveProduct}
        categories={categories}
        initialData={editProduct}
        showToast={showToast}
      />
    </div>
  );
}
