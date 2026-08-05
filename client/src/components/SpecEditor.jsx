import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function SpecEditor({ specs = [], onChange }) {
  // Convert specs array of objects e.g. [{Cores:"14"}, {Socket:"LGA1700"}] to key-value rows
  const rows = specs.map((obj) => {
    const key = Object.keys(obj)[0] || '';
    const val = obj[key] || '';
    return { key, val };
  });

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    const formatted = updated.map((r) => ({ [r.key.trim()]: r.val.trim() }));
    onChange(formatted);
  };

  const addRow = () => {
    const updated = [...rows, { key: '', val: '' }];
    const formatted = updated.map((r) => ({ [r.key.trim()]: r.val.trim() }));
    onChange(formatted);
  };

  const removeRow = (index) => {
    const updated = rows.filter((_, i) => i !== index);
    const formatted = updated.map((r) => ({ [r.key.trim()]: r.val.trim() }));
    onChange(formatted);
  };

  return (
    <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <label className="form-label" style={{ margin: 0 }}>Specifications (Key - Value)</label>
        <button type="button" className="btn btn-secondary btn-sm" onClick={addRow}>
          <Plus size={14} /> Add Spec
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
          No specs added yet. Click "Add Spec" to add Cores, Socket, Speed, etc.
        </div>
      ) : (
        rows.map((row, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Cores / Speed"
              value={row.key}
              onChange={(e) => handleRowChange(idx, 'key', e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              className="form-input"
              placeholder="e.g. 14 (6P+8E) / 6000MHz"
              value={row.val}
              onChange={(e) => handleRowChange(idx, 'val', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={() => removeRow(idx)}
              title="Remove Spec"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
