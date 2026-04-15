const STATIC_CACHE_NAME = "appshell-v1.1.3";
const DYNAMIC_CACHE_NAME = "dynamic-v1.1.3";

// Liste des fichiers indispensables pour que l'app s'affiche sans internet
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/css/style.css",
  "/js/app.js",
  "/image/web-app-manifest-192x192.png",
  "https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap",
  "/offline.html",
];

self.addEventListener("install", (event) => {
  console.log("[SW] Installation et mise en cache de l'App Shell (v1)");
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Mise en cache des fichiers statiques...");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch((error) => {
        console.error("[SW] Echec du pre-caching :", error);
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Stratégie NETWORK FIRST

  if (
    url.origin.includes("aflokkat-projet.fr") &&
    url.pathname.includes(".php")
  ) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // 1. Si internet marche, on met à jour le cache dynamique
          const clonedResponse = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(event.request, clonedResponse);
          });
          return networkResponse;
        })
        .catch((err) => {
          // 2. Si on est hors ligne, on affiche les dernières données connues !
          console.log(
            "[SW] Mode hors ligne : récupération des données API en cache",
          );
          return caches.match(event.request);
        }),
    );
  }

  // Stratégie STALE-WHILE-REVALIDATE : Pour les images
  else if (event.request.destination === "image") {
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
          return cachedResponse;
        }
        return fetchAndCache.catch(() => {
          console.log("[SW] Image — pas de cache, réseau indisponible");
        });
      }),
    );
  }

  // Stratégie CACHE FIRST : Pour l'App Shell (HTML, CSS, JS)
  else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // 1. On cherche d'abord dans le cache statique
        if (response) {
          return response;
        }
        // 2. Sinon on tente de le télécharger
        return fetch(event.request).catch((error) => {
          // 3. Si on est hors ligne ET qu'on cherche une page web, on affiche offline.html
          if (event.request.headers.get("accept").includes("text/html")) {
            return caches.match("/offline.html");
          }
        });
      }),
    );
  }
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activation et nettoyage des vieux caches...");
  const cacheWhitelist = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log("[SW] Suppression de l'ancien cache :", cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => self.clients.claim()),
  );
});
