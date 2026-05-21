import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, Info, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react';

export default function News() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simuler un appel API pour récupérer les messages flash de la direction
    setTimeout(() => {
      setMessages([
        { id: 1, type: 'alert', title: 'Rupture de Stock : Gaufrette Choco', content: 'Veuillez limiter les commandes de gaufrettes chocolat à 10 cartons par client.', date: 'Aujourd\'hui 09:30', read: false },
        { id: 2, type: 'promo', title: 'Nouveau Challenge Commercial', content: 'Objectif : +20% sur la gamme Biscuit Vanille ce mois-ci. Prime spéciale à la clé !', date: 'Hier 14:15', read: true },
        { id: 3, type: 'info', title: 'Mise à jour des prix', content: 'Les nouveaux tarifs de la gamme Biscuits Secs sont appliqués dans le catalogue.', date: '10 Mars 2026', read: true }
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const getIcon = (type) => {
    if (type === 'alert') return <AlertTriangle size={20} color="#ef4444" />;
    if (type === 'promo') return <TrendingUp size={20} color="#10b981" />;
    return <Info size={20} color="#3b82f6" />;
  };

  const markAsRead = (id) => {
    setMessages(messages.map(m => m.id === id ? { ...m, read: true } : m));
  };

  return (
    <div className="page scroll-area" style={{ padding: '20px', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6em', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={24} /> Fil d'Actualités
        </h2>
        <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
          Messages et directives de la direction.
        </p>
      </div>

      {loading ? (
        <div className="loading-status">Chargement des messages...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {messages.map(m => (
            <div 
              key={m.id} 
              className="item-card glass" 
              style={{ 
                padding: '16px', 
                borderLeft: !m.read ? '4px solid var(--primary)' : 'none',
                opacity: m.read ? 0.7 : 1,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}
              onClick={() => markAsRead(m.id)}
            >
              {m.read && (
                <div style={{ position: 'absolute', top: '-10px', right: '-10px', opacity: 0.05 }}>
                  <CheckCircle2 size={80} />
                </div>
              )}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px', borderRadius: '12px' }}>
                  {getIcon(m.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.95em', fontWeight: 800 }}>{m.title}</h4>
                    <span style={{ fontSize: '0.65em', color: 'var(--text-muted)' }}>{m.date}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8em', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    {m.content}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
