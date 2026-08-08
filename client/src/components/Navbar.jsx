import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  FolderKanban, 
  Users, 
  FileText, 
  PlusCircle, 
  Settings,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
} from 'lucide-react';

export default function Navbar({
  activePage,
  setActivePage,
  draftCount = 0,
  isCollapsed = false,
  setIsCollapsed = () => {},
  theme = 'dark',
  toggleTheme = () => {}
}) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'catalog', label: 'Product Catalog', icon: Package },
    { id: 'categories', label: 'Categories', icon: FolderKanban },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'build', label: 'Build Quotation', icon: PlusCircle, highlight: true },
    { id: 'quotations', label: 'Quotations', icon: FileText, badge: draftCount },
    { id: 'settings', label: 'Shop Settings', icon: Settings }
  ];

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="brand-header">
        <div className="brand-info" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isCollapsed ? (
            <div className="brand-details">
              <div className="brand-title" style={{ fontSize: '15px', fontWeight: 900, letterSpacing: '1px' }}>SREEJITH</div>
              <div className="brand-subtitle" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PC Quote & Inventory</div>
            </div>
          ) : (
            <div className="brand-title" style={{ fontSize: '14px', fontWeight: 900 }}>S</div>
          )}
        </div>

        <button
          className="collapse-toggle-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Expand Menu" : "Collapse Menu"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <ul className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <li key={item.id} className="nav-item">
              <button
                className={`${isActive ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={19} />
                <span className="nav-label" style={{ flex: 1 }}>{item.label}</span>
                {item.badge > 0 && (
                  <span className="nav-badge" style={{
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 700
                  }}>
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Theme Switcher Footer */}
      <div className="sidebar-footer">
        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} color="#f59e0b" /> : <Moon size={18} color="#7c3aed" />}
          <span className="theme-label">
            {theme === 'dark' ? 'Light Mode' : 'Retro Dark'}
          </span>
        </button>
      </div>
    </aside>
  );
}
