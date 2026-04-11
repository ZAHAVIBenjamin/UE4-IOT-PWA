import serial
import json
import requests
import serial.tools.list_ports
import time


URL_API = "http://zahavi.benjamin-ue4.aflokkat-projet.fr/save.php"

ENTETES = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def trouver_arduino():
    """Cherche automatiquement le port de l'Arduino."""
    ports = list(serial.tools.list_ports.comports())
    for p in ports:
        # On cherche "Arduino" ou "USB Serial" dans la description
        if "Arduino" in p.description or "USB Serial" in p.description or "CH340" in p.description:
            return p.device
    return 'COM6'

# --- CONNEXION SÉRIE ---
port_detecte = trouver_arduino()
try:
    ser = serial.Serial(port_detecte, 9600, timeout=1)
    print(f"✅ Connecté à l'Arduino sur {port_detecte}")
    # Petit temps de pause pour laisser l'Arduino redémarrer après la connexion
    time.sleep(2) 
except Exception as e:
    print(f"❌ Erreur : Impossible d'ouvrir le port {port_detecte}. ({e})")
    exit()

# --- BOUCLE PRINCIPALE ---
print("🚀 En attente de données de l'Arduino...")

while True:
    try:
        if ser.in_waiting > 0:
            # Lecture de la ligne envoyée par l'Arduino
            ligne = ser.readline().decode('utf-8').strip()
            
            # Vérification si c'est bien du JSON
            if ligne.startswith('{') and ligne.endswith('}'):
                try:
                    donnees = json.loads(ligne)
                    print(f"\n[Arduino] : {donnees}")

                    # Envoi des données au serveur via POST
                    # On envoie 'nbFeuRouge' car c'est ce que ton PHP attend
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
                        # Si tu as encore un 403, le contenu s'affichera ici
                        if reponse.status_code == 403:
                            print("Blocage TigerProtect/WAF détecté.")

                except json.JSONDecodeError:
                    print(f"❓ Format reçu inconnu : {ligne}")
                except Exception as e:
                    print(f"❌ Erreur lors de l'envoi : {e}")
                    
    except KeyboardInterrupt:
        print("\nArrêt du script.")
        ser.close()
        break
    except Exception as e:
        print(f"Une erreur est survenue : {e}")
        time.sleep(1)