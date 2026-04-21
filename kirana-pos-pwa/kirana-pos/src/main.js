import "./styles/variables.css";
import "./styles/main.css";
import { navigate } from "./app";
import { getNetworkStatus } from "./utils/network";
import { updateSyncStatus } from "./utils/syncStatus";
import "./styles/theme.css";
import "./styles/pages/openingStock.css";
import "./styles/features/auditlog.css";
import { initSyncListener, syncPending } from "./services/syncService";

// ✅ Register online listener + 60s poll + startup sync
initSyncListener();





/* ===============================
   NETWORK HANDLING
=============================== */

async function handleNetworkChange() {
  const online = navigator.onLine;

  // Update both legacy utils and the new Layout status bar
  const { updateNetworkBadge } = await import("./components/Layout.js");
  updateNetworkBadge(online);

  const networkEl = document.getElementById("network-status");

  if (networkEl) {
    networkEl.textContent = getNetworkStatus();
    networkEl.className = online
      ? "network-status online"
      : "network-status offline";
  }

  if (!online) {

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

// navigate() is fully auth-aware: it renders login/welcome/layout as needed.
// We must NOT pre-render the layout here — that causes double-nesting + auth bypass.
window.addEventListener("load", async () => {
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
