import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, FileText, Edit3, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import ClientFormModal from '../components/ClientFormModal';

export default function ClientsPage({ onNavigate, showToast = () => {}, showConfirm = () => {} }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClient, setEditClient] = useState(null);
  const [selectedClientHistory, setSelectedClientHistory] = useState(null);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const data = await api.getClients(search);
      setClients(data);
    } catch (err) {
      showToast('Error fetching clients: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [search]);

  const handleSaveClient = async (formData) => {
    try {
      if (editClient) {
        await api.updateClient(editClient.id, formData);
        showToast(`Client "${formData.name}" updated`, 'success');
      } else {
        const created = await api.createClient(formData);
        showToast(`Client "${created.name}" created (${created.id})`, 'success');
      }
      setShowModal(false);
      setEditClient(null);
      fetchClients();
    } catch (err) {
      showToast('Failed to save client: ' + err.message, 'error');
    }
  };

  const handleDeleteClient = (c) => {
    showConfirm(
      'Delete Client',
      `Are you sure you want to delete client "${c.name}"?`,
      async () => {
        try {
          await api.deleteClient(c.id);
          showToast(`Client "${c.name}" deleted successfully`, 'success');
          fetchClients();
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
    );
  };

  const viewHistory = async (c) => {
    try {
      const details = await api.getClient(c.id);
      setSelectedClientHistory(details);
    } catch (err) {
      showToast('Failed to load client history: ' + err.message, 'error');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Client Directory</h1>
          <p className="page-subtitle">Manage retail and corporate customers, billing addresses, and B2B GSTINs</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditClient(null);
            setShowModal(true);
          }}
        >
          <Plus size={18} /> Add Client
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by client name, phone, email, or GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px' }}
          />
        </div>
      </div>

      {/* Clients List */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading clients...</div>
        ) : clients.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No clients found. Click <strong>"Add Client"</strong> to register a customer.
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Client ID</th>
                  <th>Name</th>
                  <th>Contact Information</th>
                  <th>GSTIN</th>
                  <th>Address</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--primary)' }}>{c.id}</td>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>{c.name}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <Phone size={14} color="var(--primary)" /> {c.phone}
                      </div>
                      {c.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <Mail size={14} /> {c.email}
                        </div>
                      )}
                    </td>
                    <td>
                      {c.gstin ? (
                        <span className="spec-chip" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                          {c.gstin}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Individual</span>
                      )}
                    </td>
                    <td style={{ maxWidth: '240px', fontSize: '13px', color: 'var(--text-muted)' }}>
                      {c.address || 'N/A'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => viewHistory(c)}
                          title="View Quotation History"
                        >
                          <FileText size={14} /> Quotes
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setEditClient(c);
                            setShowModal(true);
                          }}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteClient(c)}
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

      {/* History Drawer Modal */}
      {selectedClientHistory && (
        <div className="modal-overlay" onClick={() => setSelectedClientHistory(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Quotation History — {selectedClientHistory.name}
              </h3>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedClientHistory(null)}>
                Close
              </button>
            </div>
            <div className="modal-body">
              {selectedClientHistory.quotations.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                  No quotations created for this client yet.
                </div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Quote ID</th>
                        <th>Build Name</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedClientHistory.quotations.map((q) => (
                        <tr key={q.id}>
                          <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.id}</td>
                          <td>{q.build_name || 'Custom PC'}</td>
                          <td>
                            <span className={`badge badge-${q.status}`}>{q.status}</span>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {new Date(q.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ClientFormModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditClient(null);
        }}
        onSave={handleSaveClient}
        initialData={editClient}
        showToast={showToast}
      />
    </div>
  );
}
