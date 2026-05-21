import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, MapPin, ClipboardList, ShoppingCart, Wallet, X, CheckSquare, Clock, PlusCircle, Camera } from 'lucide-react';
import { SupabaseService, supabase } from '../services/SupabaseService';
import './CRM.css';

export default function CRM({ user, onStartOrder }) {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [selectedClient, setSelectedClient] = useState(null);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  // Formulaire Visite (6 KPIs)
  const [visitKPIs, setVisitKPIs] = useState({
    acheteur_present: 'OUI',
    commande_prise: 'NON',
    rupture_stock: 'NON',
    concurrent_actif: 'NON',
    mise_en_avant: 'MOYENNE',
    satisfaction: 'VALIDE',
    note: ''
  });

  // Formulaire Paiement
  const [payData, setPayData] = useState({ amount: '', mode: 'Espèce', note: '' });
  const sigCanvas = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Formulaire Nouveau Client (Complet)
  const [newClient, setNewClient] = useState({
    nom: '', type: 'prospect', categorie: 'SupB', telephone: '', 
    wilaya: '', commune: '', potentiel: 'C', acheteur: '', promesse_ca: '', notes: '', photo: ''
  });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const data = await SupabaseService.getClientsByCommercial(user.id);
      setClients(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── RECHERCHE ──
  const filteredClients = clients.filter(c => 
    c.status_validation !== 'en attente' && (
    c.nom.toLowerCase().includes(search.toLowerCase()) || 
    c.commune?.toLowerCase().includes(search.toLowerCase()) ||
    c.wilaya?.toLowerCase().includes(search.toLowerCase()))
  );

  const pendingClients = clients.filter(c => 
    c.status_validation === 'en attente' && 
    c.nom.toLowerCase().includes(search.toLowerCase())
  );

  // ── ACTIONS RAPIDES ──
  const handleVisit = (client) => {
    setSelectedClient(client);
    setShowVisitModal(true);
  };

  const handlePay = (client) => {
    setSelectedClient(client);
    setShowPayModal(true);
  };

  // ── SIGNATURE ──
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

  // ── SOUMISSIONS ──
  const submitVisit = async () => {
    try {
      const { error } = await supabase.from('visits').insert([{
        client_id: selectedClient.id, client_nom: selectedClient.nom,
        user_id: user.id, user_nom: user.prenom || user.nom,
        date: new Date().toISOString().split('T')[0],
        heure: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        ...visitKPIs
      }]);
      if (error) throw error;
      alert("Rapport de visite enregistré ✓");
      setShowVisitModal(false);
    } catch (err) { alert(err.message); }
  };

  const submitPayment = async () => {
    if (!payData.amount) return alert("Saisissez un montant");
    try {
      const signatureImg = sigCanvas.current.toDataURL('image/png');
      const { error } = await supabase.from('payments').insert([{
        client_id: selectedClient.id, client_nom: selectedClient.nom,
        amount: parseFloat(payData.amount), mode: payData.mode, notes: payData.note,
        user_id: user.id, user_nom: user.prenom || user.nom, date: new Date().toISOString(),
        signature: signatureImg
      }]);
      if (error) throw error;
      alert("Encaissement enregistré ✓");
      setShowPayModal(false);
    } catch (err) { alert(err.message); }
  };

  const submitNewClient = async () => {
    if (!newClient.nom || !newClient.commune) return alert("Nom et Commune obligatoires");
    try {
      const clientPayload = {
        nom: newClient.nom,
        type: newClient.type,
        categorie: newClient.categorie,
        wilaya: newClient.wilaya,
        commune: newClient.commune,
        telephone: newClient.telephone,
        commercial_id: user.id,
        commercial_nom: user.prenom || user.nom,
        status_validation: 'en attente', 
        date_creation: new Date().toISOString()
      };
      const { error } = await supabase.from('clients').insert([clientPayload]);
      if (error) throw error;
      alert("Demande de création envoyée ✓");
      setShowNewClientModal(false);
      fetchClients();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="crm-container scroll-area">
      {/* ── HEADER & SEARCH ── */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.2em', fontWeight: 800, marginBottom: '10px' }}>Mes Clients</h2>
        <button onClick={() => setShowNewClientModal(true)} style={{ background: '#fff', color: '#000', borderRadius: '100px', padding: '8px 16px', fontSize: '0.85em', fontWeight: 800, border: 'none', marginBottom: '15px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <i className="fa-solid fa-plus"></i> Nouveau
        </button>
        <div className="search-box" style={{ margin: 0 }}>
          <Search size={18} />
          <input type="text" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? <div className="loading-status">Chargement du CRM...</div> : (
        <>
          {/* ── PROSPECTS ── */}
          {pendingClients.length > 0 && (
            <div className="prospects-section" style={{ marginBottom: '24px' }}>
              <h4 className="label" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={12} /> Dossiers en attente ({pendingClients.length})
              </h4>
              <div style={{ display: 'flex', overflowX: 'auto', gap: '12px', paddingBottom: '10px' }}>
                {pendingClients.map(c => (
                  <div key={c.id} className="prospect-card glass" style={{ minWidth: '200px' }}>
                    <div className="prospect-dot"></div>
                    <div className="prospect-info">
                      <div className="prospect-name">{c.nom}</div>
                      <div className="prospect-sub">{c.commune}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CLIENT LIST ── */}
          <div className="client-list">
            {filteredClients.map(c => (
              <div key={c.id} className="item-card glass" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
                  <div className="avatar">{c.nom.charAt(0)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 800, fontSize: '1em' }}>{c.nom}</span>
                      <span className={`badge pot-${c.potentiel || 'C'}`}>{c.potentiel || 'C'}</span>
                    </div>
                    <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: '2px' }}>
                      <MapPin size={10} /> {c.commune} • {c.type}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button className="btn btn-surface" style={{ flex: 1, padding: '10px', fontSize: '0.75em', background: 'rgba(255,255,255,0.9)', color: '#060e20' }} onClick={() => handleVisit(c)}>
                    <i className="fa-solid fa-location-dot" style={{ color: '#ef4444', marginRight: '6px' }}></i> Visiter
                  </button>
                  <button className="btn btn-surface" style={{ flex: 1, padding: '10px', fontSize: '0.75em', background: 'rgba(255,255,255,0.9)', color: '#060e20' }} onClick={() => onStartOrder(c)}>
                    <i className="fa-solid fa-cart-shopping" style={{ color: '#64748b', marginRight: '6px' }}></i> Commande
                  </button>
                  <button className="btn btn-surface" style={{ flex: 1, padding: '10px', fontSize: '0.75em', background: 'rgba(255,255,255,0.9)', color: '#060e20' }} onClick={() => handlePay(c)}>
                    <i className="fa-solid fa-sack-dollar" style={{ color: '#f59e0b', marginRight: '6px' }}></i> Encaisser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── MODALS INTEGRATION ── */}
      <AnimatePresence>
        {showVisitModal && (
          <div className="modal-overlay" onClick={() => setShowVisitModal(false)}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1em' }}>Rapport : {selectedClient?.nom}</h3>
                <button onClick={() => setShowVisitModal(false)} className="btn-logout"><X size={18} /></button>
              </div>
              <div className="modal-body">
                {[
                  { id: 'acheteur_present', label: 'Acheteur présent ?' },
                  { id: 'rupture_stock', label: 'Rupture constatée ?' },
                  { id: 'commande_prise', label: 'Commande prise ?' },
                  { id: 'concurrent_actif', label: 'Concurrent actif ?' }
                ].map(kpi => (
                  <div key={kpi.id} className="kpi-visit-row">
                    <span className="kpi-visit-label">{kpi.label}</span>
                    <div className="kpi-toggle-group">
                      {['OUI', 'NON'].map(v => (
                        <button key={v} className={`kpi-toggle ${visitKPIs[kpi.id] === v ? 'active' : ''}`} onClick={() => setVisitKPIs({...visitKPIs, [kpi.id]: v})}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="field" style={{ marginTop: '15px' }}>
                  <label className="label">Visibilité Marque</label>
                  <div className="kpi-toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                    {['BASSSE', 'MOYENNE', 'TOP'].map(v => (
                      <button key={v} className={`kpi-toggle ${visitKPIs.mise_en_avant === v ? 'active' : ''}`} onClick={() => setVisitKPIs({...visitKPIs, mise_en_avant: v})}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label">Note de visite</label>
                  <textarea className="textarea" placeholder="Détails de la visite..." value={visitKPIs.note} onChange={(e) => setVisitKPIs({...visitKPIs, note: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" style={{ flex: 1, padding: '16px' }} onClick={submitVisit}>VALIDER LE RAPPORT</button>
              </div>
            </motion.div>
          </div>
        )}

        {showPayModal && (
          <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: '1em' }}>Encaissement : {selectedClient?.nom}</h3>
                <button onClick={() => setShowPayModal(false)} className="btn-logout"><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label className="label">Montant du Paiement (DA)</label>
                  <input type="number" className="input" style={{ fontSize: '1.6em', fontWeight: 900, color: '#10b981', textAlign: 'center' }} placeholder="0.00" value={payData.amount} onChange={(e) => setPayData({...payData, amount: e.target.value})} />
                </div>
                <div className="field">
                  <label className="label">Mode de Règlement</label>
                  <div className="kpi-toggle-group">
                    {['Espèce', 'Chèque', 'Virement'].map(v => (
                      <button key={v} className={`kpi-toggle ${payData.mode === v ? 'active' : ''}`} style={{ flex: 1 }} onClick={() => setPayData({...payData, mode: v})}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label className="label">Signature du Client</label>
                  <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', touchAction: 'none' }}>
                    <canvas ref={sigCanvas} width={400} height={180} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setIsDrawing(false)} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => setIsDrawing(false)} style={{ width: '100%' }} />
                  </div>
                  <button onClick={clearSignature} style={{ padding: '8px', fontSize: '0.7em', color: '#64748b', background: 'none', border: 'none' }}>Vider la signature</button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" style={{ flex: 1, padding: '16px' }} onClick={submitPayment}>ENREGISTRER LE PAIEMENT</button>
              </div>
            </motion.div>
          </div>
        )}

        {showNewClientModal && (
          <div className="modal-overlay" onClick={() => setShowNewClientModal(false)}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3 className="sec-title" style={{ fontSize: '1.2em', fontWeight: 800, margin: 0 }}>Nouveau Dossier Client</h3>
                <button onClick={() => setShowNewClientModal(false)} className="btn-logout" style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.2em' }}><X size={20} /></button>
              </div>
              <div className="modal-body">
                <div className="field">
                  <label className="label">Nom Commercial / Enseigne</label>
                  <input type="text" className="input" placeholder="ex: Superette Al Baraka" value={newClient.nom} onChange={e => setNewClient({...newClient, nom: e.target.value})} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field">
                    <label className="label">Type</label>
                    <select className="select" value={newClient.type} onChange={e => setNewClient({...newClient, type: e.target.value})}>
                      <option value="prospect">🎯 Prospect</option>
                      <option value="client">🟢 Client</option>
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Catégorie</label>
                    <select className="select" value={newClient.categorie} onChange={e => setNewClient({...newClient, categorie: e.target.value})}>
                      <option value="SupB">Standard (B)</option>
                      <option value="SupA">Premium (A)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field">
                    <label className="label">Wilaya</label>
                    <input type="text" className="input" placeholder="ex: 16 - Alger" value={newClient.wilaya} onChange={e => setNewClient({...newClient, wilaya: e.target.value})} />
                  </div>
                  <div className="field">
                    <label className="label">Commune</label>
                    <input type="text" className="input" placeholder="ex: Kouba" value={newClient.commune} onChange={e => setNewClient({...newClient, commune: e.target.value})} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="field">
                    <label className="label">Mobile</label>
                    <input type="tel" className="input" placeholder="05/06/07..." value={newClient.telephone} onChange={e => setNewClient({...newClient, telephone: e.target.value})} />
                  </div>
                  <div className="field">
                    <label className="label">Potentiel</label>
                    <select className="select" value={newClient.potentiel} onChange={e => setNewClient({...newClient, potentiel: e.target.value})}>
                      <option value="C">Standard (C)</option>
                      <option value="B">Bon (B)</option>
                      <option value="A">Elite (A)</option>
                    </select>
                  </div>
                </div>

                <div className="field">
                  <label className="label">Nom de l'acheteur</label>
                  <input type="text" className="input" placeholder="Nom complet" value={newClient.acheteur} onChange={e => setNewClient({...newClient, acheteur: e.target.value})} />
                </div>

                <div className="field">
                  <label className="label">Promesse CA Mensuel (DA)</label>
                  <input type="number" className="input" placeholder="ex: 150000" value={newClient.promesse_ca} onChange={e => setNewClient({...newClient, promesse_ca: e.target.value})} />
                </div>

                <div className="field">
                  <label className="label">Notes / Observations</label>
                  <textarea className="textarea" rows="3" placeholder="Informations complémentaires..." value={newClient.notes} onChange={e => setNewClient({...newClient, notes: e.target.value})} />
                </div>

                <div className="field">
                  <label className="label">Photo du Point de Vente</label>
                  <div onClick={() => alert("Capture photo à implémenter")} style={{ width: '100%', height: '120px', border: '2px dashed var(--border)', borderRadius: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
                    <Camera size={32} color="var(--muted)" />
                    <span style={{ fontSize: '0.75em', color: 'var(--muted)', marginTop: '10px' }}>Tap pour capturer façades</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" style={{ width: '100%', padding: '16px' }} onClick={submitNewClient}>🚀 Soumettre Dossier</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
