// ============================================================
//  OLGA AUTH — Module d'authentification partagé
//  Inclure après olga_config.js sur toutes les pages
// ============================================================

const OLGA_AUTH = (() => {

    const SALT = 'OLGA_SALT_2026';
    const SESSION_TTL = 10 * 60 * 60 * 1000; // 10 heures

    // ── Hash PIN (SHA-256 + sel) ──────────────────────────────
    async function hashPin(pin) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + SALT);
        const hash = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    // ── Connexion (Supabase) ──────────────────────────────────
    async function login(pin) {
        try {
            const SUPA_URL = 'https://hndsnoindoixrigcbivd.supabase.co';
            const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZHNub2luZG9peHJpZ2NiaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc4NDAsImV4cCI6MjA4ODIwMzg0MH0.TghbRf1CyNb2Ikei2W-D1nQ7qS8IO7ZpIeuEwt4Co0Q';
            
            const pin_hash = await hashPin(pin);
            const url = `${SUPA_URL}/rest/v1/users?pin_hash=eq.${pin_hash}&select=*`;
            const resp = await fetch(url, {
                method: 'GET',
                headers: { 
                    'apikey': SUPA_KEY,
                    'Authorization': `Bearer ${SUPA_KEY}`
                }
            });
            
            const data = await resp.json();
            
            if (data && data.length > 0) {
                const user = data[0];
                if (user.actif) {
                    sessionStorage.setItem('olga_user', JSON.stringify(user));
                    sessionStorage.setItem('olga_ts', Date.now().toString());
                    return { success: true, user: user };
                } else {
                    return { error: 'Compte inactif' };
                }
            }
            return { error: 'PIN incorrect' };
        } catch (e) {
            return { error: 'Serveur inaccessible. Vérifiez votre connexion.' };
        }
    }

    // ── Rôles et Permissions (Mapping Source de Vérité) ────────
    const PERMISSIONS = {
        admin: ['dashboard', 'validation', 'ventes', 'catalogue', 'crm', 'performance', 'market', 'communication', 'facturation', 'livraisons', 'creances', 'team'],
        rc: ['dashboard', 'validation', 'catalogue', 'facturation', 'performance', 'crm'],
        commercial: ['crm', 'ventes', 'orders_list', 'market', 'communication'],
        livreur: ['livraisons', 'communication'],
        recouvrement: ['creances', 'crm'],
        polyvalent: ['crm', 'ventes', 'livraisons', 'communication']
    };

    // ── Session courante ──────────────────────────────────────
    function getSession() {
        const raw = sessionStorage.getItem('olga_user');
        const ts = sessionStorage.getItem('olga_ts');
        if (!raw || !ts) return null;

        // Expiration session
        if (Date.now() - parseInt(ts) > SESSION_TTL) {
            logout(false);
            return null;
        }

        const user = JSON.parse(raw);
        // On attache les permissions dynamiquement à l'objet user
        user.permissions = PERMISSIONS[user.role] || [];
        return user;
    }

    // ── Vérifier l'accès à un module spécifique ───────────────
    function canAccess(moduleName) {
        const user = getSession();
        if (!user) return false;
        if (user.role === 'admin') return true;
        return user.permissions.includes(moduleName);
    }

    // ── Vérifier le rôle et rediriger si non autorisé ─────────
    function requireRole(...roles) {
        const user = getSession();
        if (!user) {
            _redirectToLogin();
            return null;
        }
        if (roles.length && !roles.includes(user.role)) {
            console.error('⛔ Accès non autorisé pour le rôle:', user.role);
            _redirectToLogin();
            return null;
        }
        return user;
    }

    // ── Vérifier l'accès page et rediriger si nécessaire ──────
    function requirePermission(moduleName) {
        if (!canAccess(moduleName)) {
            alert('🚫 Vous n\'avez pas les droits pour accéder à ce module.');
            _redirectToLogin();
            return false;
        }
        return true;
    }

    function _redirectToLogin() {
        const isTerrain = window.location.pathname.includes('04_Modules_Terrain');
        const target = isTerrain ? 'login_olga.html' : '../04_Modules_Terrain/login_olga.html';
        window.location.href = target;
    }

    // ── Vérifier sans redirection ─────────────────────────────
    function hasRole(...roles) {
        const user = getSession();
        return user && (roles.length === 0 || roles.includes(user.role));
    }

    // ── Déconnexion ───────────────────────────────────────────
    function logout(redirect = true) {
        sessionStorage.removeItem('olga_user');
        sessionStorage.removeItem('olga_ts');
        if (redirect) _redirectToLogin();
    }

    // ── Reset PIN (admin seulement, appel direct API) ─────────
    async function resetPin(userId, newPin) {
        const pin_hash = await hashPin(newPin);
        const resp = await fetch(OLGA_CONFIG.API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'resetPin', id: userId, pin_hash })
        });
        return resp.json();
    }

    // ── Redirection post-login selon le rôle ──────────────────
    function redirectByRole(user) {
        const path = window.location.pathname;
        const isTerrain = path.includes('04_Modules_Terrain');
        const prefixAdmin = isTerrain ? '../03_Modules_Admin/' : '';
        const prefixTerrain = isTerrain ? '' : '../04_Modules_Terrain/';
        const prefixPortal = isTerrain ? '../00_Portal/' : '../00_Portal/'; // Toujours remonter d'un cran

        // On envoie les admins et rc vers le portail pour voir le "Système OLGA" global
        if (user.role === 'admin' || user.role === 'rc') {
            window.location.href = prefixPortal + 'home_olga.html';
            return;
        }

        const targets = {
            commercial: prefixTerrain + 'app_commercial_olga.html',
            livreur: prefixTerrain + 'app_commercial_olga.html',
            recouvrement: prefixTerrain + 'app_commercial_olga.html',
            polyvalent: prefixTerrain + 'app_commercial_olga.html'
        };
        window.location.href = targets[user.role] || (prefixPortal + 'home_olga.html');
    }

    // ── Injecter le header utilisateur dans le DOM ────────────
    function renderUserBadge(containerId) {
        const user = getSession();
        const el = document.getElementById(containerId);
        if (!el || !user) return;
        const roleLabel = {
            admin: '🔑 Admin',
            rc: '📋 Responsable',
            commercial: '🚗 Commercial',
            livreur: '🚛 Livreur',
            recouvrement: '💰 Recouvrement',
            polyvalent: '🛠️ Polyvalent'
        };
        el.innerHTML = `
            <span style="font-size:0.85em;color:#94a3b8;">
                ${roleLabel[user.role] || user.role} — <strong style="color:#e2e8f0;">${user.nom}</strong>
            </span>
            <button onclick="OLGA_AUTH.logout()" style="background:rgba(255,255,255,0.1);border:none;color:#94a3b8;cursor:pointer;padding:4px 10px;border-radius:6px;font-size:0.8em;margin-left:8px;">
                ⏻ Déconnexion
            </button>
        `;
    }

    return { login, logout, hashPin, resetPin, getSession, requireRole, hasRole, redirectByRole, renderUserBadge };

})();
