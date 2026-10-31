/* 简易离线缓存：安装时缓存全部静态资源，之后缓存优先、网络回退。
 * 更新资源时递增 CACHE_VERSION 即可让旧缓存失效。 */
var CACHE_VERSION = "bazi-v2";
var ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/analysis.js",
  "./js/synastry.js",
  "./js/naming.js",
  "./js/celebs.js",
  "./lib/lunar.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) { return cache.addAll(ASSETS); }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE_VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      if (hit) return hit;
      return fetch(e.request).then(function (resp) {
        // 同源响应顺带入缓存，保持离线完整
        if (resp.ok && new URL(e.request.url).origin === self.location.origin) {
          var clone = resp.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(e.request, clone); });
        }
        return resp;
      });
    })
  );
});
