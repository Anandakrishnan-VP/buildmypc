import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import CatalogPage from './pages/CatalogPage';
import CategoryManagerPage from './pages/CategoryManagerPage';
import ClientsPage from './pages/ClientsPage';
import BuildQuotationPage from './pages/BuildQuotationPage';
import QuotationListPage from './pages/QuotationListPage';
import SettingsPage from './pages/SettingsPage';
import ToastContainer from './components/ToastContainer';
import ConfirmModal from './components/ConfirmModal';
import Opening3DScreen from './components/Opening3DScreen';
import { api } from './api/client';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [categories, setCategories] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [productsCount, setProductsCount] = useState(0);
  const [editingQuoteId, setEditingQuoteId] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // 3D Opening Screen State
  const [show3DIntro, setShow3DIntro] = useState(() => {
    return !sessionStorage.getItem('zeus_intro_seen');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('zeus_intro_seen', 'true');
    setShow3DIntro(false);
  };

  // Custom Toast Notifications
  const [toasts, setToasts] = useState([]);

  // Custom Confirm Modal
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showConfirm = (title, message, onConfirm) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  // Theme Management (Dark / Light)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('zeus_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zeus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const fetchGlobalData = async () => {
    try {
      const [cats, cls, quotes, prods] = await Promise.all([
        api.getCategories(),
        api.getClients(),
        api.getQuotations(),
        api.getProducts({ activeOnly: true })
      ]);
      setCategories(cats);
      setClients(cls);
      setQuotations(quotes);
      setProductsCount(prods.length);
    } catch (err) {
      console.error('Failed to load global app data:', err);
    }
  };

  useEffect(() => {
    fetchGlobalData();
    const titleMap = {
      dashboard: 'Dashboard | Zeus Builder',
      catalog: 'Product Catalog | Zeus Builder',
      categories: 'Category Manager | Zeus Builder',
      clients: 'Client Directory | Zeus Builder',
      build: 'Build Quotation | Zeus Builder',
      quotations: 'Quotations List | Zeus Builder',
      settings: 'Shop Settings | Zeus Builder'
    };
    document.title = titleMap[activePage] || 'Zeus Builder | PC Quote & Inventory';
  }, [activePage]);

  const handleEditQuote = (id) => {
    setEditingQuoteId(id);
    setActivePage('build');
  };

  return (
    <div className="app-container">
      {show3DIntro && (
        <Opening3DScreen onComplete={handleIntroComplete} />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      <ConfirmModal
        isOpen={confirmState.isOpen}
        onClose={closeConfirm}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
      />

      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          if (page !== 'build') setEditingQuoteId(null);
          setActivePage(page);
        }}
        draftCount={quotations.filter((q) => q.status === 'draft').length}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {activePage === 'dashboard' && (
          <DashboardPage
            productsCount={productsCount}
            clientsCount={clients.length}
            quotations={quotations}
            onNavigate={(page) => {
              if (page !== 'build') setEditingQuoteId(null);
              setActivePage(page);
            }}
          />
        )}

        {activePage === 'catalog' && (
          <CatalogPage
            categories={categories}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        )}

        {activePage === 'categories' && (
          <CategoryManagerPage
            categories={categories}
            onRefresh={fetchGlobalData}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        )}

        {activePage === 'clients' && (
          <ClientsPage
            onNavigate={setActivePage}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        )}

        {activePage === 'build' && (
          <BuildQuotationPage
            categories={categories}
            clients={clients}
            activeQuoteId={editingQuoteId}
            showToast={showToast}
            showConfirm={showConfirm}
            onFinished={() => {
              setEditingQuoteId(null);
              fetchGlobalData();
              setActivePage('quotations');
            }}
          />
        )}

        {activePage === 'quotations' && (
          <QuotationListPage
            onEditQuote={handleEditQuote}
            onNavigate={(page) => setActivePage(page)}
            showToast={showToast}
            showConfirm={showConfirm}
          />
        )}

        {activePage === 'settings' && (
          <SettingsPage
            showToast={showToast}
            onReplayIntro={() => setShow3DIntro(true)}
          />
        )}
      </main>
    </div>
  );
}
