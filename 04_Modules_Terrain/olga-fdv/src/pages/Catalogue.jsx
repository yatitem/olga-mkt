import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Plus, Minus, X, Trash2, CheckCircle2, User, HelpCircle } from 'lucide-react';
import { SupabaseService, supabase } from '../services/SupabaseService';
import './Catalogue.css';

export default function Catalogue({ user, cart, setCart, client, setClient }) {
  const [products, setProducts] = useState([]);
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCheckout, setShowCheckout] = useState(false);
  const sigCanvas = useRef(null);
  const [productModes, setProductModes] = useState({}); // { productId: 'pack' | 'unit' }
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodData, cliData] = await Promise.all([
        SupabaseService.getProducts(),
        SupabaseService.getClientsByCommercial(user.id)
      ]);
      setProducts(prodData);
      setClients(cliData);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const filteredProducts = search.length > 0 
    ? products.filter(p => p.nom.toLowerCase().includes(search.toLowerCase()) || p.parfum?.toLowerCase().includes(search.toLowerCase()))
    : products;

  const getUnitsPerPack = (packStr) => {
    if (!packStr) return 1;
    const match = String(packStr).match(/\d+/);
    return match ? parseInt(match[0], 10) : 1;
  };

  const getProductPrice = (product) => {
    if (!client || !client.categorie) return product.prix_supa || 0;
    const cat = client.categorie.toLowerCase();
    if (cat.includes('supb') || cat === 'b') return product.prix_supb || product.prix_supa || 0;
    if (cat.includes('usine')) return product.prix_usine || product.prix_supa || 0;
    if (cat.includes('public')) return product.prix_public || product.prix_supa || 0;
    return product.prix_supa || 0;
  };

  const updateCart = (product, mode, delta) => {
    const unitType = mode || productModes[product.id] || 'pack';
    const cartId = `${product.id}-${unitType}`;
    const existing = cart.find(item => item.cartId === cartId);
    
    if (existing) {
      const newQty = Math.max(0, existing.qty + delta);
      if (newQty === 0) setCart(cart.filter(item => item.cartId !== cartId));
      else setCart(cart.map(item => item.cartId === cartId ? { ...item, qty: newQty } : item));
    } else if (delta > 0) {
      const unitsInPack = getUnitsPerPack(product.pack);
      const basePrice = getProductPrice(product);
      const price = unitType === 'pack' ? (basePrice * unitsInPack) : basePrice;
      
      setCart([...cart, { 
        cartId, id: product.id, nom: product.nom, parfum: product.parfum, pack: product.pack, unitType, qty: 1, price 
      }]);
    }
  };

  const qtyInCart = (product, mode) => {
    const item = cart.find(i => i.id === product.id && i.unitType === mode);
    return item ? item.qty : 0;
  };

  const removeFromCart = (cartId) => setCart(cart.filter(i => i.cartId !== cartId));

  const toggleSelection = (product, mode) => {
    const qty = qtyInCart(product, mode);
    if (qty > 0) {
      removeFromCart(`${product.id}-${mode}`);
    } else {
      updateCart(product, mode, 1);
    }
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const startDrawing = (e) => {
    if (e.cancelable) e.preventDefault();
    const canvas = sigCanvas.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineWidth = 3; ctx.lineCap = "round";
  };
  const draw = (e) => {
    const canvas = sigCanvas.current; if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
    const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
    ctx.lineTo(x, y); ctx.stroke();
  };

  const [orderType, setOrderType] = useState('precommande');

  const submitOrder = async () => {
    if (!client) return alert("Sélectionnez un client dans le CRM !");
    try {
      const signatureImg = sigCanvas.current ? sigCanvas.current.toDataURL('image/png') : null;
      
      const isVanSelling = orderType === 'vanselling';
      
      const orderPayload = {
        client_id: client.id, 
        client_nom: client.nom, 
        commercial_id: user.id,
        items: cart, 
        total: cartTotal, 
        status: isVanSelling ? 'livre' : 'soumis', 
        deliveryStatus: isVanSelling ? 'Livré' : 'En attente',
        type: isVanSelling ? 'VAN-SELLING' : 'COMMANDE',
        date: new Date().toISOString(),
        signature: isVanSelling ? signatureImg : null
      };

      const { error } = await supabase.from('orders').insert([orderPayload]);
      if (error) throw error;

      if (isVanSelling) {
        // Here we would decrement the truck stock via Supabase RPC or update
        // Example: await SupabaseService.decrementTruckStock(user.id, cart);
      }

      alert(isVanSelling ? "Vente camion enregistrée et livrée ✓" : "Commande transmise au Back-Office ✓");
      setCart([]); setShowCheckout(false);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="fast-order-layout">
      {/* ── CLIENT SELECTION (Miroir de l'appli web) ── */}
      <h2 style={{ fontSize: '1.4em', fontWeight: 800, marginBottom: '20px' }}>Prise de Commande</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label className="label" style={{ fontSize: '0.7em', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>CLIENT</label>
        <select className="select" value={client?.id || ''} onChange={e => {
          const selected = clients.find(c => String(c.id) === e.target.value);
          if (setClient) setClient(selected || null);
        }}>
          <option value="">— Sélectionner un client —</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.commune})</option>)}
        </select>
      </div>

      {!client && (
        <div className="item-card glass" style={{ padding: '20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <HelpCircle size={24} style={{ color: 'var(--muted)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95em' }}>Sélectionner un client</div>
            <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>Choix requis pour commander</div>
          </div>
          <button className="nav-fab" style={{ position: 'relative', top: 0, width: '40px', height: '40px', marginTop: 0 }} onClick={() => document.querySelector('.select').focus()}>
            <User size={18} />
          </button>
        </div>
      )}

      {/* ── SEARCH AREA ── */}
      <div className="search-area">
        <div className="search-box">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher produit ou parfum..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
        </div>
        
        {/* ── INLINE RESULTS ── */}
        <div 
          className={`search-results-container ${(isSearchFocused || search.length > 0) ? 'active' : ''}`}
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredProducts.map(p => {
            const mode = productModes[p.id] || 'pack';
            const qty = qtyInCart(p, mode);
            return (
              <div 
                key={p.id} 
                className={`search-item ${qty > 0 ? 'selected' : ''}`}
                onClick={() => toggleSelection(p, mode)}
              >
                <div className="search-item-aside">
                  <div className="mode-toggle" onClick={(e) => e.stopPropagation()}>
                    <button className={`mode-btn ${mode === 'pack' ? 'active' : ''}`} onClick={() => setProductModes({...productModes, [p.id]: 'pack'})}>P</button>
                    <button className={`mode-btn ${mode === 'unit' ? 'active' : ''}`} onClick={() => setProductModes({...productModes, [p.id]: 'unit'})}>U</button>
                  </div>
                </div>
                
                <div className="search-item-info">
                  <div className="search-item-name">{p.nom}</div>
                  <div className="search-item-meta">
                    <span style={{ fontSize: '1.1em', fontWeight: 900, color: 'var(--primary)' }}>
                      {(mode === 'pack' ? (getProductPrice(p) * getUnitsPerPack(p.pack)) : getProductPrice(p)).toLocaleString()} DA
                    </span>
                    <span>—</span>
                    {p.parfum && <span>{p.parfum}</span>}
                  </div>
                  <div className="stock-badge">
                    <i className="fa-solid fa-box" style={{ marginRight: '4px' }}></i>
                    {p.stock_colis} colis ({p.stock_units_total} unités)
                  </div>
                </div>
                <div className="inline-qty-ctrl" onClick={(e) => e.stopPropagation()}>
                  <button className="qty-btn" onClick={() => updateCart(p, mode, -1)}><Minus size={14}/></button>
                  <input className="qty-input" value={qty} readOnly />
                  <button className="qty-btn" onClick={() => updateCart(p, mode, 1)}><Plus size={14}/></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PERSISTENT BASKET ── */}
      <div className="item-card glass" style={{ flex: 1, display: 'flex', flexDirection: 'column', margin: 0, borderRadius: '24px 24px 0 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '0.85em', fontWeight: 800, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={16} color="var(--primary)" /> PANIER
          </h3>
          <span style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>{cart.length} articles</span>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0', display: 'flex', flexDirection: 'column' }}>
          {cart.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', paddingTop: '40px' }}>
              <ShoppingCart size={48} style={{ opacity: 0.1, marginBottom: '15px' }} />
              <div style={{ fontSize: '0.85em', fontWeight: 700 }}>Le panier est vide.</div>
              <div style={{ fontSize: '0.75em' }}>Utilisez la recherche ci-dessus.</div>
            </div>
          ) : cart.map(item => {
            const lineTotal = item.price * item.qty;
            // Hack to get pack info since item.pack might be missing from cart state, but wait, updateCart sets item.pack!
            // Let's verify updateCart sets pack? Oh wait, in updateCart: setCart([...cart, { cartId, id: product.id, nom: product.nom, parfum: product.parfum, pack: product.pack, unitType, qty: 1, price }])
            // Wait, does it set pack? I need to check line 55-57. I'll just check if pack exists.
            
            return (
              <div key={item.cartId} className="basket-item">
                <div className="basket-item-info">
                  <div className="basket-item-name">{item.nom}</div>
                  <div className="basket-item-sub" style={{ color: 'var(--primary)', marginTop: '2px' }}>
                    — • {item.unitType === 'pack' ? 'PACK' : 'UNITÉ'} {item.unitType === 'pack' && item.pack ? `(${getUnitsPerPack(item.pack)}U)` : ''}
                  </div>
                  <div style={{ fontSize: '0.7em', fontWeight: 700, opacity: 0.6, marginTop: '2px' }}>
                    {item.price.toLocaleString()} DA
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '0.9em' }}>
                    {lineTotal.toLocaleString()} <span style={{ fontSize: '0.6em', opacity: 0.7, color: 'white' }}>DA</span>
                  </div>
                  <div className="basket-qty-ctrl">
                    <button className="qty-btn" style={{ width: '28px', height: '28px' }} onClick={() => updateCart({id: item.id}, item.unitType, -1)}>
                      <Minus size={12} />
                    </button>
                    <span style={{ fontWeight: 900, fontSize: '1em', minWidth: '60px', textAlign: 'center', color: 'white' }}>
                      {item.qty} <small style={{ fontSize: '0.6em', opacity: 0.6 }}>{item.unitType === 'pack' ? 'PACKS' : 'UNITÉS'}</small>
                    </span>
                    <button className="qty-btn" style={{ width: '28px', height: '28px' }} onClick={() => updateCart({id: item.id}, item.unitType, 1)}>
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <button 
                  style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--red)', border: 'none', padding: '6px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '10px' }} 
                  onClick={() => removeFromCart(item.cartId)}
                >
                  <X size={14} opacity={0.6} />
                </button>
              </div>
            );
          })}
        </div>

        {cart.length > 0 && (
          <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button className="btn btn-primary" style={{ width: '100%', padding: '16px', fontWeight: 800 }} onClick={() => setShowCheckout(true)}>
              VALIDER LA COMMANDE ({cart.length})
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCheckout && (
          <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
            <motion.div className="modal-sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Finalisation Commande</h3>
                <button onClick={() => setShowCheckout(false)} className="btn-logout"><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div style={{ background: 'var(--surface-high)', padding: '20px', borderRadius: '20px', marginBottom: '20px' }}>
                  <div style={{ fontSize: '0.7em', color: 'var(--text-muted)', marginBottom: '5px' }}>CLIENT</div>
                  <div style={{ fontWeight: 800 }}>{client?.nom || "—"}</div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', marginTop: '15px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.9em', fontWeight: 800 }}>TOTAL NET</span>
                    <span style={{ color: 'var(--primary)', fontWeight: 900 }}>{cartTotal.toLocaleString()} DA</span>
                  </div>
                </div>

                <div className="field" style={{ marginBottom: '20px' }}>
                  <label className="label">Type de Vente</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                      className={`btn ${orderType === 'precommande' ? 'btn-primary' : 'btn-surface'}`} 
                      style={{ flex: 1, padding: '12px' }} 
                      onClick={() => setOrderType('precommande')}
                    >
                      <i className="fa-solid fa-clipboard-list" style={{ marginRight: '8px' }}></i> Pré-commande
                    </button>
                    <button 
                      className={`btn ${orderType === 'vanselling' ? 'btn-primary' : 'btn-surface'}`} 
                      style={{ flex: 1, padding: '12px' }} 
                      onClick={() => setOrderType('vanselling')}
                    >
                      <i className="fa-solid fa-truck-fast" style={{ marginRight: '8px' }}></i> Vente Camion
                    </button>
                  </div>
                </div>
                
                {orderType === 'vanselling' && (
                  <div className="field">
                    <label className="label">Signature du Client (Livraison Immédiate)</label>
                    <div style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', border: '2px dashed var(--primary)' }}>
                      <canvas ref={sigCanvas} width={400} height={180} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => {}} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={() => {}} style={{ width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" style={{ flex: 1, padding: '16px', fontSize: '1em' }} onClick={submitOrder}>
                  {orderType === 'vanselling' ? 'ENREGISTRER & LIVRER' : 'TRANSMETTRE AU BACK-OFFICE'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
