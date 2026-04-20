# 📘 Mini-Guide d'Utilisation - Dashboard Stratégique OLGA 1.0

Bienvenue sur le **Dashboard Stratégique OLGA 2026**. Ce document vous explique comment utiliser, mettre à jour et tirer le meilleur parti de cet outil.

---

## 1. Vue d'Ensemble
Ce tableau de bord est votre **cockpit de pilotage**. Il centralise toutes les informations cruciales pour la prise de décision :
*   📦 **Catalogue Produit** : Synchronisé en temps réel avec votre Google Sheet.
*   🧺 **Univers Linge** : Analyse de marché, positionnement prix vs Isis/Ariel.
*   🍋 **Univers Cuisine** : Stratégie Vaisselle & Dégraissant vs Pril/Force Express.
*   ✨ **Maison & Hygiène** : Opportunités Sols, Vitres et Savon liquide.

---

## 2. Fonctionnalités Clés

### A. Onglet "CATALOGUE OLGA" (Accueil)
*   **Synchronisation Automatique** : À l'ouverture, le tableau va chercher les dernières données sur votre Google Sheet.
*   **Code Couleur** : 
    *   🟢 **Vert** : Prix de lancement (Ambassador).
    *   🔴 **Rouge** : Recommandation stratégique (Argumentaire de vente).
    *   🟠 **Orange** : Produits "Star" ou en rupture.
*   **Images** : Les photos s'affichent automatiquement si le produit est reconnu (voir section *Maintenance*).

### B. Les Univers (Linge, Cuisine...)
Chaque onglet propose une analyse "Verticale" du marché :
1.  **Graphiques** : Parts de marché estimées & Benchmark Prix au Litre.
2.  **Value Chain** : Comparaison des marges (Usine -> Distri -> Détaillant -> Public).
3.  **Gain Détaillant** : L'argument tueur (ex: *"Vous gagnez 110 DA avec OLGA vs 40 DA avec Life"*).

---

## 3. Automatisation & Robot de Veille 🤖

Le Dashboard intègre un **Robot de Veille Concurrentielle** (`robot_veille.py`).
Son rôle est de mettre à jour les prix des concurrents (Isis, Omo, Force Express) dans les graphiques sans que vous ayez à toucher au code.

### Comment lancer une mise à jour ?
1.  **Méthode Manuelle** :
    *   Allez sur l'onglet **Catalogue**.
    *   Cliquez sur le bouton orange **🔄 Lancer Robot Veille Concurrents**.
    *   Votre navigateur vous proposera d'exécuter `lancer_veille.bat`. Acceptez.
    *   Une fenêtre noire va s'ouvrir quelques secondes : c'est le robot qui travaille. Une fois fermée, rafraîchissez la page (F5).

2.  **Méthode Automatique (Chaque Dimanche)** :
    *   Le système est conçu pour tourner tout seul. Si vous avez configuré la tâche planifiée Windows (demandez à votre support IT ou lancez la commande fournie), le robot se réveillera chaque dimanche à 9h00.

---

## 4. Maintenance & Images 📸

Si vous ajoutez un nouveau produit ou changez une photo, respectez cette procédure pour que l'image apparaisse :

1.  **Prenez votre photo** (format `.jpg` ou `.jpeg`).
2.  **Renommez le fichier** en suivant scrupuleusement cette nomenclature (tout en minuscules, sans espaces) :
    *   `olga_categorie_produit_format.jpg`
    *   *Exemples :*
        *   `olga_linge_bidon_10l.jpg`
        *   `olga_vaisselle_750ml.jpg`
        *   `olga_sol_lavande_1l.jpg`
3.  **Déposez le fichier** dans le dossier : `e:\ANTIGRAVITY\Photos\OLGA PACKSHOT\`
4.  Le Dashboard détectera automatiquement l'image au prochain chargement.

---

## 5. Dépannage 🆘

*   **Le tableau reste vide ("Chargement...") ?**
    *   Vérifiez votre connexion internet (le script doit contacter Google Sheets).
    *   Vérifiez que vous n'êtes pas bloqué par un pare-feu d'entreprise.

*   **Une image ne s'affiche pas ?**
    *   Vérifiez que le nom de fichier correspond bien à la nomenclature ci-dessus.
    *   Vérifiez que le format est bien `.jpg`.

---

*Généré par Antigravity pour OLGA Project - Février 2026*
