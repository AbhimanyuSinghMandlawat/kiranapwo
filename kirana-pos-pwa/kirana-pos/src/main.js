import "./styles/variables.css";
import "./styles/main.css";
import { navigate } from "./app";
import { getNetworkStatus } from "./utils/network";
import { updateSyncStatus } from "./utils/syncStatus";
import "./styles/theme.css";
import "./styles/pages/openingStock.css";
import { syncPending } from "./services/syncService";




/* ===============================
   NETWORK HANDLING
=============================== */

function handleNetworkChange() {
  const page = location.hash.replace("#", "") || "dashboard";

  const networkEl = document.getElementById("network-status");

  if (networkEl) {
    networkEl.textContent = getNetworkStatus();
    networkEl.className = navigator.onLine
      ? "network-status online"
      : "network-status offline";
  }

  if (!navigator.onLine) {

    updateSyncStatus("offline");

  } else {

    updateSyncStatus("syncing");

    // 🔵 RUN SYNC ENGINE
    syncPending();

    setTimeout(() => {

      const time = new Date().toLocaleTimeString();

      localStorage.setItem("lastSyncTime", time);

      updateSyncStatus("synced", time);

    }, 1000);

  }

}

// Listen for online/offline changes
window.addEventListener("online", handleNetworkChange);
window.addEventListener("offline", handleNetworkChange);

/* ===============================
   APP START
=============================== */

// Start app from current hash or default dashboard
window.addEventListener("load", async () => {
  const app = document.getElementById("app");

  // render empty layout shell once
  const { renderLayout } = await import("./components/Layout");
  app.innerHTML = await renderLayout("");

  const page = location.hash.replace("#", "") || "dashboard";
  await navigate(page);
});


// Initial network status setup
setTimeout(handleNetworkChange, 0);

/* ===============================
   SERVICE WORKER (PROD ONLY)
=============================== */

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js");
}
