import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Search, AlertCircle } from 'lucide-react';
import { SupabaseService } from '../services/SupabaseService';

export default function Truck({ user }) {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStock();
  }, []);

  const fetchStock = async () => {
    try {
      const allProducts = await SupabaseService.getProducts();
      // On simule ici un stock camion attribué à ce commercial
      // Dans une version finale, ce serait un fetch depuis une table 'truck_stocks'
      const truckProducts = allProducts.map(p => ({
        ...p,
        truck_qty: Math.floor(Math.random() * 50) + 10 // Simule 10 à 60 colis
      }));
      setProducts(truckProducts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => 
    p.nom.toLowerCase().includes(search.toLowerCase()) || 
    p.parfum?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page scroll-area" style={{ padding: '20px', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6em', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="fa-solid fa-truck-fast"></i> Stock Camion
        </h2>
        <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
          Inventaire embarqué pour la vente directe.
        </p>
      </div>

      <div className="search-box" style={{ marginBottom: '20px' }}>
        <Search size={18} />
        <input 
          type="text" 
          placeholder="Rechercher dans le camion..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="loading-status">Chargement de l'inventaire...</div>
      ) : (
        <div className="truck-grid" style={{ display: 'grid', gap: '12px' }}>
          {filteredProducts.map(p => (
            <div key={p.id} className="item-card glass" style={{ display: 'flex', gap: '15px', alignItems: 'center', padding: '16px' }}>
              <div className="avatar" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', width: '48px', height: '48px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Package size={24} color="var(--primary)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9em' }}>{p.nom}</div>
                <div style={{ fontSize: '0.75em', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {p.parfum} • {p.pack}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 900, fontSize: '1.2em', color: p.truck_qty < 15 ? 'var(--red)' : 'var(--text)' }}>
                  {p.truck_qty} <span style={{ fontSize: '0.6em', opacity: 0.6 }}>COLIS</span>
                </div>
                {p.truck_qty < 15 && (
                  <div style={{ fontSize: '0.6em', color: 'var(--red)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <AlertCircle size={10} /> RUPTURE IMMINENTE
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
