const STATIC_CACHE_NAME = "appshell-v9";
const DYNAMIC_CACHE_NAME = "dynamic-v2";
const ASSETS_TO_CACHE = [
  "/", // La racine (très important !)
  "/index.html", // Le fichier HTML
  "/css/style.css", // Le style
  "/js/app.js", // Le script principal
  "/image/pngimg512x512.png",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installation et mise en cache de l'App Shell");
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Mise en cache des fichiers...");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error("[SW] Echec du pre-caching :", error);
      }),
    // ATTENTION : Pour ce TP, nous ne mettons PAS de self.skipWaiting() ici !
    // Nous voulons observer le comportement d'attente ("waiting") par défaut du navigateur.
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // A. Stratégie NETWORK FIRST pour l'API externe
  if (url.origin === "https://api.goodbarber.net") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // 1. Si le réseau répond, on met à jour le cache
          // Attention : Une réponse ne se lit qu'une fois, il faut la cloner
          const clonedResponse = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return networkResponse;
        })
        .catch((err) => {
          // 2. Si le réseau échoue, on retourne la version en cache
          return caches.match(event.request);
        }),
    );
  }
  // B. Images : Stale-While-Revalidate — détaillé à l'étape 1 bis
  else if (event.request.destination === "image") {
    // Stale-while-revalidate : réponse cache tout de suite, mise à jour en arrière-plan
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchAndCache = fetch(event.request, { mode: "no-cors" }).then(
          (networkResponse) => {
            const copy = networkResponse.clone();
            return caches
              .open(DYNAMIC_CACHE_NAME)
              .then((cache) => cache.put(event.request, copy))
              .then(() => networkResponse);
          },
        );
        if (cachedResponse) {
          console.log("[SW] Image SWR — cache (stale), revalidate en fond");
          return cachedResponse;
        }
        return fetchAndCache.catch(() => {
          console.log("[SW] Image — pas de cache, réseau indisponible");
          // (Optionnel) retourner une image placeholder
        });
      }),
    );
  }
  // C. Stratégie CACHE FIRST (App Shell & Assets) - Code du TP3 + fallback
  else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          return response;
        }
        // Si pas dans le cache, on tente le réseau
        return fetch(event.request).catch((error) => {
          // Si le réseau échoue (Offline)
          // On vérifie si la requête demandait une page HTML
          if (event.request.headers.get("accept").includes("text/html")) {
            // On retourne la page offline du cache statique
            return caches.match("/offline.html");
          }
          // (Optionnel) Ici on pourrait retourner une image placeholder par défaut
          // si c'était une image qui échouait.
        });
      }),
    );
  }
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activation et nettoyage...");
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log("[SW] Suppression du vieux cache :", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      // Prise de contrôle après nettoyage (évite une race condition avec d’anciennes réponses)
      .then(() => self.clients.claim()),
  );
});
