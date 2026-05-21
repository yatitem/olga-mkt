import { createClient } from '@supabase/supabase-js';

const SUPA_URL = 'https://hndsnoindoixrigcbivd.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZHNub2luZG9peHJpZ2NiaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc4NDAsImV4cCI6MjA4ODIwMzg0MH0.TghbRf1CyNb2Ikei2W-D1nQ7qS8IO7ZpIeuEwt4Co0Q';

export const supabase = createClient(SUPA_URL, SUPA_KEY);

export const SupabaseService = {
  // ── AUTH & USER ──
  async loginWithPin(pin) {
    // Hash the input pin with the salt used in OLGA (from olga_auth.js)
    const SALT = 'OLGA_SALT_2026';
    const encoder = new TextEncoder();
    const encoded = encoder.encode(pin + SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const pin_hash = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('pin_hash', pin_hash)
      .eq('actif', true)
      .single();
    
    if (error) return null;
    return data;
  },

  async getUserByPin(pinHash) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('pin_hash', pinHash)
      .eq('actif', true)
      .single();
    if (error) throw error;
    return data;
  },

  // ── CRM / CLIENTS ──
  async getClientsByCommercial(commercialId) {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('nom');
    if (error) throw error;
    return data;
  },

  // ── PERFORMANCE & STATS (Dashboard 1:1) ──
  async getCommercialStats(commercialId, monthIso) {
    const start = `${monthIso}-01T00:00:00.000Z`;
    // Calculer le dernier jour du mois
    const [year, month] = monthIso.split('-');
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${monthIso}-${lastDay}T23:59:59.999Z`;

    const { data: orders } = await supabase
      .from('orders')
      .select('total, status, client_id, date')
      .eq('commercial_id', commercialId)
      .gte('date', start)
      .lte('date', end);

    const { data: payments } = await supabase
      .from('payments')
      .select('amount, date')
      .eq('user_id', commercialId)
      .gte('date', start)
      .lte('date', end);

    const { count: visits } = await supabase
      .from('visits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', commercialId)
      .gte('date', start)
      .lte('date', end);

    return {
      orders: orders || [],
      payments: payments || [],
      visits: visits || 0
    };
  },

  // ── CATALOGUE ──
  async getProducts() {
    const { data, error } = await supabase
      .from('olga_products')
      .select('*')
      .order('nom');
    if (error) throw error;
    return data;
  }
};
