import requests
import csv
import io
import re
import os

# --- CONFIGURATION ---
URL_SHEET = "https://docs.google.com/spreadsheets/d/192P12Vs7FN8AyWYgFmo5mZ2phR2lSWixxtXuPgBebs8/export?format=csv"
HTML_FILE = "e:\\ANTIGRAVITY\\OLGA MKT\\dashboard_olga_global.html"

# Mapping Images & Recommandations (Clé: Produit + Format)
METADATA = {
    ("Lessive Machine", "10 L"): {
        "img": "./Photos/OLGA PACKSHOT/Gel lessive 10 L.jpeg",
        "reco": "Cible Pro. Panier élevé. À pousser zones rurales.",
        "style_reco": "color:#d35400; font-size:0.85rem;"
    },
    ("Lessive Machine", "5 L"): {
        "img": "",  # Pas d'image 5L dispo? Si, "Gel vaisselle 5L"? Non lessive.
        "reco": "Format de transition.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Lessive Machine", "3 L"): {
        "img": "", # Placeholder ?
        "reco": "PRODUIT D'APPEL. Marge Détaillant record (+110 DA).",
         "style_reco": "color:#c0392b; font-weight:bold; font-size:0.85rem;"
    },
    ("Détachant Textiles", "750 ML"): {
        "img": "./Photos/OLGA PACKSHOT/Détachant linge tapis 750 ml.jpeg",
        "reco": "Vente additionnelle systématique (Cross-sell).",
        "style_reco": "font-size:0.85rem;"
    },
    ("Gel Vaisselle", "5 L"): {
        "img": "./Photos/OLGA PACKSHOT/Gel vaisselle 5L.jpeg",
        "reco": "Pour familles nombreuses et Snacks.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Gel Vaisselle", "2 L"): {
        "img": "./Photos/OLGA PACKSHOT/Gel Vaissele 2 L.jpeg",
        "reco": "Alternative économique au 3L d'Isis.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Gel Vaisselle", "750 ML"): {
        "img": "./Photos/OLGA PACKSHOT/Gel Vaisselle 750 ml.jpeg",
        "reco": "ARME ANTI-CONCURRENCE. Prix imbattable. Marge +80%.",
        "style_reco": "color:#c0392b; font-weight:bold; font-size:0.85rem;"
    },
    ("Dégraissant Cuisine", "750 ML"): {
        "img": "./Photos/OLGA PACKSHOT/Dégraissant 750 ml.jpeg",
        "reco": "Produit technique. À placer à côté du liquide vaisselle Isis.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Nettoyant Sol", "1 L"): {
        "img": "./Photos/OLGA PACKSHOT/Lave Sol 1 L.jpeg",
        "reco": "Prix psychologique bas. Achat d'impulsion.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Sanibon", "5 L"): {
        "img": "./Photos/OLGA PACKSHOT/Sanibon 5 L.jpeg",
        "reco": "Volume énorme pour prix dérisoire. Remplit le caddie.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Multi-Surfaces", "750 ML"): {
        "img": "./Photos/OLGA PACKSHOT/Multi-Surfaces 750 ml.jpeg",
        "reco": "Alternative crédible à Force Express.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Anti-Calcaire", "750 ML"): {
        "img": "./Photos/OLGA PACKSHOT/Anti-calcaire 750 ml.jpeg",
        "reco": "Niche indispensable. Marge confortable.",
        "style_reco": "font-size:0.85rem;"
    },
    ("VAYA Vitres", "500 ML"): {
        "img": "./Photos/OLGA PACKSHOT/lave vitre Vaya.jpeg",
        "reco": "Entrée de gamme efficace.",
        "style_reco": "font-size:0.85rem;"
    },
    ("Savon Mains", "5 L"): {
        "img": "./Photos/OLGA PACKSHOT/Savon liquide  mains 5 L.jpeg",
        "reco": "Produit de commodité pour gros consommateurs.",
        "style_reco": "font-size:0.85rem;"
    }
}

def fetch_csv():
    print(f"Téléchargement du CSV depuis {URL_SHEET}...")
    try:
        response = requests.get(URL_SHEET)
        response.raise_for_status()
        content = response.content.decode('utf-8')
        return list(csv.reader(io.StringIO(content)))
    except Exception as e:
        print(f"Erreur téléchargement: {e}")
        return None

