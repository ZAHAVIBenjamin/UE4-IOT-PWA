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
        if "Arduino" in p.description or "USB Serial" in p.description or "CH340" in p.description:
            return p.device
    return 'COM6'

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
print("🚀 En attente de données de l'Arduino et écoute des commandes Serveur...")

temps_dernier_check = time.time()

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


        # 2. ÉCOUTE DU SERVEUR (Vérification des ordres de la PWA)

        # On vérifie toutes les 5 secondes pour ne pas spammer le serveur
        if time.time() - temps_dernier_check > 5:
            temps_dernier_check = time.time()
            
            reponse_cmd = requests.get("http://zahavi.benjamin-ue4.aflokkat-projet.fr/get_command.php", timeout=5)
            
            if reponse_cmd.status_code == 200:
                donnees_cmd = reponse_cmd.json()
                
                # Si on trouve un ordre "FORCE_ROUGE" en attente
                if donnees_cmd.get("commande") == "FORCE_ROUGE":
                    print("⚡ [Serveur] : Ordre reçu ! Envoi à l'Arduino...")
                    # On envoie la lettre 'R' (suivie d'un retour à la ligne) à l'Arduino
                    ser.write(b"R\n") 
                    
    except KeyboardInterrupt:
        print("\nArrêt du script.")
        ser.close()
        break
    except Exception as e:
        print(f"Une erreur est survenue : {e}")
        time.sleep(1)