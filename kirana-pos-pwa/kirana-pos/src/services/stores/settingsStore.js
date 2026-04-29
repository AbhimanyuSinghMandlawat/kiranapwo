import { openDB } from "./core";

export async function completeOnboarding() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({
      id: "system",
      onboardingCompleted: true,
      date: Date.now()
    });
    tx.oncomplete = resolve;
  });
}

export async function isOnboardingCompleted() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readonly");
    const req = tx.objectStore("settings").get("system");
    req.onsuccess = () => resolve(req.result?.onboardingCompleted === true);
    req.onerror = () => resolve(false);
  });
}

export async function saveShopSettings(data) {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readwrite");
    tx.objectStore("settings").put({
      id: "shop_config",
      ...data
    });
    tx.oncomplete = resolve;
  });
}

export async function getShopSettings() {
  const db = await openDB();
  return new Promise(resolve => {
    const tx = db.transaction("settings", "readonly");
    const req = tx.objectStore("settings").get("shop_config");
    req.onsuccess = () => resolve(req.result || null);
  });
}
