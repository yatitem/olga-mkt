import React, { useState, useEffect } from 'react';
import { SupabaseService } from './services/SupabaseService';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Catalogue from './pages/Catalogue';
import CRM from './pages/CRM';
import History from './pages/History';
import Truck from './pages/Truck';
import News from './pages/News';
import CompetitorPricing from './pages/CompetitorPricing';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [cart, setCart] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  const monthsList = [
    { value: '01', label: 'janv.' }, { value: '02', label: 'févr.' }, { value: '03', label: 'mars' },
    { value: '04', label: 'avr.' }, { value: '05', label: 'mai' }, { value: '06', label: 'juin' },
    { value: '07', label: 'juil.' }, { value: '08', label: 'août' }, { value: '09', label: 'sept.' },
    { value: '10', label: 'oct.' }, { value: '11', label: 'nov.' }, { value: '12', label: 'déc.' }
  ];
  const currentYear = selectedMonth.split('-')[0];
  const currentMonthValue = selectedMonth.split('-')[1];

  useEffect(() => {
    const saved = sessionStorage.getItem('olga_fdv_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    sessionStorage.setItem('olga_fdv_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('olga_fdv_user');
    setUser(null);
  };

  const startOrderForClient = (client) => {
    setSelectedClient(client);
    setCurrentPage('catalogue');
  };

  const [showMenu, setShowMenu] = useState(false);

  const navigateTo = (page) => {
    setCurrentPage(page);
    setShowMenu(false);
  };

  if (loading) return <div className="loading-status">Initialisation...</div>;
  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      {/* ── TOP BAR (MIROIR) ── */}
      <header className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <button className="btn-logout" onClick={() => setShowMenu(true)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.2em' }}>
            <i className="fa-solid fa-bars"></i>
          </button>
          <div className="topbar-logo" style={{ fontSize: '1.2em' }}>
            <i className="fa-solid fa-droplet gradient-text"></i>
            <span style={{ fontWeight: 800 }}>OLGA <small style={{ fontSize: '0.6em', opacity: 0.5 }}>TERRAIN</small></span>
          </div>
        </div>

        {/* ── FILTRE PAR MOIS ── */}
        <div style={{ position: 'relative' }}>
          <div onClick={() => setShowMonthPicker(!showMonthPicker)} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 16px', borderRadius: '100px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}>
            <i className="fa-regular fa-calendar" style={{ color: 'var(--primary)' }}></i>
            <span style={{ fontWeight: 800, fontSize: '0.85em', textTransform: 'capitalize' }}>
              {monthsList.find(m => m.value === currentMonthValue)?.label} {currentYear}
            </span>
            <i className="fa-solid fa-chevron-down" style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}></i>
          </div>

          <AnimatePresence>
            {showMonthPicker && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '10px', background: '#fff', borderRadius: '16px', padding: '15px', width: '260px', zIndex: 1000, color: '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                  <button onClick={() => setSelectedMonth(`${parseInt(currentYear)-1}-${currentMonthValue}`)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-chevron-left"></i></button>
                  <span style={{ fontWeight: 900 }}>{currentYear}</span>
                  <button onClick={() => setSelectedMonth(`${parseInt(currentYear)+1}-${currentMonthValue}`)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><i className="fa-solid fa-chevron-right"></i></button>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '15px' }}>
                  {monthsList.map(m => (
                    <button 
                      key={m.value}
                      onClick={() => { setSelectedMonth(`${currentYear}-${m.value}`); setShowMonthPicker(false); }}
                      style={{ 
                        padding: '8px 0', border: 'none', borderRadius: '8px', fontSize: '0.85em', fontWeight: 700, cursor: 'pointer',
                        background: currentMonthValue === m.value ? 'var(--primary)' : 'transparent',
                        color: currentMonthValue === m.value ? '#fff' : '#444'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85em', fontWeight: 800 }}>
                  <button onClick={() => setShowMonthPicker(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Effacer</button>
                  <button onClick={() => { setSelectedMonth(new Date().toISOString().slice(0, 7)); setShowMonthPicker(false); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}>Ce mois</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="topbar-user">
          <div className="user-pill" style={{ background: 'transparent', padding: 0 }}>
            {user.prenom || user.nom}
          </div>
        </div>
      </header>

      {/* ── SIDE MENU ── */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1999, backdropFilter: 'blur(5px)' }}
              onClick={() => setShowMenu(false)} />
            <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
              style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', background: 'var(--surface-high)', zIndex: 2000, padding: '20px', display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--glass-border)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div className="topbar-logo">
                  <i className="fa-solid fa-droplet gradient-text"></i>
                  <span style={{ fontWeight: 800 }}>MENU</span>
                </div>
                <button onClick={() => setShowMenu(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5em', cursor: 'pointer' }}>&times;</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                <button className="btn btn-surface" onClick={() => navigateTo('truck')} style={{ justifyContent: 'flex-start', padding: '15px', fontSize: '1em' }}><i class="fa-solid fa-truck" style={{ width: '25px', color: 'var(--accent)' }}></i> Stock Camion</button>
                <button className="btn btn-surface" onClick={() => navigateTo('news')} style={{ justifyContent: 'flex-start', padding: '15px', fontSize: '1em' }}><i class="fa-solid fa-bullhorn" style={{ width: '25px', color: 'var(--orange)' }}></i> Messages Flash</button>
                <button className="btn btn-surface" onClick={() => navigateTo('veille')} style={{ justifyContent: 'flex-start', padding: '15px', fontSize: '1em' }}><i class="fa-solid fa-eye" style={{ width: '25px', color: 'var(--primary)' }}></i> Veille Concurrentielle</button>
              </div>

              <button className="btn btn-surface" onClick={handleLogout} style={{ marginTop: 'auto', color: 'var(--red)', borderColor: 'rgba(244, 63, 94, 0.2)', padding: '15px' }}>
                <i className="fa-solid fa-right-from-bracket" style={{ marginRight: '10px' }}></i> Déconnexion
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── CONTENT AREA ── */}
      <main className="scroll-area">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            style={{ padding: '30px 20px 100px' }}
          >
            {currentPage === 'dashboard' && <Dashboard user={user} onNavigate={setCurrentPage} selectedMonth={selectedMonth} />}
            {currentPage === 'crm' && <CRM user={user} onStartOrder={startOrderForClient} />}
            {currentPage === 'catalogue' && <Catalogue user={user} cart={cart} setCart={setCart} client={selectedClient} setClient={setSelectedClient} />}
            {currentPage === 'history' && <History user={user} defaultTab="orders" selectedMonth={selectedMonth} onNavigate={setCurrentPage} onStartOrder={startOrderForClient} />}
            {currentPage === 'stats' && <History user={user} defaultTab="analyse" selectedMonth={selectedMonth} onNavigate={setCurrentPage} onStartOrder={startOrderForClient} />}
            {currentPage === 'truck' && <Truck user={user} />}
            {currentPage === 'news' && <News />}
            {currentPage === 'veille' && <CompetitorPricing />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── BOTTOM NAV (MIROIR) ── */}
      <nav className="bottom-nav">
        <button className={`nav-item ${currentPage === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentPage('dashboard')}>
          <i className="fa-solid fa-house"></i>
          <span>Cockpit</span>
        </button>
        <button className={`nav-item ${currentPage === 'crm' ? 'active' : ''}`} onClick={() => setCurrentPage('crm')}>
          <i className="fa-solid fa-users"></i>
          <span>Clients</span>
        </button>
        <div className="nav-center" onClick={() => setCurrentPage('catalogue')}>
          <div className={`nav-fab ${currentPage === 'catalogue' ? 'active' : ''}`}>
            <Plus size={28} color="white" />
          </div>
        </div>
        <button className={`nav-item ${currentPage === 'history' ? 'active' : ''}`} onClick={() => setCurrentPage('history')}>
          <i className="fa-solid fa-clipboard-list"></i>
          <span>Suivi</span>
        </button>
        <button className={`nav-item ${currentPage === 'stats' ? 'active' : ''}`} onClick={() => setCurrentPage('stats')}>
          <i className="fa-solid fa-chart-line"></i>
          <span>Analyse</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
