let deferredPrompt;

const installBtn = document.getElementById("install-btn");

// caché boutton si deja installer
if (
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true
) {
  installBtn.classList.add("hidden");
}
// verifie si on doit afficher le bouton de telechargement
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  installBtn.classList.remove("hidden");
  console.log(`[PWA] L'evenement beforeinstallprompt a été intercepté.`);
});
// installation de l'app sur choix d'utilisateur
installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] Choix de l'utilisteur : ${outcome}`);

  deferredPrompt = null;

  installBtn.classList.add("hidden");
});

// message de confirmation d'installation
window.addEventListener("appinstalled", () => {
  console.log(`[PWA] App installé avec succes ! `);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Cas 1 : une nouvelle version vient d'être détectée pendant cette session
      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          // Installé mais pas encore actif → état « waiting »
          if (
            newWorker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            showUpdateNotification(newWorker);
          }
        });
      });
      // Cas 1 bis : vous avez rafraîchi sans cliquer sur « Mettre à jour ».
      // updatefound ne repasse pas : le SW en attente est dans
      reg.waiting;
      if (reg.waiting) {
        showUpdateNotification(reg.waiting);
      }
    });
    // Après skipWaiting, le contrôleur change — une seule inscription ici (pas dans updatefound)
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });
  });
}

function showUpdateNotification(worker) {
  const notif = document.getElementById("update-notification");
  const btn = document.getElementById("reload-btn");

  // On ajoute la classe "show" pour déclencher l'animation CSS
  notif.classList.add("show");

  // { once: true } assure que l'événement n'est déclenché qu'une seule fois
  btn.addEventListener(
    "click",
    () => {
      // 1. Envoyer l'ordre au Service Worker de s'activer
      worker.postMessage({ action: "skipWaiting" });

      // 2. Cacher la notification en retirant la classe
      notif.classList.remove("show");
    },
    { once: true },
  );
}

const contentDiv = document.getElementById("content");

async function pageAccueil() {
  const contentDiv = document.getElementById("content");

  contentDiv.innerHTML = `
    <h2>Tableau de bord - Feux Rouges 🚦</h2>
    <p>Historique des derniers déclenchements détectés par le capteur.</p>
    <div id="tableau-donnees"><p>Chargement des données en cours...</p></div>
  `;

  try {
    const response = await fetch(
      "https://zahavi.benjamin-ue4.aflokkat-projet.fr/get_data.php",
    );

    if (!response.ok) throw new Error("Erreur réseau");
    const data = await response.json();

    if (data.erreur) {
      document.getElementById("tableau-donnees").innerHTML =
        `<p style="color: red;">Erreur serveur : ${data.erreur}</p>`;
      return;
    }

    if (data.length === 0) {
      document.getElementById("tableau-donnees").innerHTML =
        "<p>Aucune donnée enregistrée pour le moment.</p>";
      return;
    }

    // --- LE CERVEAU DE LA PWA : On regroupe par jour ---
    const joursGroupes = {};

    data.forEach((ligne) => {
      if (ligne.date_enregistrement) {
        // On sépare "2026-04-10 11:30:23" en deux morceaux
        const [datePart, heurePart] = ligne.date_enregistrement.split(" ");

        // Si le jour n'existe pas encore dans notre liste, on le crée
        if (!joursGroupes[datePart]) {
          joursGroupes[datePart] = { total: 0, heures: [] };
        }

        // On ajoute +1 au total et on sauvegarde l'heure exacte
        joursGroupes[datePart].total += 1;
        joursGroupes[datePart].heures.push(heurePart);
      }
    });

    // --- CONSTRUCTION DU TABLEAU ---
    let tableHTML = `
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

    // On parcourt nos données regroupées pour créer les lignes
    for (const [date, infos] of Object.entries(joursGroupes)) {
      // On met en forme les heures comme de petites "étiquettes" (badges)
      const heuresHTML = infos.heures
        .map(
          (h) =>
            `<span style="background: #e2e8f0; padding: 3px 6px; border-radius: 4px; font-size: 0.85em; margin: 2px; display: inline-block; color: #1e293b;">${h}</span>`,
        )
        .join("");

      tableHTML += `
        <tr>
          <td><strong>${date}</strong></td>
          <td style="text-align: center; color: #d9534f; font-size: 1.1em;"><strong>${infos.total}</strong></td>
          <td>${heuresHTML}</td>
        </tr>
      `;
    }

    tableHTML += `
        </tbody>
      </table>
    `;

    document.getElementById("tableau-donnees").innerHTML = tableHTML;
  } catch (e) {
    console.error("Erreur:", e);
    document.getElementById("tableau-donnees").innerHTML =
      "<p style='color: red;'>Impossible de charger l'historique.</p>";
  }
}
// Une nouvelle vue statique
function pageAdmin() {
  contentDiv.innerHTML = `
    <h2>ADMINISTRATION ⚙️</h2>
    <p>Gérez les paramètres de votre système Arduino.</p>
    <div class="admin-actions">
      <button onclick="alert('Fonctionnalité à venir !')">Forcer le rouge</button>
      <button onclick="alert('Fonctionnalité à venir !')">Accès config</button>
      <button onclick="alert('Fonctionnalité à venir !')">Diagnostique</button>
    </div>
  `;
}

const routes = {
  "/": pageAccueil,
  "/ADMINISTRATION": pageAdmin,
};

function navigate(path) {
  // 1. Change l'URL dans la barre d'adresse sans recharger
  window.history.pushState({}, "", path);

  // 2. Appelle la fonction correspondante
  routes[path]();
}

// On rend les fonctions accessibles au HTML
window.navigate = navigate;
window.pageAccueil = pageAccueil;
window.pageAdmin = pageAdmin;

// On lance la page d'accueil au chargement initial
document.addEventListener("DOMContentLoaded", () => {
  pageAccueil();
});
