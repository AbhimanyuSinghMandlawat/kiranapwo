// SERVICE WORKER
// ENABLED ONLY IN PRODUCTION
// SAFE FOR DEVELOPMENT

const CACHE_NAME = "kirana-pos-prod-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // DO NOTHING IN DEV
});