def generate_html_rows(csv_data):
    html_rows = []
    # Ignorer header si présent (détection simple)
    start_row = 1 if "Gamme" in csv_data[0] or "Produit" in csv_data[0] else 0
    
    current_gamme = ""
    
    for row in csv_data[start_row:]:
        # Mapping CSV Colonnes (selon structure attendue ou supposée)
        # On suppose que le CSV a les colonnes dans l'ordre:
        # Gamme, Produit, Colis., Format, Caract., Prix Usine, Prix/L, Distri, Launch, SupA, SupB, Epicerie, Public
        # Si le CSV est différent, il faudra adapter ici.
        # Pour l'instant, on mappe dynamiquement ou on prend par index si possible.
        
        # Securité index
        if len(row) < 5: continue
        
        gamme = row[0]
        produit = row[1]
        colis = row[2] if len(row) > 2 else "-"
        format_prod = row[3] if len(row) > 3 else "-"
        carac = row[4] if len(row) > 4 else "-"
        p_usine = row[5] if len(row) > 5 else "-"
        p_litre = row[6] if len(row) > 6 else "-"
        p_distri = row[7] if len(row) > 7 else "-"
        p_launch = row[8] if len(row) > 8 else "-"
        sup_a = row[9] if len(row) > 9 else "-"
        sup_b = row[10] if len(row) > 10 else "-"
        epicerie = row[11] if len(row) > 11 else "-"
        p_public = row[12] if len(row) > 12 else "-"

        # Metadata Look-up
        meta = METADATA.get((produit.strip(), format_prod.strip()), {
            "img": "", "reco": "", "style_reco": ""
        })
        
        # Gestion En-tête de Gamme
        if gamme != current_gamme and gamme:
            html_rows.append(f'<tr style="background-color: #eaf2f8;"><td colspan="15"><strong>📦 GAMME {gamme.upper()}</strong></td></tr>')
            current_gamme = gamme

        # Image Tag
        img_tag = f'<img src="{meta["img"]}" class="packshot-img" style="height:50px;">' if meta["img"] else "-"
        
        # Row HTML
        bg_style = 'style="background-color: #fff3e0;"' if "STAR" in carac or "PRODUIT D'APPEL" in meta['reco'] else ""
        
        row_html = f"""
        <tr {bg_style}>
            <td>{gamme}</td>
            <td><strong>{produit}</strong></td>
            <td>{colis}</td>
            <td>{format_prod}</td>
            <td>{carac}</td>
            <td>{img_tag}</td>
            <td>{p_usine}</td>
            <td>{p_litre}</td>
            <td>{p_distri}</td>
            <td><strong>{p_launch}</strong></td>
            <td>{sup_a}</td>
            <td>{sup_b}</td>
            <td>{epicerie}</td>
            <td>{p_public}</td>
            <td style="{meta['style_reco']}">{meta['reco']}</td>
        </tr>
        """
        html_rows.append(row_html)
        
    return "\n".join(html_rows)

def update_dashboard():
    csv_data = fetch_csv()
    if not csv_data: return

    # Lire HTML actuel
    with open(HTML_FILE, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Générer nouvelles lignes
    new_tbody_content = generate_html_rows(csv_data)
    
    # Remplacer le contenu du premier tbody du catalogue
    # On cherche le tbody qui est après "Catalogue Produits"
    
    # Regex pour trouver le tbody du tableau catalogue
    # On sait qu'il contient "Gamme", "Produit" dans le thead juste avant.
    
    # On remplace tout le contenu entre <tbody> et </tbody> du PREMIER tableau trouvé après l'ID "Catalogue"
    pattern = r'(<div id="Catalogue".*?<table>.*?<tbody>)(.*?)(</tbody>)'
    
    # Note: re.DOTALL permet au . de matcher les nouvelles lignes
    match = re.search(pattern, html_content, re.DOTALL)
    
    if match:
        new_html = html_content[:match.start(2)] + "\n" + new_tbody_content + "\n" + html_content[match.end(2):]
        
        with open(HTML_FILE, "w", encoding="utf-8") as f:
            f.write(new_html)
        print("✅ Dashboard mis à jour avec succès !")
    else:
        print("❌ Impossible de trouver le tableau Catalogue dans le HTML.")

if __name__ == "__main__":
    update_dashboard()
