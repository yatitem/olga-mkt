"""
SIMULATION LANCEMENT GAMME LESSIVE OLGA (Dely Ibrahim / Ouled Fayet / Chéraga)
Inputs:
- 200 Points de Vente (POS) : Supérettes, Snacks, Alimentations Générales, Lave-autos.
- 3 Formats : 3L, 5L, 10L.
- 3 Parfums : "Fraîcheur Océan" (Blue), "Savon de Marseille" (White), "Fleur de Printemps" (Pink).
"""

NB_POS_TARGET = 200
TAUX_PENETRATION_M1 = 0.5  # 50% acceptent l'offre d'implantation immédiate (100 POS)
TAUX_PENETRATION_M2 = 0.7  # 70% (140 POS) - Réassort + Nouveaux
TAUX_PENETRATION_M3 = 0.85 # 85% (170 POS) - Rythme de croisière

# Hypothèse MIX PARFUMS (Habituel Algérie)
MIX_PARFUMS = {
    "Fraîcheur Océan": 0.50,
    "Savon Marseille": 0.30,
    "Fleur Printemps": 0.20
}

# HYPOTHÈSE COMMANDE TYPE (IMPLANTATION) - PAR POS
# Format: (Unités, Prix Unitaire Détaillant HT)
IMPLANTATION_TYPE = {
    "3L": {"qty": 12, "prix": 340},  # 3 Cartons de 4 (1 par parfum)
    "5L": {"qty": 6,  "prix": 470},  # 2 Cartons de 3 (Océan + Marseille)
    "10L": {"qty": 2, "prix": 820}   # 2 Bidons (Océan + Marseille) - Test
}

# HYPOTHÈSE ROTATION MENSUELLE (PAR POS ACTIF)
ROTATION_MENS = {
    "3L": 24, # 2 cartons / mois
    "5L": 9,  # 3 packs / mois
    "10L": 4  # 4 bidons / mois
}

def simulate_month(nb_pos_actifs, rotation_factor=1.0):
    total_qty = {"3L": 0, "5L": 0, "10L": 0}
    total_ca = 0
    production_parfum = {"Fraîcheur Océan": 0, "Savon Marseille": 0, "Fleur Printemps": 0}

    for fmt, data in ROTATION_MENS.items():
        qty_total_fmt = nb_pos_actifs * data * rotation_factor
        total_qty[fmt] = int(qty_total_fmt)
        
        # Breakdown by perfume
        production_parfum["Fraîcheur Océan"] += qty_total_fmt * MIX_PARFUMS["Fraîcheur Océan"]
        production_parfum["Savon Marseille"] += qty_total_fmt * MIX_PARFUMS["Savon Marseille"]
        production_parfum["Fleur Printemps"] += qty_total_fmt * MIX_PARFUMS["Fleur Printemps"]

        # CA
        prix_unit = IMPLANTATION_TYPE[fmt]["prix"]
        total_ca += qty_total_fmt * prix_unit

    return total_qty, production_parfum, total_ca

# --- CALCULATIONS ---

# 1. STOCK DE DÉPART (IMPLANTATION MASSE 200 POS - SCENARIO MAX)
stock_depart = {}
stock_depart_parfum = {"Fraîcheur Océan": 0, "Savon Marseille": 0, "Fleur Printemps": 0}
ca_implantation_theorique = 0

for fmt, data in IMPLANTATION_TYPE.items():
    qty = NB_POS_TARGET * data["qty"]
    stock_depart[fmt] = qty
    ca_implantation_theorique += qty * data["prix"]
    
    stock_depart_parfum["Fraîcheur Océan"] += qty * MIX_PARFUMS["Fraîcheur Océan"]
    stock_depart_parfum["Savon Marseille"] += qty * MIX_PARFUMS["Savon Marseille"]
    stock_depart_parfum["Fleur Printemps"] += qty * MIX_PARFUMS["Fleur Printemps"]


# 2. SIMULATION M1, M2, M3
# M1 : Implantation (50% POS) + petite revente
q_m1, p_m1, ca_m1 = simulate_month(NB_POS_TARGET * TAUX_PENETRATION_M1, rotation_factor=0.8) # Démarrage lent

# M2 : Réassort (70% POS) + Vitesse croisière
q_m2, p_m2, ca_m2 = simulate_month(NB_POS_TARGET * TAUX_PENETRATION_M2, rotation_factor=1.0)

# M3 : Full Speed (85% POS)
q_m3, p_m3, ca_m3 = simulate_month(NB_POS_TARGET * TAUX_PENETRATION_M3, rotation_factor=1.1) # Fidélisation


