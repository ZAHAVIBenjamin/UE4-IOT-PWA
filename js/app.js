// GESTION DE LA PWA (Installation et Service Worker)

let invitationInstallation;
const boutonInstallation = document.getElementById("install-btn");

// Cacher le bouton si l'app est déjà installée ou en mode standalone
if (
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true
) {
  if (boutonInstallation) boutonInstallation.classList.add("hidden");
}

// Intercepter la demande d'installation
window.addEventListener("beforeinstallprompt", (evenement) => {
  evenement.preventDefault();
  invitationInstallation = evenement;
  if (boutonInstallation) boutonInstallation.classList.remove("hidden");
  console.log("[PWA] L'événement beforeinstallprompt a été intercepté.");
});

// Gérer le clic sur le bouton d'installation
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

// Message de confirmation d'installation
window.addEventListener("appinstalled", () => {
  console.log("[PWA] Application installée avec succès !");
});

// Enregistrement du Service Worker et gestion des mises à jour
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

//  Données

// Rôle : Parler avec le serveur et ramener les données brutes
async function recupererHistoriqueFeux() {
  try {
    // Attention: Remettre http:// si tu testes en local sans certificat SSL
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

// CONTRÔLEUR

// Transformer les données brutes en données par jour
function organiserDonneesParJour(donneesBrutes) {
  const joursGroupes = {};

  donneesBrutes.forEach((ligne) => {
    if (ligne.date_enregistrement) {
      // Séparation de la date ("2026-04-10") et de l'heure ("11:30:23")
      const [date, heure] = ligne.date_enregistrement.split(" ");

      // Initialisation du jour s'il n'existe pas encore
      if (!joursGroupes[date]) {
        joursGroupes[date] = { total: 0, heures: [] };
      }

      // Ajout des informations
      joursGroupes[date].total += 1;
      joursGroupes[date].heures.push(heure);
    }
  });

  return joursGroupes;
}

// VUES

const zoneContenu = document.getElementById("content");

// Tableau des feux rouges
function afficherTableauBord(donnees) {
  if (!donnees) {
    zoneContenu.innerHTML =
      "<p style='color: red;'>Impossible de charger l'historique des feux.</p>";
    return;
  }

  // S'il n'y a pas de données du tout
  if (Object.keys(donnees).length === 0) {
    zoneContenu.innerHTML = `
      <h2>Tableau de bord - Feux Rouges 🚦</h2>
      <p>Aucun feu rouge enregistré pour le moment.</p>
    `;
    return;
  }

  // Création de l'en-tête du tableau
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

  // Création des lignes du tableau
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

  // Injection dans la page
  zoneContenu.innerHTML = codeHTML;
}

// Afficher la page d'administration

// Envoyer ordre au serveur
async function forcerFeuRouge() {
  try {
    const reponse = await fetch(
      "https://zahavi.benjamin-ue4.aflokkat-projet.fr/send_command.php",
    );
    const data = await reponse.json();
    if (data.success) {
      alert("✅ Ordre 'Forcer le rouge' envoyé avec succès !");
    }
  } catch (e) {
    alert("❌ Erreur de communication avec le serveur.");
  }
}

function pageAdmin() {
  zoneContenu.innerHTML = `
    <h2>ADMINISTRATION ⚙️</h2>
    <p>Gérez les paramètres de votre système Arduino.</p>
    <div class="admin-actions">
      <button onclick="forcerFeuRouge()">Forcer le rouge</button>
      <button onclick="alert('Fonctionnalité à venir !')">Accès config</button>
      <button onclick="alert('Fonctionnalité à venir !')">Diagnostique</button>
    </div>
  `;
}

// 5. ROUTAGE ET ORCHESTRATION

// Le chef d'orchestre de la page d'accueil
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

// Système de navigation
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
  pageAccueil();
});
