import serial
import json
import requests
import serial.tools.list_ports
import time

URL_API = "http://zahavi.benjamin-ue4.aflokkat-projet.fr/save.php"
URL_CMD = "http://zahavi.benjamin-ue4.aflokkat-projet.fr/get_command.php"
URL_CONFIG = "http://zahavi.benjamin-ue4.aflokkat-projet.fr/get_config.php"

ENTETES = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def trouver_arduino():
    """Cherche automatiquement le port de l'Arduino."""
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        if "Arduino" in p.description or "USB Serial" in p.description or "CH340" in p.description:
            return p.device
    return 'COM7'

port_detecte = trouver_arduino()
try:
    ser = serial.Serial(port_detecte, 9600, timeout=1)
    print(f"✅ Connecté à l'Arduino sur {port_detecte}")
    time.sleep(2) 
except Exception as e:
    print(f"❌ Erreur : Impossible d'ouvrir le port {port_detecte}. ({e})")
    exit()

# --- INITIALISATION ---
print("🚀 En attente de données de l'Arduino et écoute des commandes Serveur...")
temps_dernier_check = time.time()

# On crée une variable pour mémoriser la dernière configuration envoyée
derniere_config = "" 

# --- BOUCLE PRINCIPALE ---
while True:
    try:
        # 1. ÉCOUTE DE L'ARDUINO (Réception des feux rouges)
        if ser.in_waiting > 0:
            ligne = ser.readline().decode('utf-8').strip()
            
            if ligne.startswith('{') and ligne.endswith('}'):
                try:
                    donnees = json.loads(ligne)
                    print(f"\n[Arduino] : {donnees}")

                    reponse = requests.post(
                        URL_API, 
                        data={'nbFeuRouge': donnees['nbFeuRouge']}, 
                        headers=ENTETES,
                        timeout=5
                    )
                    
                    if reponse.status_code == 200:
                        print(f"☁️  [Serveur] : {reponse.text.strip()}")
                    else:
                        print(f"⚠️  [Serveur] : Erreur {reponse.status_code}")

                except json.JSONDecodeError:
                    print(f"❓ Format reçu inconnu : {ligne}")
                except Exception as e:
                    print(f"❌ Erreur lors de l'envoi : {e}")

        # 2. ÉCOUTE DU SERVEUR (Toutes les 5 secondes)
        if time.time() - temps_dernier_check > 5:
            temps_dernier_check = time.time()
            
            # --- A. Vérification de l'ordre "Forcer le Rouge" ---
            try:
                reponse_cmd = requests.get(URL_CMD, timeout=5)
                if reponse_cmd.status_code == 200:
                    donnees_cmd = reponse_cmd.json()
                    if donnees_cmd.get("commande") == "FORCE_ROUGE":
                        print("⚡ [Serveur] : Ordre FORCE_ROUGE reçu ! Envoi 'R' à l'Arduino...")
                        ser.write(b"R\n") 
            except Exception as e:
                pass # On ignore silencieusement si la requête échoue ponctuellement
                
            # --- B. Vérification de la Configuration ---
            try:
                reponse_config = requests.get(URL_CONFIG, timeout=5)
                if reponse_config.status_code == 200:
                    config_data = reponse_config.json()
                    
                    if "dfr" in config_data and "melodie" in config_data:
                        # On formate le message comme ceci : C:5000:A
                        nouvelle_config = f"C:{config_data['dfr']}:{config_data['melodie']}"
                        
                        # Si la config a changé depuis la dernière fois
                        if nouvelle_config != derniere_config:
                            print(f"⚙️ [Serveur] : Nouvelle configuration détectée ! Envoi à l'Arduino -> {nouvelle_config}")
                            # On envoie la chaîne à l'Arduino en rajoutant un retour à la ligne (\n)
                            ser.write(f"{nouvelle_config}\n".encode('utf-8'))
                            # On met à jour la mémoire locale
                            derniere_config = nouvelle_config
            except Exception as e:
                pass # On ignore silencieusement

    except KeyboardInterrupt:
        print("\nArrêt du script.")
        ser.close()
        break
    except Exception as e:
        print(f"Une erreur générale est survenue : {e}")
        time.sleep(1)