# --- OUTPUT MARKDOWN ---
md_output = f"""# 🚀 FEUILLE DE ROUTE OPÉRATIONNELLE : LANCEMENT LESSIVE OLGA (ZONE PILOTE)

## 📌 CADRAGE DU LANCEMENT
*   **Zone Cible :** Dely Ibrahim, Ouled Fayet, Chéraga (Triangle d'Or).
*   **Cible Commerciale :** 200 Points de Vente (Supérettes, Alimentation, Grossistes de quartier).
*   **Gamme :** Lessive Liquide (3 Parfums : *Fraîcheur Océan*, *Savon Marseille*, *Fleur Printemps*).
*   **Formats :** 3L (Cœur de cible), 5L (Famille), 10L (Pro/Rural).

---

## 1. 🏭 ESTIMATION PRODUCTION (STOCK DE DÉMARRAGE)
*Objectif : Avoir suffisamment de stock pour implanter les 200 POS en 1ère visite (Pack Implantation).*

### VOLUME TOTAL NÉCESSAIRE (Pour couvrir 200 POS)
| Format | Qté / POS (Pack Type) | **TOTAL PROD À PRÉVOIR** | Dont Océan (50%) | Dont Marseille (30%) | Dont Fleur (20%) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **3 Litres** | {IMPLANTATION_TYPE["3L"]["qty"]} Unités (3 Cartons) | **{stock_depart["3L"]:,} Unités** | {int(stock_depart["3L"]*0.5):,} | {int(stock_depart["3L"]*0.3):,} | {int(stock_depart["3L"]*0.2):,} |
| **5 Litres** | {IMPLANTATION_TYPE["5L"]["qty"]} Unités (2 Cartons) | **{stock_depart["5L"]:,} Unités** | {int(stock_depart["5L"]*0.5):,} | {int(stock_depart["5L"]*0.3):,} | {int(stock_depart["5L"]*0.2):,} |
| **10 Litres** | {IMPLANTATION_TYPE["10L"]["qty"]} Unités (Test) | **{stock_depart["10L"]:,} Unités** | {int(stock_depart["10L"]*0.5):,} | {int(stock_depart["10L"]*0.3):,} | {int(stock_depart["10L"]*0.2):,} |

> **💡 RECOMMANDATION PRODUCTION :** Lancer une production de **{stock_depart["3L"] + 500} unités de 3L** (sécurité) avant le top départ commercial.

---

## 2. 💰 SIMULATION DES VENTES MENSUELLES (SCÉNARIO RÉALISTE)
*Hypothèse : Montée en puissance progressive du taux de pénétration (50% -> 85%).*

| MIEUX (Mois) | POS Actifs | Vol. 3L (u) | Vol. 5L (u) | Vol. 10L (u) | **CA EST. (DZA)** | Marge Brute Est. (~25%) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Mois 1 (Lancement)** | {int(NB_POS_TARGET * TAUX_PENETRATION_M1)} | {q_m1["3L"]:,} | {q_m1["5L"]:,} | {q_m1["10L"]:,} | **{int(ca_m1):,} DA** | {int(ca_m1*0.25):,} DA |
| **Mois 2 (Ancrage)** | {int(NB_POS_TARGET * TAUX_PENETRATION_M2)} | {q_m2["3L"]:,} | {q_m2["5L"]:,} | {q_m2["10L"]:,} | **{int(ca_m2):,} DA** | {int(ca_m2*0.25):,} DA |
| **Mois 3 (Croisière)** | {int(NB_POS_TARGET * TAUX_PENETRATION_M3)} | {q_m3["3L"]:,} | {q_m3["5L"]:,} | {q_m3["10L"]:,} | **{int(ca_m3):,} DA** | {int(ca_m3*0.25):,} DA |

**TOTAL TRIMESTRE (CA CUMULÉ) : {int(ca_m1 + ca_m2 + ca_m3):,} DA**

---

## 3. 🗺️ FEUILLE DE ROUTE COMMERCIALE (ROUTING)

### SEMAINE 1 & 2 : "OPÉRATION COMMANDO" (Dely Ibrahim)
*   **Cible :** 80 POS (Centre Dely Ibrahim + Bois des Cars).
*   **Action :** Déposer le *Pack Implantation* (12x3L + 6x5L + 2x10L).
*   **Argumentaire :** "Testez sur 10 jours. Si ça ne part pas, je reprends." (Risque Zéro).

### SEMAINE 3 : "EXTENSION" (Ouled Fayet)
*   **Cible :** 70 POS (Plateau + Cités AADL).
*   **Action :** Focus sur les format familiaux (5L) très demandés ici (Zones résidentielles denses).

### SEMAINE 4 : "PRESTIGE & VOLUME" (Chéraga)
*   **Cible :** 50 POS (Route de Zouaoua + Centre + Amara).
*   **Action :** Placer le 10L (Grosses villas / Conso élevée).

---

## 4. 📦 BESOINS MATIÈRES SÈCHES (POUR PROD 3 MOIS)
*Pour éviter la rupture en plein lancement (M1 + M2 + M3)*
*   **Bidons 3L :** ~ {q_m1["3L"] + q_m2["3L"] + q_m3["3L"]:,} unités.
*   **Bidons 5L :** ~ {q_m1["5L"] + q_m2["5L"] + q_m3["5L"]:,} unités.
*   **Bidons 10L :** ~ {q_m1["10L"] + q_m2["10L"] + q_m3["10L"]:,} unités.
*   **Etiquettes :** Prévoir +10% de gâche ({int((q_m1["3L"] + q_m2["3L"] + q_m3["3L"])*1.1):,} étiquettes 3L).

"""

with open("PLAN_LANCEMENT_LESSIVE_OLGA.md", "w", encoding="utf-8") as f:
    f.write(md_output)

print("PLAN_LANCEMENT_LESSIVE_OLGA.md généré avec succès.")
