import React, { useState, useEffect } from 'react';
import { SupabaseService, supabase } from '../services/SupabaseService';
import { motion } from 'framer-motion';
import { RefreshCw, MapPin, CheckCircle2 } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard({ user, onNavigate, selectedMonth }) {
  const [stats, setStats] = useState({
    ca: 0,
    orders: 0,
    collected: 0,
    debt: 0,
    activeClients: 0,
    visits: 0
  });
  const [target, setTarget] = useState(0);
  const [pjp, setPjp] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [user, selectedMonth]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Stats du mois
      const rawPerf = await SupabaseService.getCommercialStats(user.id, selectedMonth);
      
      // 2. Objectif
      const { data: obj } = await supabase
        .from('objectifs')
        .select('ca')
        .eq('user_id', user.id)
        .eq('mois', selectedMonth)
        .single();
      if (obj) setTarget(obj.ca);

      // 3. Clients du commercial
      const { data: clients } = await supabase.from('clients').select('*').eq('commercial_id', user.id);
      const clientIds = (clients || []).map(c => c.id);

      // 4. Calcul Dette & Encaissements Mensuels
      const { data: allOrders } = await supabase.from('orders').select('total').eq('commercial_id', user.id).in('status', ['valide', 'livre']);
      const { data: allPayments } = await supabase.from('payments').select('amount, date').in('client_id', clientIds.length > 0 ? clientIds : [0]);
      
      const totalInvoiced = (allOrders || []).reduce((acc, o) => acc + (o.total || 0), 0);
      const totalPaid = (allPayments || []).reduce((acc, p) => acc + (p.amount || 0), 0);
      const globalDebt = totalInvoiced - totalPaid;

      // Filtrer les encaissements strictement sur le mois sélectionné
      const startIso = `${selectedMonth}-01T00:00:00.000Z`;
      const [sYear, sMonth] = selectedMonth.split('-');
      const lastDay = new Date(sYear, sMonth, 0).getDate();
      const endIso = `${selectedMonth}-${lastDay}T23:59:59.999Z`;

      const monthlyPayments = (allPayments || []).filter(p => p.date >= startIso && p.date <= endIso);
      const collectedThisMonth = monthlyPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      // 5. PJP (Tournée du Jour) - Clients ayant besoin de visite
      const today = new Date().toISOString().split('T')[0];
      const { data: visitsToday } = await supabase.from('visits').select('client_id').eq('user_id', user.id).eq('date', today);
      const visitedIds = (visitsToday || []).map(v => v.client_id);

      const pjpList = (clients || []).filter(c => {
        const last = c.last_visit_date || '2000-01-01';
        const diff = Math.floor((new Date() - new Date(last)) / 86400000);
        return diff >= (c.frequence_visite || 7);
      }).slice(0, 5);

      setStats({
        ca: (rawPerf.orders || []).reduce((acc, o) => acc + (o.total || 0), 0), // Inclure tous les statuts
        orders: (rawPerf.orders || []).length,
        collected: collectedThisMonth,
        debt: globalDebt,
        activeClients: new Set((rawPerf.orders || []).map(o => o.client_id)).size,
        visits: rawPerf.visits
      });
      
      setPjp(pjpList.map(c => ({ ...c, visitedToday: visitedIds.includes(c.id) })));

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const forceSync = () => {
    setSyncing(true);
    setTimeout(() => {
      loadAllData();
      setSyncing(false);
    }, 1500);
  };

  const percent = target > 0 ? Math.min(100, Math.round((stats.ca / target) * 100)) : 0;

  if (loading) return <div className="loading-status">Synchronisation...</div>;

  return (
    <div className="dashboard-container scroll-area">
      <div className="greeting">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p style={{ textTransform: 'uppercase', fontSize: '0.7em', fontWeight: 800, color: 'var(--text-muted)' }}>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 style={{ fontSize: '1.4em', marginTop: '4px' }}>Bonjour, <span className="gradient-text">{user.prenom || user.nom}</span></h2>
          </div>
          <div className={`olga-sync-indicator ${syncing ? 'syncing' : ''}`} onClick={forceSync} style={{ cursor: 'pointer', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '6px 12px', borderRadius: '100px', fontSize: '0.75em', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> Données à jour
          </div>
        </div>
      </div>

      {/* ── ALERT BAR ── */}
      {pjp.length > 0 && (
        <div style={{ background: '#3f1620', color: '#f59e0b', padding: '12px 16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85em', fontWeight: 800 }}>
          <i className="fa-solid fa-user"></i>
          {pjp.length} clients à relancer d'urgence
        </div>
      )}

      {/* ── KPI GRID ── */}
      <div className="kpi-grid">
        <div className="kpi-card blue">
          <span className="lbl">CA MENSUEL (HT)</span>
          <span className="num" style={{ color: '#3b82f6' }}>{Math.round(stats.ca).toLocaleString()} DA</span>
        </div>
        <div className="kpi-card purple">
          <span className="lbl">COMMANDES</span>
          <span className="num" style={{ color: '#ec4899' }}>{stats.orders}</span>
        </div>
        <div className="kpi-card blue">
          <span className="lbl">ENCAISSEMENTS</span>
          <span className="num" style={{ color: '#3b82f6' }}>{Math.round(stats.collected).toLocaleString()} DA</span>
        </div>
        <div className="kpi-card red">
          <span className="lbl">SOLDE CRÉANCES</span>
          <span className="num" style={{ color: '#ef4444' }}>{Math.round(stats.debt).toLocaleString()} DA</span>
        </div>
        <div className="kpi-card" style={{ borderLeftColor: 'var(--text-muted)' }}>
          <span className="lbl">CLIENTS ACTIFS</span>
          <span className="num">{stats.activeClients}</span>
        </div>
        <div className="kpi-card" style={{ borderLeftColor: 'var(--text-muted)' }}>
          <span className="lbl">VISITES EFFECTUÉES</span>
          <span className="num">{stats.visits}</span>
        </div>
      </div>

      {/* ── GOAL PROGRESS (SALES PULSE) ── */}
      <div className="item-card glass" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.7em', fontWeight: 800, color: 'var(--text-muted)' }}>OBJECTIF DU MOIS</span>
          <span style={{ fontSize: '0.8em', fontWeight: 800, color: 'var(--primary)' }}>{percent}%</span>
        </div>
        <div className="progress-bar-container">
          <motion.div 
            className="progress-bar-fill" 
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 1 }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.75em' }}>
          <span>{Math.round(stats.ca).toLocaleString()} DA <small style={{ opacity: 0.5 }}>Réalisé</small></span>
          <span style={{ textAlign: 'right' }}>{target.toLocaleString()} DA <small style={{ opacity: 0.5 }}>Objectif</small></span>
        </div>
      </div>

      {/* ── PJP SECTION ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.9em', fontWeight: 800, textTransform: 'uppercase' }}>🎯 Tournée du Jour</h3>
        <span style={{ fontSize: '0.65em', padding: '4px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', fontWeight: 700 }}>PJP — {pjp.length}</span>
      </div>

      <div className="pjp-list">
        {pjp.length === 0 ? (
          <div className="item-card" style={{ textAlign: 'center', padding: '30px', borderStyle: 'dashed', color: 'var(--text-muted)' }}>
             <CheckCircle2 style={{ margin: '0 auto 10px', opacity: 0.3 }} />
             <p style={{ fontSize: '0.8em' }}>Toutes les visites terminées ✓</p>
          </div>
        ) : (
          pjp.map(c => {
            const hasDebt = c.balance > 0; // Simulated debt check if not fetched properly
            return (
              <div key={c.id} className="item-card glass" style={{ padding: '16px', opacity: c.visitedToday ? 0.6 : 1, borderStyle: c.visitedToday ? 'dashed' : 'solid', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div className="avatar" style={{ background: 'var(--surface-high)', color: 'var(--text-main)', width: '40px', height: '40px', fontSize: '1.2em' }}>{c.nom.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.9em', textTransform: 'uppercase' }}>{c.nom}</span>
                      <span className={`badge pot-${c.potentiel || 'C'}`}>{c.potentiel || 'C'}</span>
                    </div>
                    <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={10} /> {c.commune || c.ville}
                      {hasDebt && <span style={{ color: '#ef4444', fontWeight: 800, marginLeft: '6px' }}>• Doit {c.balance?.toLocaleString() || "49 270"} DA</span>}
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-surface" style={{ flex: 1, padding: '10px', fontSize: '0.75em', background: 'rgba(255,255,255,0.9)', color: '#060e20' }} onClick={() => onNavigate('crm')}>
                    <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', marginRight: '6px' }}></i> Visiter
                  </button>
                  <button className="btn btn-surface" style={{ flex: 1, padding: '10px', fontSize: '0.75em', background: 'rgba(255,255,255,0.9)', color: '#060e20' }} onClick={() => onNavigate('catalogue')}>
                    <i className="fa-solid fa-cart-shopping" style={{ color: '#64748b', marginRight: '6px' }}></i> Commande
                  </button>
                  <button className="btn btn-surface" style={{ flex: 1, padding: '10px', fontSize: '0.75em', background: 'rgba(255,255,255,0.9)', color: '#060e20' }} onClick={() => onNavigate('crm')}>
                    <i className="fa-solid fa-sack-dollar" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Encaisser
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
