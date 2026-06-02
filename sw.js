/* 大阪自由行 — Service Worker：離線可用 + 地圖底圖快取 */
const APP_CACHE = "osaka-trip-v17";
const TILE_CACHE = "osaka-tiles-v17";

const APP_SHELL = [
  "./",
  "./index.html",
  "./emergency.html",
  "./transit-map.html",
  "./manifest.webmanifest",
  "./assets/tiles-manifest.json",
  "./assets/js/walk-routes.js",
  "./assets/css/style.css",
  "./assets/js/data.js",
  "./assets/js/app.js",
  "./assets/vendor/leaflet/leaflet.js",
  "./assets/vendor/leaflet/leaflet.css",
  "./assets/vendor/leaflet/images/marker-icon.png",
  "./assets/vendor/leaflet/images/marker-icon-2x.png",
  "./assets/vendor/leaflet/images/marker-shadow.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(APP_CACHE)
      .then((c) => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
  // 背景預先快取所有離線圖磚（不阻擋安裝）
  precacheTiles();
});

async function precacheTiles() {
  try {
    const res = await fetch("./assets/tiles-manifest.json");
    if (!res.ok) return;
    const list = await res.json();
    const cache = await caches.open(APP_CACHE);
    // 分批快取，避免一次過多請求
    for (let i = 0; i < list.length; i += 30) {
      const batch = list.slice(i, i + 30);
      await Promise.all(batch.map((u) =>
        cache.match(u).then((hit) => hit || fetch(u).then((r) => r.ok && cache.put(u, r)).catch(() => {}))
      ));
    }
  } catch (e) { /* 離線或失敗時略過 */ }
}

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== APP_CACHE && k !== TILE_CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // 地圖底圖（線上回退）+ 外部引用的交通圖：cache-first，載過就離線可看
  if (/tile\.openstreetmap\.org$/.test(url.hostname) || /basemaps\.cartocdn\.com$/.test(url.hostname) || /\.wp\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(TILE_CACHE).then(async (cache) => {
        const hit = await cache.match(e.request);
        if (hit) return hit;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch (err) {
          return hit || Response.error();
        }
      })
    );
    return;
  }

  // App 資源：cache-first，回退網路
  if (e.request.method === "GET" && url.origin === location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(APP_CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match("./index.html")))
    );
  }
});
