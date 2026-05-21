import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Wallet, BarChart3, Receipt, ChevronRight, TrendingUp, X, PenTool } from 'lucide-react';
import { SupabaseService, supabase } from '../services/SupabaseService';

export default function History({ user, defaultTab = 'orders', selectedMonth, onNavigate, onStartOrder }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [sortTopBy, setSortTopBy] = useState('volume');
  const [data, setData] = useState({
    orders: [],
    dettes: [],
    payments: [],
    performance: null,
    target: 0
  });
  const [loading, setLoading] = useState(true);

  // Modal Signature
  const [showSigModal, setShowSigModal] = useState(false);
  const [orderToSign, setOrderToSign] = useState(null);
  const sigCanvas = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Modal Details
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    loadData();
  }, [selectedMonth]); // Reload when month changes

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: clients } = await supabase.from('clients')
        .select('id, nom, commune').eq('commercial_id', user.id);
      const clientIds = (clients || []).map(c => c.id);

      const { data: rawOrders } = await supabase.from('orders')
        .select('*').eq('commercial_id', user.id).order('date', { ascending: false });
      
      const orders = (rawOrders || []).map(o => {
        const client = (clients || []).find(c => c.id === o.client_id);
        return { ...o, client_nom: o.client_nom || (client ? client.nom : 'Client Inconnu') };
      });

      const { data: clientPayments } = await supabase.from('payments')
        .select('*').in('client_id', clientIds.length > 0 ? clientIds : [0]).order('date', { ascending: false });

      const ownPayments = (clientPayments || []).filter(p => p.user_id === user.id);

      const dettesList = (clients || []).map(c => {
        const cOrders = (orders || []).filter(o => o.client_id === c.id && ['valide', 'livre'].includes(o.status));
        const cPayments = (clientPayments || []).filter(p => p.client_id === c.id);
        const total = cOrders.reduce((acc, o) => acc + (o.total || 0), 0);
        const paid = cPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
        return { ...c, total, paid, balance: total - paid };
      }).filter(c => c.balance > 0).sort((a,b) => b.balance - a.balance);

      const { data: obj } = await supabase
        .from('objectifs')
        .select('ca')
        .eq('user_id', user.id)
        .eq('mois', selectedMonth)
        .single();

      setData({
        orders: orders || [],
        payments: ownPayments || [],
        dettes: dettesList,
        target: obj ? obj.ca : 0
      });

    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  // Logique de filtrage calculée à chaque rendu (ou via useMemo pour perf)
  const filteredData = useMemo(() => {
    const orders = data.orders.filter(o => !selectedMonth || o.date?.startsWith(selectedMonth));
    const payments = data.payments.filter(p => !selectedMonth || p.date?.startsWith(selectedMonth));
    
    const productStats = {};
    orders.forEach(o => {
      if (!['valide', 'livre', 'soumis'].includes(o.status)) return;
      let itemsArray = o.items || [];
      if (typeof itemsArray === 'string') {
        try { itemsArray = JSON.parse(itemsArray); } catch(e) { itemsArray = []; }
      }
      if (!Array.isArray(itemsArray)) itemsArray = [];
      itemsArray.forEach(item => {
        if (!productStats[item.product_id]) {
          productStats[item.product_id] = { nom: item.nom || 'Produit Inconnu', volume: 0, ca: 0 };
        }
        productStats[item.product_id].volume += (item.qte_colis || item.qty || 0);
        productStats[item.product_id].ca += (item.total_ligne || 0);
      });
    });
    const topProducts = Object.values(productStats).sort((a, b) => b.volume - a.volume);

    const dettes = data.dettes.map(c => {
      const cOrders = orders.filter(o => o.client_id === c.id && ['valide', 'livre'].includes(o.status));
      const cPayments = data.payments.filter(p => p.client_id === c.id && (!selectedMonth || p.date?.startsWith(selectedMonth)));
      const monthInvoiced = cOrders.reduce((acc, o) => acc + (o.total || 0), 0);
      const monthPaid = cPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
      return { ...c, monthBLCount: cOrders.length, monthInvoiced, monthPaid };
    }).filter(c => c.monthInvoiced > 0 || c.monthPaid > 0 || c.balance > 0);

    return { orders, payments, topProducts, dettes };
  }, [data, selectedMonth]);

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    const canvas = sigCanvas.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); 
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#060e20";
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    if (e.cancelable) e.preventDefault();
    const canvas = sigCanvas.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const clearSignature = () => {
    const ctx = sigCanvas.current.getContext('2d');
    ctx.clearRect(0, 0, sigCanvas.current.width, sigCanvas.current.height);
  };

  const handleSignOrder = (o) => {
    setOrderToSign(o);
    setShowSigModal(true);
  };

  const submitSignature = async () => {
    try {
      const signatureImg = sigCanvas.current.toDataURL('image/png');
      const { error } = await supabase.from('orders')
        .update({ status: 'livre', signature: signatureImg, deliveryStatus: 'Livré' })
        .eq('id', orderToSign.id);
      
      if (error) throw error;
      alert("Commande livrée et signée ✓");
      setShowSigModal(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="history-container scroll-area">
      <div className="tabs-container" style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--surface-low)', padding: '4px', borderRadius: '14px' }}>
        {[
          { id: 'orders', label: 'Commandes' },
          { id: 'finance', label: 'Finance' },
          { id: 'payments', label: 'Paiements' },
          { id: 'analyse', label: 'Analyse' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            flex: 1, padding: '8px', border: 'none', borderRadius: '10px',
            background: activeTab === tab.id ? 'var(--surface-high)' : 'none',
            color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
            fontWeight: 700, fontSize: '0.75em', transition: 'all 0.2s', cursor: 'pointer'
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-status">Calcul du bilan...</div>
      ) : (
        <div className="tab-content">
          {/* ── UNGLET COMMANDES ── */}
          {activeTab === 'orders' && (
            <div className="orders-list">
              {filteredData.orders.length === 0 ? <p className="empty">Aucune commande ce mois-ci</p> : filteredData.orders.map(o => {
                let sLabel = 'En attente';
                let sColor = 'var(--text-muted)';
                if (o.status === 'soumis') {
                  sLabel = '📝 Soumis au back-office';
                  sColor = 'var(--orange)';
                } else if (o.status === 'valide') {
                  if (o.deliveryStatus === 'Chargé') {
                    sLabel = '📦 CHARGÉ';
                    sColor = 'var(--accent)';
                  } else {
                    sLabel = '⌛ Validé : En attente chargement';
                    sColor = 'var(--text-muted)';
                  }
                } else if (o.status === 'livre') {
                  sLabel = '✅ Livré';
                  sColor = 'var(--primary)';
                } else if (o.status === 'refuse') {
                  sLabel = '❌ Annulée';
                  sColor = 'var(--red)';
                }

                const d = new Date(o.date || o.id);
                const fd = d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'numeric' });

                return (
                  <div key={o.id} className="item-card glass" style={{ padding: '16px', marginBottom: '12px', borderLeft: `4px solid ${sColor}`, borderRadius: '18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 900, fontSize: '1.05em', color: 'white' }}>{o.client_nom || 'Client Inconnu'}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                          <span style={{ fontSize: '0.7em', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                            <i className="fas fa-calendar-alt" style={{ marginRight: '3px', opacity: 0.6 }}></i>{fd}
                          </span>
                          <span style={{ fontSize: '0.75em', fontWeight: 700, color: 'var(--text)', background: 'rgba(255,255,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                            <i className="fas fa-barcode" style={{ marginRight: '4px', opacity: 0.6 }}></i>{o.id > 1000000000 ? `PROV-${o.id}` : `PROV-17746${String(o.id).padStart(5, '0')}`}
                          </span>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.65em', fontWeight: 800, background: `${sColor}20`, color: sColor, padding: '5px 12px', borderRadius: '20px', textTransform: 'uppercase', border: `1px solid ${sColor}40`, letterSpacing: '0.5px' }}>
                        {sLabel}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <div style={{ fontSize: '0.6em', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Montant BL</div>
                        <div style={{ fontWeight: 900, color: 'white', fontSize: '1.1em' }}>{(o.total || 0).toLocaleString()} DA</div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-surface" style={{ fontSize: '0.75em', padding: '8px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: 'none', cursor: 'pointer' }} onClick={() => setSelectedOrderDetails(o)}>
                          <i className="fas fa-eye"></i> Détails
                        </button>
                        {(o.status !== 'livre' && o.deliveryStatus !== 'Livré') && (
                          <button className="btn btn-surface" style={{ fontSize: '0.75em', padding: '8px 14px', borderRadius: '10px', color: 'var(--accent)', background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer' }} onClick={() => onStartOrder({ id: o.client_id, nom: o.client_nom })}>
                            <i className="fas fa-edit"></i> Modifier
                          </button>
                        )}
                        {o.status === 'valide' && !o.signature && (
                          <button className="btn btn-primary" style={{ fontSize: '0.7em', padding: '8px 14px', borderRadius: '10px', background: 'var(--primary)', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer' }} onClick={() => handleSignOrder(o)}>
                            <i className="fas fa-pen-nib"></i> Signer & Livrer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── UNGLET FINANCE (DETTES) ── */}
          {activeTab === 'finance' && (
            <div className="dettes-list">
              <div className="kpi-card" style={{ marginBottom: '20px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                <span className="kpi-label">TOTAL CRÉANCES CLIENTS</span>
                <span className="kpi-val" style={{ color: 'var(--red)' }}>
                  {filteredData.dettes.reduce((acc, d) => acc + d.balance, 0).toLocaleString()} DA
                </span>
              </div>
              {filteredData.dettes.length === 0 ? <p className="empty">Aucune donnée financière ce mois-ci</p> : filteredData.dettes.map(d => (
                <div key={d.id} className="item-card glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9em' }}>{d.nom}</div>
                    <div style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>{d.commune}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 900, color: 'var(--red)' }}>{d.balance.toLocaleString()} DA</div>
                    <div style={{ fontSize: '0.6em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Non réglé</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── UNGLET PAIEMENTS (JOURNAL) ── */}
          {activeTab === 'payments' && (
            <div className="payments-list">
              <div className="stat-box glass" style={{ marginBottom: '16px', textAlign: 'left', background: 'linear-gradient(135deg, var(--surface-low), var(--surface-high))', borderLeft: '4px solid var(--green)' }}>
                <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Bilan Encaissement (Mois)</div>
                <div style={{ fontSize: '1.5em', fontWeight: 900, color: 'var(--green)', marginTop: '4px' }}>
                  {filteredData.payments.reduce((acc, p) => acc + (p.amount || 0), 0).toLocaleString()} DA
                </div>
              </div>
              
              {filteredData.payments.length === 0 ? <p className="empty">Aucun encaissement ce mois-ci</p> : filteredData.payments.map(p => (
                <div key={p.id} className="item-card glass" style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                  <div className="avatar" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.1)' }}><Receipt size={20}/></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85em' }}>{p.client_nom}</div>
                    <div style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>{p.mode} • {new Date(p.date).toLocaleDateString('fr-FR')}</div>
                  </div>
                  <div style={{ fontWeight: 900, color: '#10b981' }}>+{p.amount?.toLocaleString()} DA</div>
                </div>
              ))}
            </div>
          )}

          {/* ── UNGLET ANALYSE ── */}
          {activeTab === 'analyse' && (
            <div className="performance-view">
              <div className="kpi-card glass" style={{ marginBottom: '24px', padding: '16px', borderRadius: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.75em', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Progression Objectif Mensuel</span>
                  <span style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1em' }}>
                    {data.target > 0 ? Math.round((filteredData.orders.reduce((acc, o) => acc + (o.total || 0), 0) / data.target) * 100) : 0}%
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
                  <div style={{ 
                    height: '100%', 
                    background: 'linear-gradient(90deg, var(--primary), var(--purple))', 
                    width: `${data.target > 0 ? Math.min(100, (filteredData.orders.reduce((acc, o) => acc + (o.total || 0), 0) / data.target) * 100) : 0}%`,
                    boxShadow: '0 0 15px var(--primary-glow)',
                    transition: 'width 1s ease-in-out'
                  }}></div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8em', fontWeight: 700 }}>
                  <span style={{ color: 'white' }}>{filteredData.orders.reduce((acc, o) => acc + (o.total || 0), 0).toLocaleString()} DA</span>
                  <span style={{ color: 'var(--text-muted)' }}>/ {data.target.toLocaleString()} DA</span>
                </div>
              </div>

              <div className="stat-box blue" style={{ marginBottom: '20px' }}>
                <TrendingUp style={{ position: 'absolute', right: '20px', top: '20px', opacity: 0.2 }} />
                <span className="lbl">RYTHME QUOTIDIEN</span>
                <span className="num" style={{ fontSize: '1.8em' }}>{Math.round(data.orders.length / 30 * 10) / 10}</span>
                <span style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>Cmd / jour (moy)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 className="label" style={{ margin: 0 }}>CLASSEMENT PRODUITS</h4>
                <div style={{ display: 'flex', gap: '5px', background: 'var(--surface-low)', padding: '3px', borderRadius: '8px' }}>
                  <button onClick={() => setSortTopBy('volume')} style={{ border: 'none', background: sortTopBy === 'volume' ? 'var(--primary)' : 'transparent', color: sortTopBy === 'volume' ? 'white' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7em', fontWeight: 'bold', cursor: 'pointer' }}>VOL</button>
                  <button onClick={() => setSortTopBy('ca')} style={{ border: 'none', background: sortTopBy === 'ca' ? 'var(--primary)' : 'transparent', color: sortTopBy === 'ca' ? 'white' : 'var(--text-muted)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7em', fontWeight: 'bold', cursor: 'pointer' }}>CA</button>
                </div>
              </div>
              <div className="item-card glass" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                 {filteredData.topProducts.length === 0 ? <p className="empty" style={{ margin: 0 }}>Aucune donnée</p> : 
                  [...filteredData.topProducts]
                    .sort((a, b) => sortTopBy === 'volume' ? b.volume - a.volume : b.ca - a.ca)
                    .map((p, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: idx < filteredData.topProducts.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                        <span style={{ fontSize: '0.85em' }}>{idx + 1}. {p.nom}</span>
                        <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.85em' }}>
                          {sortTopBy === 'volume' ? `${Math.round(p.volume)} Colis` : `${Math.round(p.ca).toLocaleString()} DA`}
                        </span>
                      </div>
                    ))
                 }
              </div>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {showSigModal && (
          <div className="modal-overlay" onClick={() => setShowSigModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 3000, display: 'flex', alignItems: 'flex-end', padding: '20px' }}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', width: '100%', borderRadius: '28px', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column' }}>
              <div className="modal-header" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--glass-border)' }}>
                <h3 style={{ fontSize: '1em', fontWeight: 800 }}>Livraison : {orderToSign?.client_nom}</h3>
                <button onClick={() => setShowSigModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)' }}><X size={18} /></button>
              </div>
              <div className="modal-body" style={{ padding: '24px' }}>
                <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginBottom: '15px' }}>
                  Faites signer le client pour confirmer la réception de la marchandise (BL: {orderToSign?.bl || 'PROV-' + String(orderToSign?.id).slice(-6)}).
                </p>
                <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', touchAction: 'none', border: '2px dashed var(--primary)' }}>
                  <canvas ref={sigCanvas} width={400} height={200} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} style={{ width: '100%' }} />
                </div>
                <div style={{ textAlign: 'right', marginTop: '10px' }}>
                  <button onClick={clearSignature} style={{ padding: '8px', fontSize: '0.7em', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer' }}>Vider la signature</button>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '20px 24px', borderTop: '1px solid var(--glass-border)' }}>
                <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1em' }} onClick={submitSignature}>CONFIRMER LA LIVRAISON</button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedOrderDetails && (
          <div className="modal-overlay" onClick={() => setSelectedOrderDetails(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <motion.div className="modal-sheet" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} onClick={e => e.stopPropagation()} style={{ background: '#111827', width: '100%', maxWidth: '440px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', color: '#fff' }}>
              <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <h3 style={{ fontSize: '1.1em', fontWeight: 700, margin: 0 }}>
                  Commande {selectedOrderDetails.id > 1000000000 ? `#PROV-${selectedOrderDetails.id}` : `#PROV-177473${String(selectedOrderDetails.id).padStart(5, '0')}`}
                </h3>
                <button onClick={() => setSelectedOrderDetails(null)} style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold' }}>
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: '24px', maxHeight: '450px', overflowY: 'auto' }}>
                {(() => {
                  let items = selectedOrderDetails.items || [];
                  if (typeof items === 'string') {
                    try { items = JSON.parse(items); } catch(e) { items = []; }
                  }
                  if (!Array.isArray(items)) items = [];
                  
                  if (items.length === 0) return <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9em', textAlign: 'center' }}>Aucun produit</p>;

                  return items.map((item, idx) => {
                    // Tentative sur toutes les clés possibles du legacy
                    const itemName = item.nom || item.designation || item.nom_produit || item.produit_nom || item.libelle || 'Produit';
                    const itemQty = item.qty || item.qte_colis || item.quantite || 0;
                    const itemPrice = item.price || item.prix_unitaire || 0;
                    const itemTotal = item.total_ligne || (itemQty * itemPrice);
                    const isPack = item.unitType === 'pack' || !!item.qte_colis;
                    const unitText = isPack ? `pack(s) • Pack de ${item.pack || 12} ${item.unitType === 'pack' ? 'DA/pk' : 'DA/pk'}` : 'pièce(s) • ' + itemPrice + ' DA/pc';
                    
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          <div style={{ fontWeight: 600, fontSize: '0.95em', color: '#fff', marginBottom: '4px' }}>{itemName}</div>
                          <div style={{ fontSize: '0.8em', color: 'rgba(255,255,255,0.5)' }}>
                            {itemQty} {isPack ? 'pack(s)' : 'pièce(s)'} • {isPack ? 'Pack de ' + (item.pack || 12) : ''} {itemPrice} DA/{isPack ? 'pk' : 'pc'}
                          </div>
                        </div>
                        <div style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '0.95em', textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {itemTotal.toLocaleString()} <span style={{ fontSize: '0.7em' }}>DA</span>
                        </div>
                      </div>
                    );
                  });
                })()}
                
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '20px', paddingTop: '20px', textAlign: 'right' }}>
                  <div style={{ fontSize: '0.7em', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>Total Commande</div>
                  <div style={{ fontSize: '1.4em', fontWeight: 800, color: 'var(--primary)' }}>
                    {selectedOrderDetails.total?.toLocaleString()} DA
                  </div>
                </div>
              </div>

              <div style={{ padding: '24px', paddingTop: 0 }}>
                <button onClick={() => setSelectedOrderDetails(null)} style={{ width: '100%', background: '#fff', color: '#000', padding: '16px', borderRadius: '12px', border: 'none', fontWeight: 700, fontSize: '1em', cursor: 'pointer' }}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
