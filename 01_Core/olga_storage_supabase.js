/**
 * OLGA STORAGE — SUPABASE ONLY (v5.0 - 2026-03-25)
 * Source de vérité : Supabase UNIQUEMENT. Pas de localStorage.
 * Cache RAM en session. Données fraîches à chaque init/sync.
 */
console.log("🚀 CORE STORAGE ENGINE v5.0 — SUPABASE ONLY");

const OLGA_STORAGE = (() => {

    const SUPA_URL = 'https://hndsnoindoixrigcbivd.supabase.co';
    const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhuZHNub2luZG9peHJpZ2NiaXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2Mjc4NDAsImV4cCI6MjA4ODIwMzg0MH0.TghbRf1CyNb2Ikei2W-D1nQ7qS8IO7ZpIeuEwt4Co0Q';

    let _supabase = null;
    let _ready = false;
    let _lastSync = 'En attente...';

    // Cache RAM session uniquement (vidé à chaque refresh)
    let _data = {
        orders: [], clients: [], products: [], users: [], roles: [],
        payments: [], objectifs: [], visits: [], announcements: [],
        competitor_prices: [], promotions: [], logs: [], vehicles: [], loading_slips: [],
        procurements: [] // Nouveau : Approvisionnements Usine
    };

    // Schéma des colonnes Supabase (évite les erreurs 400)
    const TABLE_SCHEMA = {
        'users':            ['id', 'nom', 'prenom', 'role', 'pin_hash', 'actif', 'tel', 'telephone', 'secteur', 'modules'],
        'clients':          ['id', 'nom', 'ville', 'wilaya', 'commune', 'telephone', 'tel', 'type', 'categorie', 'commercial_id', 'commercial_nom', 'status_validation', 'potentiel', 'mobile', 'acheteur', 'notes', 'promesse_ca', 'photo', 'date_creation', 'frequence_visite', 'credit_policy', 'credit_limit', 'rc', 'nif', 'quartier', 'adresse', 'last_visit_date', 'actif'],
        'olga_products':    ['id', 'gamme', 'nom', 'parfum', 'pack', 'prix_usine', 'prix_supa', 'prix_supb', 'prix_public', 'stock_actuel', 'stock_minimum', 'kg_per_pack', 'vol_m3_per_pack', 'actif', 'stock_units_total', 'stock_colis', 'stock_units_detail', 'stock_min_units'],
        'orders':           ['id', 'bl', 'date', 'client_id', 'client_nom', 'commercial_id', 'commercial_nom', 'items', 'total', 'status', 'delivery_status', 'bc_id', 'commune', 'signature'],
        'objectifs':        ['id', 'user_id', 'ca', 'visits', 'mois'],
        'vehicles':         ['id', 'label', 'max_tonnage', 'max_volume', 'matricule'],
        'payments':         ['id', 'client_id', 'client_nom', 'amount', 'date', 'mode', 'note', 'notes', 'user_id', 'user_nom', 'order_id', 'signature'],
        'visits':           ['id', 'client_id', 'client_nom', 'user_id', 'user_nom', 'date', 'heure', 'note',
                             'promesse_ca', 'acheteur_present', 'commande_prise', 'mise_en_avant',
                             'rupture_stock', 'concurrent_actif', 'satisfaction'],
        'announcements':    ['id', 'title', 'content', 'date', 'author', 'message', 'level', 'target', 'active'],
        'competitor_prices':['id', 'client_id', 'client_nom', 'product_id', 'brand', 'format', 'price', 'notes', 'user_id', 'date'],
        'promotions':       ['id', 'title', 'description', 'start_date', 'end_date'],
        'logs':             ['id', 'user', 'action', 'details', 'date'],
        'loading_slips':    ['id', 'date', 'vehicle', 'vehicle_matricule', 'driver', 'orders', 'summary', 'notes'],
        'olga_procurements':['id', 'date', 'factory_ref', 'items', 'total_amount', 'status', 'notes', 'doc_url']
    };

    // ── INITIALISATION ────────────────────────────────────────────
    async function init(onRefresh) {
        console.log("🛠️ Initialisation OLGA Storage (Supabase Only)...");

        return new Promise((resolve) => {
            if (!window.supabase) {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
                document.head.appendChild(s);
                s.onload = async () => {
                    await _startCloudSync(onRefresh);
                    resolve({ success: true });
                };
                s.onerror = () => resolve({ success: false });
            } else {
                _startCloudSync(onRefresh).then(() => resolve({ success: true }));
            }
        });
    }

    async function _startCloudSync(onRefresh) {
        try {
            _supabase = window.supabase.createClient(SUPA_URL, SUPA_KEY);
            console.log("📡 Supabase OK. Lancement de la synchro...");
            _setupRealtime(onRefresh);
            await _refreshAll(onRefresh);
            _ready = true;
            console.log("✅ Synchronisation Supabase terminée.");
        } catch (err) {
            console.warn("⚠️ Impossible de joindre Supabase.", err);
            _ready = false;
        }
    }

    function _setupRealtime(onRefresh) {
        if (!_supabase) return;
        const watchedTables = [
            { table: 'orders',        key: 'orders' },
            { table: 'announcements', key: 'announcements' },
            { table: 'clients',       key: 'clients' },
            { table: 'visits',        key: 'visits' },
            { table: 'payments',      key: 'payments' },
            { table: 'objectifs',     key: 'objectifs' },
            { table: 'olga_procurements', key: 'procurements' },
        ];
        watchedTables.forEach(({ table, key }) => {
            _supabase.channel(`realtime-${table}`)
                .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                    console.log(`🔄 [Realtime] ${table} → ${payload.eventType}`);
                    const arr = _data[key] || [];
                    if (payload.eventType === 'INSERT') {
                        if (!arr.find(x => String(x.id) === String(payload.new.id)))
                            _data[key] = [payload.new, ...arr];
                    } else if (payload.eventType === 'UPDATE') {
                        const i = arr.findIndex(x => String(x.id) === String(payload.new.id));
                        if (i > -1) _data[key][i] = { ...arr[i], ...payload.new };
                        else _data[key] = [payload.new, ...arr];
                    } else if (payload.eventType === 'DELETE') {
                        _data[key] = arr.filter(x => String(x.id) !== String(payload.old.id));
                    }
                    if (typeof onRefresh === 'function') onRefresh();
                    window.dispatchEvent(new CustomEvent('olga-realtime', { detail: { table, type: payload.eventType } }));
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') console.log(`📡 [Realtime] Écoute active sur "${table}"`);
                });
        });
    }

    function _deduplicate(arr) {
        if (!arr) return [];
        const seen = new Set();
        return arr.filter(item => {
            const id = String(item.id);
            if (seen.has(id)) return false;
            seen.add(id); return true;
        });
    }

    // ── HELPERS MAPPING ──────────────────────────────────────────
     function _toJS(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const res = {};
        for (const key in obj) {
            const val = obj[key];
            res[key] = val; 
            // Mapping automatique snake_case -> camelCase
            const camelCase = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
            if (camelCase !== key) res[camelCase] = val;
        }
        // Fallback spécifique pour backward compatibility
        if (res.deliveryStatus === undefined && res.delivery_status !== undefined) {
            res.deliveryStatus = res.delivery_status;
        }
        return res;
    }

    async function _refreshAll(cb) {
        if (!_supabase) return;
        const tables = {
            'olga_products': 'products', 'clients': 'clients', 'users': 'users',
            'orders': 'orders', 'objectifs': 'objectifs', 'vehicles': 'vehicles',
            'payments': 'payments', 'visits': 'visits', 'announcements': 'announcements',
            'competitor_prices': 'competitor_prices', 'promotions': 'promotions',
            'logs': 'logs', 'loading_slips': 'loading_slips', 'olga_procurements': 'procurements'
        };

        const promises = Object.entries(tables).map(async ([sbTable, localKey]) => {
            try {
                const { data, error } = await _supabase.from(sbTable).select('*');
                if (error) { 
                    console.error(`[Supabase] Erreur lecture ${sbTable}:`, error.message); 
                    return; 
                }
                if (!data) return;

                let processed = data.map(item => _toJS(item));

                // Post-traitements spécifiques si nécessaire
                if (localKey === 'products') {
                    processed = processed.map(p => {
                        // On privilégie les nouveaux champs entiers
                        p.stock_units_total = parseInt(p.stock_units_total || 0);
                        p.stock_colis = parseInt(p.stock_colis || 0);
                        p.stock_units_detail = parseInt(p.stock_units_detail || 0);
                        p.stock_min_units = parseInt(p.stock_min_units || 0);
                        
                        // stock_actuel = nombre de packs entiers (jamais de virgule)
                        p.stock_actuel = parseInt(p.stock_actuel || 0);
                        // stock_minimum = nombre de packs seuil d'alerte (entier)
                        p.stock_minimum = parseInt(p.stock_minimum || 0);
                        
                        const prix_supA = p.prix_supa !== undefined ? p.prix_supa : (p.prix_supA || 0);
                        const prix_supB = p.prix_supb !== undefined ? p.prix_supb : (p.prix_supB || 0);
                        return {
                            ...p,
                            prix_supa: prix_supA, // Toujours synchro
                            prix_supb: prix_supB,
                            prix_supA: prix_supA, // Pour compatibilité Backoffice (Majuscule)
                            prix_supB: prix_supB
                        };
                    });
                } else if (localKey === 'clients') {
                    processed = processed.map(c => ({
                        ...c,
                        wilaya: c.wilaya || c.ville || '16 - Alger',
                        tel: c.tel || c.telephone || '',
                        categorie: c.categorie || 'SupB'
                    }));
                }

                _data[localKey] = _deduplicate(processed);
                console.log(`[Sync ✓] ${sbTable} : ${_data[localKey].length} enregistrements`);
            } catch (e) {
                console.error(`[RefreshTable] Echec ${sbTable}:`, e);
            }
        });

        await Promise.allSettled(promises);
        _lastSync = new Date().toLocaleTimeString();
        if (cb) cb();
    }

    // ── GETTERS (RAM seulement) ──────────────────────────────────
    const getOrders       = () => _data.orders;
    const getClients      = () => _data.clients;
    const getProducts     = () => _data.products;
    const getUsers        = () => _data.users;
    const getVehicles     = () => _data.vehicles || [];
    const getPayments     = (clientId) => clientId ? _data.payments.filter(p => String(p.client_id) === String(clientId)) : _data.payments;
    const getObjectifs    = (userId) => userId ? _data.objectifs.filter(o => String(o.user_id) === String(userId)) : _data.objectifs;
    const getLogs         = () => _data.logs || [];
    const getAnnouncements= () => _data.announcements || [];
    const getVisits       = () => _data.visits || [];
    const getCompetitorPrices = () => _data.competitor_prices || [];
    const getPromotions   = () => _data.promotions || [];
    const getRoles        = () => _data.roles.length ? _data.roles : [
        { id: 'admin',       label: 'Administrateur',     color: 'b-red',    modules: 'dashboard,validation,ventes,catalogue,crm,performance,market,communication,facturation,livraisons,creances,team' },
        { id: 'rc',          label: 'Responsable Comm.',  color: 'b-orange', modules: 'dashboard,validation,catalogue,facturation,performance,crm' },
        { id: 'commercial',  label: 'Commercial Terrain', color: 'b-blue',   modules: 'crm,ventes,orders_list,market,communication' },
        { id: 'livreur',     label: 'Livreur',            color: 'b-blue',   modules: 'livraisons,communication' },
        { id: 'recouvrement',label: 'Recouvrement',       color: 'b-blue',   modules: 'creances,crm' }
    ];

    // ── SAUVEGARDE SÉCURISÉE SUPABASE ────────────────────────────
    async function _safeSave(tableName, data, safeKeys) {
        if (!_supabase) return { success: false, error: 'Supabase non initialisé' };
        let schema = [...(safeKeys || TABLE_SCHEMA[tableName] || Object.keys(data))];
        const dbId = isNaN(data.id) ? data.id : Number(data.id);
        let attempts = 0, success = false, lastError = null;

        while (!success && attempts < 20) {
            attempts++;
            const payload = { id: dbId };
            schema.forEach(k => {
                let val = data[k];
                // Mapping intelligent pour éviter les erreurs de mapping manuel
                if (val === undefined) {
                    // Tente de trouver la valeur sous d'autres formes (camelCase -> snake_case)
                    const camel = k.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
                    val = data[camel];
                }
                
                // Fallbacks spécifiques critiques
                if (val === undefined && (k === 'telephone' || k === 'tel')) val = data.telephone || data.tel || data.mobile;
                if (val === undefined && k === 'ville')          val = data.ville || data.wilaya;
                if (val === undefined && k === 'delivery_status') val = data.delivery_status || data.deliveryStatus || data.deliverystatus;
                if (val === undefined && k === 'client_nom')     val = data.client_nom || data.client;
                
                if (val !== undefined) payload[k] = val;
            });

            const { error } = await _supabase.from(tableName).upsert(payload);
            if (error) {
                lastError = error.message;
                // Auto-Healing : si Supabase rejette une colonne qui n'existe pas, on l'enlève du schéma local pour cette session
                const match = error.message.match(/column "(.+)" of relation/i) || error.message.match(/Could not find the '(.+)' column/i);
                if (match && match[1]) {
                    console.warn(`[Auto-Heal] Suppression de la colonne inexistante "${match[1]}" sur la table ${tableName}`);
                    schema = schema.filter(c => c !== match[1]);
                } else {
                    console.error(`[SafeSave] Erreur fatale ${tableName}:`, error.message);
                    break;
                }
            } else {
                success = true;
            }
        }
        return { success, error: lastError };
    }

    // ── SETTERS ──────────────────────────────────────────────────
    async function saveOrder(order) {
        const idx = _data.orders.findIndex(o => String(o.id) === String(order.id));
        if (idx > -1) _data.orders[idx] = order; else _data.orders.unshift(order);
        _data.orders = _deduplicate(_data.orders);
        return await _safeSave('orders', order);
    }

    // --- APPROVISIONNEMENTS (ACHATS USINE) ---
    const getProcurements = () => _data.procurements || [];
    
    async function saveProcurement(p) {
        if (!p.id) p.id = Date.now();
        const idx = _data.procurements.findIndex(x => String(x.id) === String(p.id));
        if (idx > -1) _data.procurements[idx] = p; else _data.procurements.unshift(p);
        _data.procurements = _deduplicate(_data.procurements);
        return await _safeSave('olga_procurements', p);
    }

    async function deleteProcurement(id) {
        _data.procurements = _data.procurements.filter(x => String(x.id) !== String(id));
        if (_supabase) {
            const { error } = await _supabase.from('olga_procurements').delete().eq('id', id);
            return { success: !error };
        }
        return { success: true };
    }

    async function updateDeliveryStatus(orderId, newStatus) {
        const order = _data.orders.find(o => String(o.id) === String(orderId));
        if (order) { 
            order.delivery_status = newStatus; 
            order.deliveryStatus = newStatus; 
        }
        const dbId = isNaN(orderId) ? orderId : Number(orderId);
        const { error } = await _supabase.from('orders').update({ delivery_status: newStatus }).eq('id', dbId);
        return { success: !error, error: error?.message };
    }

    async function updateStock(productId, diffQty, unitType = 'pack') {
        const p = _data.products.find(x => String(x.id) === String(productId));
        if (!p) return { success: false, error: 'Produit introuvable' };

        const mult = getPackMultiplier(p.pack);
        const diffInUnits = unitType === 'pack' ? (diffQty * mult) : diffQty;
        
        // Nouvelle source de vérité: les unités totales (entier)
        const oldTotal = p.stock_units_total || 0;
        const newTotal = oldTotal + diffInUnits;
        
        // Recalcul des champs dérivés
        const newColis = Math.floor(newTotal / mult);
        const newDetail = newTotal % mult;

        p.stock_units_total = newTotal;
        p.stock_colis = newColis;
        p.stock_units_detail = newDetail;
        
        // stock_actuel = nombre de packs complets (entier, jamais de virgule)
        p.stock_actuel = newColis;

        if (_supabase) {
            await _supabase.from('olga_products').update({
                stock_units_total: newTotal,
                stock_colis: newColis,
                stock_units_detail: newDetail,
                stock_actuel: p.stock_actuel
            }).eq('id', productId);
        }
        return { success: true, newStock: newTotal };
    }

    async function updateStockBatch(updates) {
        if (!updates?.length) return { success: true };
        for (const up of updates) await updateStock(up.id, up.delta);
        return { success: true };
    }

    async function saveClient(client) {
        const idx = _data.clients.findIndex(c => String(c.id) === String(client.id));
        if (idx > -1) _data.clients[idx] = client; else _data.clients.push(client);
        _data.clients = _deduplicate(_data.clients);
        // Colonnes de base confirmées dans le schéma Supabase
        const coreColumns = ['nom', 'ville', 'wilaya', 'commune', 'telephone', 'tel', 'type',
            'categorie', 'commercial_id', 'commercial_nom', 'status_validation',
            'potentiel', 'mobile', 'acheteur', 'notes', 'promesse_ca', 'photo', 'date_creation'];
        // Colonnes étendues (Supabase les ignore si elles n'existent pas — auto-healing actif)
        const extendedColumns = ['frequence_visite', 'credit_policy', 'credit_limit',
            'rc', 'nif', 'quartier', 'adresse', 'actif', 'last_visit_date'];
        return await _safeSave('clients', client, [...coreColumns, ...extendedColumns]);
    }

    async function saveUser(user) {
        const idx = _data.users.findIndex(u => String(u.id) === String(user.id));
        if (idx > -1) _data.users[idx] = user; else _data.users.push(user);
        _data.users = _deduplicate(_data.users);
        const safeColumns = ['nom', 'prenom', 'role', 'pin_hash', 'actif', 'tel', 'telephone', 'secteur'];
        return await _safeSave('users', user, safeColumns);
    }

    async function saveObjectif(obj) {
        // Garantit un ID numérique valide (bigint Supabase)
        const existing = _data.objectifs.find(o =>
            String(o.user_id) === String(obj.user_id) && o.mois === obj.mois
        );
        if (existing && !isNaN(Number(existing.id))) {
            obj.id = Number(existing.id); // Garde l'ID Supabase existant
        } else {
            obj.id = Date.now(); // Nouvel enregistrement
        }
        obj.user_id = Number(obj.user_id);

        // Mise à jour RAM
        const idx = _data.objectifs.findIndex(o => String(o.id) === String(obj.id));
        if (idx > -1) _data.objectifs[idx] = obj; else _data.objectifs.push(obj);

        return await _safeSave('objectifs', obj);
    }

    async function addPayment(pay) {
        if (!pay.id) pay.id = Date.now();
        if (!pay.date) pay.date = new Date().toISOString().split('T')[0];
        _data.payments.unshift(pay);
        return await _safeSave('payments', pay);
    }

    async function addVisit(v) {
        if (!v.id) v.id = Date.now();
        if (!v.date) v.date = new Date().toISOString().split('T')[0];
        if (!v.heure) v.heure = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        _data.visits.unshift(v);
        // Colonnes de base garanties
        const coreVisitCols = ['client_id', 'client_nom', 'user_id', 'user_nom', 'date', 'heure', 'note'];
        // KPIs rapport de visite (auto-heal si colonne manquante)
        const kpiCols = ['promesse_ca', 'acheteur_present', 'commande_prise', 'mise_en_avant',
                         'rupture_stock', 'concurrent_actif', 'satisfaction'];
        return await _safeSave('visits', v, [...coreVisitCols, ...kpiCols]);
    }

    async function saveAnnouncement(a) {
        if (!a.id) a.id = Date.now();
        if (!a.date) a.date = new Date().toISOString();
        if (a.active === undefined) a.active = true;
        const idx = _data.announcements.findIndex(x => String(x.id) === String(a.id));
        if (idx > -1) _data.announcements[idx] = a; else _data.announcements.unshift(a);
        return await _safeSave('announcements', a);
    }

    async function deleteAnnouncement(id) {
        _data.announcements = _data.announcements.filter(x => String(x.id) !== String(id));
        const { error } = await _supabase.from('announcements').delete().eq('id', id);
        return { success: !error, error: error?.message };
    }

    async function addCompetitorPrice(cp) {
        if (!cp.id) cp.id = Date.now();
        _data.competitor_prices.unshift(cp);
        return await _safeSave('competitor_prices', cp);
    }

    async function savePromotion(p) {
        if (!p.id) p.id = Date.now();
        const idx = _data.promotions.findIndex(x => String(x.id) === String(p.id));
        if (idx > -1) _data.promotions[idx] = p; else _data.promotions.push(p);
        return await _safeSave('promotions', p);
    }

    async function saveProduct(product) {
        // Mise à jour locale (RAM)
        const idx = _data.products.findIndex(p => String(p.id) === String(product.id));
        if (idx > -1) _data.products[idx] = product; else _data.products.push(product);
        
        // Mapping spécifique pour Supabase (CamelCase -> snake_case) 
        // Note: _safeSave gère déjà certains fallbacks mais on force ici pour plus de clarté
        const db = { 
            ...product, 
            prix_supa: product.prix_supA || product.prix_supa || 0, 
            prix_supb: product.prix_supB || product.prix_supb || 0 
        };
        
        return await _safeSave('olga_products', db);
    }

    async function resetProducts(products) {
        _data.products = _deduplicate(products);
        if (!_supabase) return { success: false, error: "Supabase non initialisé" };
        
        const schema = TABLE_SCHEMA['olga_products'];
        const dbProducts = _data.products.map(p => {
            const dbObj = {};
            schema.forEach(k => {
                let val = p[k];
                if (val === undefined) {
                    if (k === 'prix_supa') val = p.prix_supA;
                    if (k === 'prix_supb') val = p.prix_supB;
                }
                if (val !== undefined) dbObj[k] = val;
            });
            return dbObj;
        });

        const { error } = await _supabase.from('olga_products').upsert(dbProducts);
        _lastSync = new Date().toLocaleTimeString();
        return { success: !error, error: error?.message };
    }

    async function saveVehicle(v) {
        if (!v.id) v.id = Date.now();
        const idx = _data.vehicles.findIndex(x => String(x.id) === String(v.id));
        if (idx > -1) _data.vehicles[idx] = v; else _data.vehicles.push(v);
        return await _safeSave('vehicles', v);
    }

    async function deleteVehicle(id) {
        _data.vehicles = _data.vehicles.filter(v => String(v.id) !== String(id));
        const { error } = await _supabase.from('vehicles').delete().eq('id', isNaN(id) ? id : Number(id));
        return { success: !error, error: error?.message };
    }

    async function deleteClient(id) {
        _data.clients = _data.clients.filter(c => String(c.id) !== String(id));
        const { error } = await _supabase.from('clients').delete().eq('id', isNaN(id) ? id : Number(id));
        return { success: !error, error: error?.message };
    }

    async function deleteProduct(id) {
        _data.products = _data.products.filter(p => String(p.id) !== String(id));
        const { error } = await _supabase.from('olga_products').delete().eq('id', isNaN(id) ? id : Number(id));
        return { success: !error, error: error?.message };
    }

    async function deleteUser(id) {
        _data.users = _data.users.filter(u => String(u.id) !== String(id));
        const { error } = await _supabase.from('users').delete().eq('id', isNaN(id) ? id : Number(id));
        return { success: !error, error: error?.message };
    }

    async function deleteOrder(id) {
        _data.orders = _data.orders.filter(o => String(o.id) !== String(id));
        const { error } = await _supabase.from('orders').delete().eq('id', isNaN(id) ? id : Number(id));
        return { success: !error, error: error?.message };
    }

    async function saveLog(log) {
        const entry = { ...log, id: Date.now(), date: new Date().toISOString() };
        _data.logs.unshift(entry);
        if (_data.logs.length > 100) _data.logs.pop();
        _supabase.from('logs').insert(entry).then(({ error }) => {
            if (error) console.warn("Supabase Logs :", error.message);
        });
        return { success: true };
    }

    // ── BONS DE CHARGEMENT ───────────────────────────────────────
    function getLoadingSlips() { return _data.loading_slips || []; }

    async function saveLoadingSlip(slip) {
        if (!slip.id) slip.id = 'BC-' + Date.now();
        const idx = _data.loading_slips.findIndex(s => s.id === slip.id);
        if (idx > -1) _data.loading_slips[idx] = slip; else _data.loading_slips.unshift(slip);
        if (_supabase) {
            const dbPayload = { id: slip.id, date: slip.date, vehicle: slip.vehicle,
                vehicle_matricule: slip.vehicleMatricule || null, driver: slip.driver,
                orders: slip.orders || [], summary: slip.summary || {}, notes: slip.notes || null };
            const { error } = await _supabase.from('loading_slips').upsert(dbPayload);
            if (error) console.error('[Supabase] saveLoadingSlip:', error.message);
        }
        return { success: true, id: slip.id };
    }

    async function deleteLoadingSlip(id) {
        _data.loading_slips = _data.loading_slips.filter(s => s.id !== id);
        if (_supabase) {
            const { error } = await _supabase.from('loading_slips').delete().eq('id', id);
            if (error) console.error('[Supabase] deleteLoadingSlip:', error.message);
        }
        return { success: true };
    }

    // ── LOGIQUE MÉTIER ───────────────────────────────────────────
    function getPrice(product, typeTarif = 'SupB') {
        if (!product) return 0;
        const field = typeTarif === 'SupA' ? 'prix_supA' : 'prix_supB';
        const fieldLow = typeTarif === 'SupA' ? 'prix_supa' : 'prix_supb';
        let price = product[field] !== undefined ? product[field] : product[fieldLow];
        return Math.floor(price || 0);
    }

    function getPackPrice(product, typeTarif = 'SupB') {
        if (!product) return 0;
        const unitPrice = getPrice(product, typeTarif);
        const mult = getPackMultiplier(product.pack);
        return unitPrice * mult;
    }

    function formatStock(product) {
        if (!product) return '—';
        const totalUnits = product.stock_units_total || 0;
        const c = product.stock_colis || 0;
        const d = product.stock_units_detail || 0;
        const mult = getPackMultiplier(product.pack);

        if (mult <= 1) return `${totalUnits} unité${totalUnits > 1 ? 's' : ''}`;
        
        let label = [];
        if (c > 0) label.push(`${c} colis`);
        if (d > 0) label.push(`${d} unité${d > 1 ? 's' : ''}`);
        
        return `${label.length > 0 ? label.join(' et ') : '0 colis'} (${totalUnits} unité${totalUnits > 1 ? 's' : ''})`;
    }

    function getPackMultiplier(packStr) {
        if (!packStr || packStr.toLowerCase().includes('unité')) return 1;
        const m = packStr.match(/\d+/);
        return m ? parseInt(m[0]) : 1;
    }

    function cleanName(n) { return n ? n.split('(')[0].trim() : ""; }

    function getLoyaltyProgress(clientId) {
        const orders = _data.orders.filter(o => String(o.client_id) === String(clientId) && (o.status === 'valide' || o.status === 'livre'));
        const stats = {};
        orders.forEach(o => {
            (o.items || []).forEach(it => {
                if (!stats[it.produit_id]) stats[it.produit_id] = { nom: it.produit_nom, total_qty: 0 };
                stats[it.produit_id].total_qty += Number(it.qty || 0);
            });
        });
        return Object.entries(stats).map(([pid, data]) => {
            const cycle = 11;
            const count = data.total_qty % cycle;
            return { produit_id: parseInt(pid), nom: data.nom, current: count, next_free: cycle - count, total_lifetime: data.total_qty };
        });
    }

    async function migrateLocalToCloud() {
        console.log("ℹ️ Migration non nécessaire — mode Supabase Only actif.");
        return { success: true };
    }

    const asyncNoop = async () => ({ success: true });

    return {
        init,
        forceSync: (cb) => _refreshAll(cb),
        getOrders, saveOrder, deleteOrder, updateDeliveryStatus,
        getProcurements, saveProcurement, deleteProcurement,
        getNextBLNumber: () => 'PROV-' + Date.now(),
        getClients, saveClient, deleteClient,
        getProducts, saveProduct, resetProducts, deleteProduct,
        updateStock, updateStockBatch, formatStock, cleanName,
        getPrice,
        getPackPrice,
        getPackMultiplier, getLoyaltyProgress,
        getUsers, saveUser, deleteUser,
        getVehicles, saveVehicle, deleteVehicle,
        getRoles, saveRole: asyncNoop, deleteRole: asyncNoop,
        getPayments, addPayment,
        getObjectifs, saveObjectif,
        getVisits, addVisit,
        getAnnouncements, saveAnnouncement, deleteAnnouncement,
        getCompetitorPrices, addCompetitorPrice,
        getPromotions, savePromotion,
        getLogs, saveLog,
        getLoadingSlips, saveLoadingSlip, deleteLoadingSlip,
        migrateLocalToCloud,
        getLastSync: () => _lastSync
    };

})();
