import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Camera, MapPin, Send } from 'lucide-react';

export default function CompetitorPricing() {
  const [formData, setFormData] = useState({
    marque: '',
    produit: '',
    prix: '',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if(!formData.marque || !formData.produit || !formData.prix) {
      return alert("Veuillez remplir les champs obligatoires (Marque, Produit, Prix).");
    }
    alert('Signalement transmis avec succès au département Marketing !');
    setFormData({ marque: '', produit: '', prix: '', notes: '' });
  };

  return (
    <div className="page scroll-area" style={{ padding: '20px', paddingBottom: '100px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6em', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Target size={24} /> Veille Concurrence
        </h2>
        <p style={{ fontSize: '0.85em', color: 'var(--text-muted)', marginTop: '4px' }}>
          Signalez les prix concurrents observés sur le terrain.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="item-card glass" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div className="field">
          <label className="label">Marque Concurrent <span style={{ color: 'var(--red)' }}>*</span></label>
          <input
            type="text"
            className="input"
            value={formData.marque}
            onChange={(e) => setFormData({...formData, marque: e.target.value})}
            placeholder="Ex: Palmary, Bimo..."
            required
          />
        </div>
        
        <div className="field">
          <label className="label">Produit & Format <span style={{ color: 'var(--red)' }}>*</span></label>
          <input
            type="text"
            className="input"
            value={formData.produit}
            onChange={(e) => setFormData({...formData, produit: e.target.value})}
            placeholder="Ex: Gaufrette 35g"
            required
          />
        </div>
        
        <div className="field">
          <label className="label">Prix Observé (DA) <span style={{ color: 'var(--red)' }}>*</span></label>
          <input
            type="number"
            className="input"
            style={{ fontSize: '1.4em', fontWeight: 800, color: 'var(--primary)' }}
            value={formData.prix}
            onChange={(e) => setFormData({...formData, prix: e.target.value})}
            placeholder="0.00"
            required
          />
        </div>

        <div className="field">
          <label className="label">Localisation Actuelle</label>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <MapPin size={18} color="var(--primary)" />
            <span style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Position GPS: Superette El Amal</span>
          </div>
        </div>

        <div className="field">
          <label className="label">Preuve Visuelle (Optionnel)</label>
          <div onClick={() => alert("Capture photo à implémenter")} style={{ width: '100%', height: '100px', border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}>
            <Camera size={28} color="var(--text-muted)" />
            <span style={{ fontSize: '0.7em', color: 'var(--text-muted)', marginTop: '8px' }}>Prendre une photo du rayon</span>
          </div>
        </div>

        <div className="field">
          <label className="label">Observations</label>
          <textarea
            className="textarea"
            rows="3"
            value={formData.notes}
            onChange={(e) => setFormData({...formData, notes: e.target.value})}
            placeholder="Détails supplémentaires (promo, facing...)"
          />
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '16px', fontSize: '1em', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <Send size={18} /> TRANSMETTRE LE RELEVÉ
        </button>
      </form>
    </div>
  );
}
