// GESTION DE LA PWA (Installation et Service Worker)
let invitationInstallation;
const boutonInstallation = document.getElementById("install-btn");

if (
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true
) {
  if (boutonInstallation) boutonInstallation.classList.add("hidden");
}

window.addEventListener("beforeinstallprompt", (evenement) => {
  evenement.preventDefault();
  invitationInstallation = evenement;
  if (boutonInstallation) boutonInstallation.classList.remove("hidden");
  console.log("[PWA] L'événement beforeinstallprompt a été intercepté.");
});

if (boutonInstallation) {
  boutonInstallation.addEventListener("click", async () => {
    if (!invitationInstallation) return;
    invitationInstallation.prompt();
    const { outcome } = await invitationInstallation.userChoice;
    console.log(`[PWA] Choix de l'utilisateur : ${outcome}`);
    invitationInstallation = null;
    boutonInstallation.classList.add("hidden");
  });
}

window.addEventListener("appinstalled", () => {
  console.log("[PWA] Application installée avec succès !");
  if (boutonInstallation) {
    boutonInstallation.classList.add("hidden");
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((enregistrement) => {
      enregistrement.addEventListener("updatefound", () => {
        const nouveauWorker = enregistrement.installing;
        if (!nouveauWorker) return;
        nouveauWorker.addEventListener("statechange", () => {
          if (
            nouveauWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            afficherNotificationMiseAJour(nouveauWorker);
          }
        });
      });

      if (enregistrement.waiting) {
        afficherNotificationMiseAJour(enregistrement.waiting);
      }
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}

function afficherNotificationMiseAJour(worker) {
  const notification = document.getElementById("update-notification");
  const boutonRecharger = document.getElementById("reload-btn");
  if (!notification || !boutonRecharger) return;

  notification.classList.add("show");

  boutonRecharger.addEventListener(
    "click",
    () => {
      worker.postMessage({ action: "skipWaiting" });
      notification.classList.remove("show");
    },
    { once: true },
  );
}

// --- MODÈLE (Données) ---

async function recupererHistoriqueFeux() {
  try {
    const reponse = await fetch(
      "https://zahavi.benjamin-ue4.aflokkat-projet.fr/get_data.php",
    );
    if (!reponse.ok) throw new Error("Erreur réseau");
    return await reponse.json();
  } catch (erreur) {
    console.error("Erreur de récupération des données :", erreur);
    return null;
  }
}

// --- CONTRÔLEUR ---

function organiserDonneesParJour(donneesBrutes) {
  const joursGroupes = {};
  donneesBrutes.forEach((ligne) => {
    if (ligne.date_enregistrement) {
      const [date, heure] = ligne.date_enregistrement.split(" ");
      if (!joursGroupes[date]) {
        joursGroupes[date] = { total: 0, heures: [] };
      }
      joursGroupes[date].total += 1;
      joursGroupes[date].heures.push(heure);
    }
  });
  return joursGroupes;
}

async function forcerFeuRouge() {
  try {
    const reponse = await fetch(
      "https://zahavi.benjamin-ue4.aflokkat-projet.fr/send_command.php?cmd=R",
    );
    const data = await reponse.json();
    if (data.success) {
      alert("✅ Ordre 'Forcer le rouge' envoyé avec succès !");
    }
  } catch (e) {
    console.error(e);
    alert("❌ Commande envoyée (Vérifiez le retour serveur).");
  }
}
window.forcerFeuRouge = forcerFeuRouge;

async function sauvegarderConfig(event) {
  event.preventDefault();

  const dfrValue = document.getElementById("dfr_input").value;
  const melodyValue = document.getElementById("melody_input").value;
  const messageDiv = document.getElementById("config_message");

  messageDiv.innerHTML = "⏳ Envoi en cours...";
  messageDiv.style.color = "orange";

  try {
    const reponse = await fetch(
      "https://zahavi.benjamin-ue4.aflokkat-projet.fr/save_config.php",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `dfr=${dfrValue}&melody=${melodyValue}`,
      },
    );

    if (reponse.ok) {
      messageDiv.innerHTML = "✅ Configuration envoyée au serveur !";
      messageDiv.style.color = "green";
    } else {
      throw new Error("Erreur serveur");
    }
  } catch (erreur) {
    console.error("Erreur Config:", erreur);
    messageDiv.innerHTML = "❌ Impossible de contacter le serveur.";
    messageDiv.style.color = "red";
  }
}

// --- VUES ---

const zoneContenu = document.getElementById("content");

function afficherTableauBord(donnees) {
  if (!donnees) {
    zoneContenu.innerHTML =
      "<p style='color: red;'>Impossible de charger l'historique des feux.</p>";
    return;
  }

  if (Object.keys(donnees).length === 0) {
    zoneContenu.innerHTML = `
      <h2>Tableau de bord - Feux Rouges 🚦</h2>
      <p>Aucun feu rouge enregistré pour le moment.</p>
    `;
    return;
  }

  let codeHTML = `
    <h2>Tableau de bord - Feux Rouges 🚦</h2>
    <p>Historique des derniers feu rouges détectés par le capteur.</p>
    <table class="data-table">
      <thead>
        <tr>
          <th>Date</th>
          <th>Total de feu rouge /(24h)</th>
          <th>Détail des passages</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const [date, infos] of Object.entries(donnees)) {
    const badgesHeures = infos.heures
      .map(
        (heure) =>
          `<span style="background: #e2e8f0; padding: 3px 6px; border-radius: 4px; font-size: 0.85em; margin: 2px; display: inline-block; color: #1e293b;">${heure}</span>`,
      )
      .join("");

    codeHTML += `
      <tr>
        <td><strong>${date}</strong></td>
        <td style="text-align: center; color: #d9534f; font-size: 1.1em;"><strong>${infos.total}</strong></td>
        <td>${badgesHeures}</td>
      </tr>
    `;
  }
  codeHTML += `</tbody></table>`;
  zoneContenu.innerHTML = codeHTML;
}

function afficherConfig() {
  zoneContenu.innerHTML = `
    <h2>⚙️ Paramètres du Système</h2>
    <button onclick="pageAdmin()" style="margin-bottom:20px; padding: 8px 15px; border-radius: 5px; border: 1px solid #ccc; cursor: pointer; background: transparent; color: inherit;">🔙 Retour Admin</button>
    
    <form id="configForm" style="max-width: 400px; margin: 0 auto; background: #e2e8f0; padding: 20px; border-radius: 8px; color: #0f172a; text-align: left; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <div style="margin-bottom: 15px;">
            <label for="dfr_input" style="display:block; margin-bottom:5px; font-weight: bold; color: #0f172a;">Durée du Feu Rouge (en ms) :</label>
            <input type="number" id="dfr_input" value="5000" min="2000" max="15000" step="1000" required style="width: 120px; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; color: #000; font-weight: bold;">
        </div>

        <div style="margin-bottom: 20px;">
            <label for="melody_input" style="display:block; margin-bottom:5px; font-weight: bold; color: #0f172a;">Choix de la Mélodie :</label>
            <select id="melody_input" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #cbd5e1; color: #000;">
                <option value="A">Mélodie A (Ode à la Joie)</option>
                <option value="B">Mélodie B (Alerte Rapide)</option>
                <option value="C">Mélodie C (Mode Silencieux)</option>
            </select>
        </div>

        <button type="submit" style="width: 100%; padding: 12px; background: #1e293b; color: white; border: none; border-radius: 5px; font-weight: bold; cursor: pointer;">Mettre à jour l'Arduino</button>
    </form>
    
    <div id="config_message" style="margin-top: 15px; font-weight: bold; text-align: center;"></div>
  `;

  document
    .getElementById("configForm")
    .addEventListener("submit", sauvegarderConfig);
}

function pageAdmin() {
  zoneContenu.innerHTML = `
    <h2>ADMINISTRATION ⚙️</h2>
    <p>Gérez les paramètres de votre système Arduino.</p>
    <div class="admin-actions">
      <button id="btn-forcer-rouge">Forcer le Rouge</button>
      <button id="btn-config">Accès config</button> 
    </div>
  `;

  document
    .getElementById("btn-forcer-rouge")
    ?.addEventListener("click", forcerFeuRouge);
  document
    .getElementById("btn-config")
    ?.addEventListener("click", afficherConfig);
  document
    .getElementById("btn-diag")
    ?.addEventListener("click", () => alert("Fonctionnalité à venir !"));
}

// --- ROUTAGE ET ORCHESTRATION ---

async function pageAccueil() {
  zoneContenu.innerHTML = `
    <h2>Tableau de bord - Feux Rouges 🚦</h2>
    <p>Chargement des données en cours...</p>
  `;

  const donneesBrutes = await recupererHistoriqueFeux();

  if (donneesBrutes && !donneesBrutes.erreur) {
    const donneesTriees = organiserDonneesParJour(donneesBrutes);
    afficherTableauBord(donneesTriees);
  } else {
    const messageErreur = donneesBrutes
      ? donneesBrutes.erreur
      : "Erreur inconnue";
    zoneContenu.innerHTML = `<p style="color: red;">Erreur serveur : ${messageErreur}</p>`;
  }
}

const routes = {
  "/": pageAccueil,
  "/ADMINISTRATION": pageAdmin,
};

function navigate(chemin) {
  window.history.pushState({}, "", chemin);
  routes[chemin]();
}

window.navigate = navigate;
window.pageAccueil = pageAccueil;
window.pageAdmin = pageAdmin;

document.addEventListener("DOMContentLoaded", () => {
  const cheminActuel = window.location.pathname;

  if (routes[cheminActuel]) {
    routes[cheminActuel]();
  } else {
    pageAccueil();
  }
});

window.addEventListener("popstate", () => {
  const cheminActuel = window.location.pathname;
  if (routes[cheminActuel]) {
    routes[cheminActuel]();
  } else {
    pageAccueil();
  }
});
