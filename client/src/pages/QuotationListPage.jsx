import React, { useState, useEffect } from 'react';
import { Search, Download, Copy, Edit3, Trash2, FileText, Printer } from 'lucide-react';
import { api } from '../api/client';
import PrintableQuotationModal from '../components/PrintableQuotationModal';

export default function QuotationListPage({ onEditQuote, onNavigate, showToast = () => {}, showConfirm = () => {} }) {
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [activeQuoteData, setActiveQuoteData] = useState(null);
  const [activeClientData, setActiveClientData] = useState(null);
  const [activeQuoteItems, setActiveQuoteItems] = useState([]);
  const [settingsData, setSettingsData] = useState({});
  const [categories, setCategories] = useState([]);

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const data = await api.getQuotations({ search, status: statusFilter });
      setQuotations(data || []);
    } catch (err) {
      showToast('Failed to load quotations: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
    api.getSettings().then((s) => setSettingsData(s || {}));
    api.getCategories().then((c) => setCategories(c || []));
  }, [search, statusFilter]);

  const handleDownloadPdf = async (id) => {
    try {
      // Load full quote and client data for printing
      const fullQuote = await api.getQuotation(id);
      if (fullQuote) {
        setActiveQuoteData(fullQuote.quotation);
        setActiveQuoteItems(fullQuote.items || []);
        if (fullQuote.quotation && fullQuote.quotation.client_id) {
          const clientData = await api.getClient(fullQuote.quotation.client_id).catch(() => null);
          setActiveClientData(clientData);
        }
      }

      // Try server PDF download first
      try {
        const blob = await api.getPdfBlob(id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Quotation_${id}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
        showToast(`Downloaded PDF for quotation ${id}`, 'success');
      } catch (e) {
        // Express PDF endpoint unavailable -> open printable PDF modal
        setPrintModalOpen(true);
        showToast(`Opening printable PDF for quotation ${id}...`, 'info');
      }
    } catch (err) {
      showToast('Failed to load quotation: ' + err.message, 'error');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const cloned = await api.duplicateQuotation(id);
      if (!cloned || !cloned.id) {
        throw new Error('No quotation returned from duplicate operation');
      }
      showToast(`Quotation duplicated successfully as ${cloned.id}!`, 'success');
      fetchQuotations();
    } catch (err) {
      showToast('Failed to duplicate quotation: ' + err.message, 'error');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.updateQuotation(id, { status: newStatus });
      showToast(`Status updated to ${newStatus.toUpperCase()}`, 'info');
      fetchQuotations();
    } catch (err) {
      showToast('Failed to update status: ' + err.message, 'error');
    }
  };

  const handleDelete = (id) => {
    showConfirm(
      'Delete Quotation',
      `Are you sure you want to delete quotation ${id}?`,
      async () => {
        try {
          await api.deleteQuotation(id);
          showToast(`Quotation ${id} deleted`, 'success');
          fetchQuotations();
        } catch (err) {
          showToast('Failed to delete quotation: ' + err.message, 'error');
        }
      }
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Quotation Management</h1>
          <p className="page-subtitle">Track sent quotes, duplicate past builds, and export PDF quotations</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('build')}>
          <FileText size={18} /> Build New Quote
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search quote number, client name, or build title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>

        <div style={{ width: '220px' }}>
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="confirmation_pending">Confirmation Pending</option>
            <option value="sent">Sent</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Quotation Table */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading quotations...</div>
        ) : quotations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No quotations found. Click <strong>"Build New Quote"</strong> to start.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Quotation ID</th>
                  <th>Client</th>
                  <th>Build Title</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Status</th>
                  <th>Grand Total</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {quotations.map((q) => (
                  <tr key={q.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                      {q.id}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{q.client_name || 'N/A'}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.client_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{q.build_name || 'Custom PC Build'}</div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      {new Date(q.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td>
                      <span className="spec-chip">{q.items ? q.items.length : (q.item_count || 0)} parts</span>
                    </td>
                    <td>
                      <select
                        className={`badge badge-${q.status}`}
                        value={q.status || 'draft'}
                        onChange={(e) => handleStatusChange(q.id, e.target.value)}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
                      >
                        <option value="draft">DRAFT</option>
                        <option value="confirmation_pending">CONFIRMATION PENDING</option>
                        <option value="sent">SENT</option>
                        <option value="accepted">ACCEPTED</option>
                        <option value="rejected">REJECTED</option>
                      </select>
                    </td>
                    <td style={{ fontWeight: 700, color: '#10b981' }} className="price-display">
                      ₹{q.grand_total ? q.grand_total.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditQuote(q.id)}
                          title="Edit Quotation"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleDuplicate(q.id)}
                          title="Duplicate Quotation"
                        >
                          <Copy size={14} /> Clone
                        </button>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDownloadPdf(q.id)}
                          title="Download PDF"
                        >
                          <Download size={14} /> PDF
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(q.id)}
                          title="Delete Quotation"
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

      {/* Printable Quotation Modal */}
      <PrintableQuotationModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        quotation={activeQuoteData}
        client={activeClientData}
        items={activeQuoteItems}
        categories={categories}
        settings={settingsData}
      />
    </div>
  );
}
