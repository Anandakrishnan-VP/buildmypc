import React from 'react';
import { Package, Users, FileText, PlusCircle, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function DashboardPage({
  productsCount = 0,
  clientsCount = 0,
  quotations = [],
  onNavigate
}) {
  const draftQuotes = quotations.filter((q) => q.status === 'draft');
  const sentQuotes = quotations.filter((q) => q.status === 'sent' || q.status === 'accepted');
  const totalEstimatedRevenue = quotations
    .filter((q) => q.status === 'accepted' || q.status === 'sent')
    .reduce((sum, q) => sum + (q.grand_total || 0), 0);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Shop Dashboard</h1>
          <p className="page-subtitle">Overview of inventory, clients, and active PC quotations</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('build')}>
          <PlusCircle size={18} /> New Quotation
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid-stats">
        <div className="stat-card">
          <div className="stat-icon">
            <Package size={24} />
          </div>
          <div>
            <div className="stat-val">{productsCount}</div>
            <div className="stat-lbl">Active Components</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="stat-val">{clientsCount}</div>
            <div className="stat-lbl">Registered Clients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="stat-val">{draftQuotes.length}</div>
            <div className="stat-lbl">Draft Builds</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="stat-val">₹{totalEstimatedRevenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
            <div className="stat-lbl">Pipeline Value</div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Quotations */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Recent Quotations</h3>
            <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('quotations')}>
              View All <ArrowRight size={14} />
            </button>
          </div>

          {quotations.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No quotations created yet. Click <strong>"New Quotation"</strong> to start building a PC quote!
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Quote ID</th>
                    <th>Client</th>
                    <th>Build Name</th>
                    <th>Status</th>
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.slice(0, 5).map((q) => (
                    <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('quotations')}>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>{q.id}</td>
                      <td>{q.client_name || 'N/A'}</td>
                      <td>{q.build_name || 'Custom PC Build'}</td>
                      <td>
                        <span className={`badge badge-${q.status}`}>
                          {q.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700 }} className="price-display">
                        ₹{(q.grand_total || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Shortcuts */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Quick Actions</h3>

          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px' }}
            onClick={() => onNavigate('build')}
          >
            <PlusCircle size={18} color="var(--primary)" />
            <div>
              <div style={{ fontWeight: 600 }}>Create New PC Build</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Pick components & generate PDF quote</div>
            </div>
          </button>

          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px' }}
            onClick={() => onNavigate('catalog')}
          >
            <Package size={18} color="var(--accent)" />
            <div>
              <div style={{ fontWeight: 600 }}>Manage Catalog</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add CPU, GPU, RAM, Prices & Specs</div>
            </div>
          </button>

          <button
            className="btn btn-secondary"
            style={{ justifyContent: 'flex-start', padding: '14px' }}
            onClick={() => onNavigate('clients')}
          >
            <Users size={18} color="#10b981" />
            <div>
              <div style={{ fontWeight: 600 }}>Client Directory</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Add clients & GSTIN numbers</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
