import React, { useState } from 'react';
import { SupabaseService } from '../services/SupabaseService';
import './Login.css';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleKey = (num) => {
    if (loading) return;
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleBack = () => {
    setPin(pin.slice(0, -1));
    setError(false);
  };

  const verifyPin = async (inputPin) => {
    setLoading(true);
    try {
      const user = await SupabaseService.loginWithPin(inputPin);
      if (user) {
        onLogin(user);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-container">
        
        {/* padLock Icon */}
        <div className="icon-circle">
          <i className="fa-solid fa-lock" style={{ fontSize: '24px', color: 'var(--primary)' }}></i>
        </div>

        <div className="login-header">
          <h1>Force de Vente</h1>
          <p>Saisissez votre PIN (4 chiffres)</p>
        </div>

        <div className="pin-display">
          {[1, 2, 3, 4].map((i) => (
            <div 
              key={i} 
              className={`dot ${pin.length >= i ? 'active' : ''} ${error ? 'error' : ''}`} 
            />
          ))}
        </div>

        <div className="keypad">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button key={num} className="key" onClick={() => handleKey(num.toString())}>
              {num}
            </button>
          ))}
          <div className="key empty" />
          <button className="key" onClick={() => handleKey('0')}>0</button>
          <button className="key del" onClick={handleBack}>
            <i className="fa-solid fa-delete-left"></i>
          </button>
        </div>

        {loading && <div style={{ marginTop: '20px', color: 'var(--primary)', fontSize: '0.8em', fontWeight: 800 }}>Vérification...</div>}
        {error && <div style={{ marginTop: '20px', color: 'var(--red)', fontSize: '0.8em', fontWeight: 800 }}>PIN Incorrect</div>}
      </div>
    </div>
  );
}
