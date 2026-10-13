const CACHE = "wedding-wahl-v1";
const DATEIEN = [
  "./", "index.html", "style.css", "app.js", "cloud.js", "firebase-config.js",
  "manifest.json", "icon-180.png", "icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((namen) => Promise.all(namen.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Nur eigene Dateien und die Firebase-Bibliotheken zwischenspeichern.
// Datenverkehr zu Firestore und Anmeldung läuft immer direkt.
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const eigene = url.origin === self.location.origin;
  const bibliothek = url.hostname === "www.gstatic.com" && url.pathname.indexOf("/firebasejs/") === 0;
  if (!eigene && !bibliothek) return;
  e.respondWith(
    fetch(e.request)
      .then((antwort) => {
        if (antwort && antwort.ok) {
          const kopie = antwort.clone();
          caches.open(CACHE).then((c) => c.put(e.request, kopie));
        }
        return antwort;
      })
      .catch(() => caches.match(e.request))
  );
});
