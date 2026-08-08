import React, { useState, useEffect } from 'react';
import { X, TrendingUp, TrendingDown, DollarSign, Calendar, Clock, BarChart2 } from 'lucide-react';
import { api } from '../api/client';

export default function PriceHistoryModal({ product, isOpen, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverPoint, setHoverPoint] = useState(null);

  useEffect(() => {
    if (isOpen && product) {
      setLoading(true);
      api.getPriceHistory(product.id)
        .then((data) => {
          let list = data || [];
          // Ensure current price is at least in the list if empty
          if (list.length === 0 && product) {
            list = [{
              product_id: product.id,
              base_price: product.base_price || 0,
              price_after_gst: product.price_after_gst || 0,
              created_at: product.created_at || new Date().toISOString()
            }];
          }
          setHistory(list);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const prices = history.map(h => Number(h.price_after_gst) || 0);
  const currentPrice = Number(product.price_after_gst) || (prices[prices.length - 1] || 0);
  const initialPrice = prices[0] || currentPrice;
  const minPrice = Math.min(...prices, currentPrice);
  const maxPrice = Math.max(...prices, currentPrice);
  const priceDiff = currentPrice - initialPrice;
  const percentDiff = initialPrice > 0 ? ((priceDiff / initialPrice) * 100).toFixed(1) : 0;

  // Generate SVG Line Chart coordinates
  const svgWidth = 640;
  const svgHeight = 220;
  const padding = 40;
  const graphWidth = svgWidth - padding * 2;
  const graphHeight = svgHeight - padding * 2;

  const range = maxPrice - minPrice || 1;
  const points = history.map((h, i) => {
    const p = Number(h.price_after_gst) || 0;
    const x = history.length === 1 ? svgWidth / 2 : padding + (i / (history.length - 1)) * graphWidth;
    const y = padding + graphHeight - ((p - minPrice) / range) * graphHeight;
    return { x, y, price: p, basePrice: h.base_price, date: h.created_at, raw: h };
  });

  const polylinePoints = points.map(pt => `${pt.x},${pt.y}`).join(' ');

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 11000 }}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '740px',
          width: '94%',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '28px',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BarChart2 size={16} /> Component Price History Log
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--text-main)', margin: 0 }}>
              {product.brand} {product.model_name}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Product ID: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{product.id}</span>
            </div>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading price trends...</div>
        ) : (
          <>
            {/* Stat Cards Overview */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Current Price</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--text-main)', marginTop: '2px' }}>
                  ₹{currentPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Lowest Recorded</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                  ₹{minPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Highest Recorded</div>
                <div style={{ fontSize: '18px', fontWeight: 900, color: '#ef4444', marginTop: '2px' }}>
                  ₹{maxPrice.toLocaleString('en-IN')}
                </div>
              </div>

              <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>Price Trend</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '15px', fontWeight: 900, color: priceDiff > 0 ? '#ef4444' : priceDiff < 0 ? '#10b981' : 'var(--text-muted)', marginTop: '2px' }}>
                  {priceDiff > 0 ? <TrendingUp size={16} /> : priceDiff < 0 ? <TrendingDown size={16} /> : null}
                  {priceDiff === 0 ? 'Stable' : `${priceDiff > 0 ? '+' : ''}₹${Math.abs(priceDiff).toLocaleString('en-IN')} (${percentDiff}%)`}
                </div>
              </div>
            </div>

            {/* Price History Line Graph */}
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', marginBottom: '24px', position: 'relative' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '12px', textTransform: 'uppercase' }}>
                Price Variation Over Time (Incl. GST)
              </div>

              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
                {/* Horizontal Baseline Grids */}
                <line x1={padding} y1={padding} x2={svgWidth - padding} y2={padding} stroke="var(--border-color)" strokeDasharray="4 4" />
                <line x1={padding} y1={padding + graphHeight / 2} x2={svgWidth - padding} y2={padding + graphHeight / 2} stroke="var(--border-color)" strokeDasharray="4 4" />
                <line x1={padding} y1={padding + graphHeight} x2={svgWidth - padding} y2={padding + graphHeight} stroke="var(--border-color)" strokeDasharray="4 4" />

                {/* Y-Axis Labels */}
                <text x={padding - 8} y={padding + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">₹{maxPrice.toLocaleString('en-IN')}</text>
                <text x={padding - 8} y={padding + graphHeight + 4} textAnchor="end" fontSize="10" fill="var(--text-muted)">₹{minPrice.toLocaleString('en-IN')}</text>

                {/* Trend Polyline */}
                {points.length > 1 && (
                  <polyline
                    fill="none"
                    stroke="#FFCC06"
                    strokeWidth="3"
                    points={polylinePoints}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data Points */}
                {points.map((pt, i) => (
                  <g key={i}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoverPoint === i ? '7' : '5'}
                      fill={hoverPoint === i ? '#ffffff' : '#FFCC06'}
                      stroke="#000000"
                      strokeWidth="2"
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={() => setHoverPoint(i)}
                      onMouseLeave={() => setHoverPoint(null)}
                    />
                    <text x={pt.x} y={svgHeight - 10} textAnchor="middle" fontSize="10" fill="var(--text-muted)">
                      {new Date(pt.date).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Hover Tooltip Box */}
              {hoverPoint !== null && points[hoverPoint] && (
                <div
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-accent)',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                >
                  <div style={{ fontWeight: 800, color: 'var(--primary)' }}>₹{points[hoverPoint].price.toLocaleString('en-IN')}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(points[hoverPoint].date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>

            {/* Audit Log Table */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '10px' }}>
                Detailed Price Update History
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date & Time</th>
                      <th>Base Price</th>
                      <th>Price (Incl. GST)</th>
                      <th>Change vs Prev</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.slice().reverse().map((h, idx) => {
                      const cur = Number(h.price_after_gst) || 0;
                      const prevHist = history[history.length - 1 - idx - 1];
                      const prev = prevHist ? Number(prevHist.price_after_gst) : null;
                      const diff = prev !== null ? cur - prev : 0;

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{history.length - idx}</td>
                          <td style={{ fontSize: '12px', fontWeight: 600 }}>
                            {new Date(h.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>₹{Number(h.base_price || 0).toLocaleString('en-IN')}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-main)' }}>
                            ₹{cur.toLocaleString('en-IN')}
                          </td>
                          <td>
                            {prev === null ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Initial Record</span>
                            ) : diff === 0 ? (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>No Change</span>
                            ) : (
                              <span style={{ fontSize: '11px', fontWeight: 800, color: diff > 0 ? '#ef4444' : '#10b981' }}>
                                {diff > 0 ? `+₹${diff.toLocaleString('en-IN')}` : `-₹${Math.abs(diff).toLocaleString('en-IN')}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
