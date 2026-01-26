import "./styles/variables.css";
import "./styles/main.css";
import { navigate } from "./app";
import { getNetworkStatus } from "./utils/network";
import { updateSyncStatus } from "./utils/syncStatus";
import { seedDefaultStock } from "./services/db";

/* ===============================
   NETWORK HANDLING
=============================== */
function handleNetworkChange() {
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
    setTimeout(() => {
      const time = new Date().toLocaleTimeString();
      localStorage.setItem("lastSyncTime", time);
      updateSyncStatus("synced", time);
    }, 1000);
  }
}

window.addEventListener("online", handleNetworkChange);
window.addEventListener("offline", handleNetworkChange);

/* ===============================
   APP START
=============================== */
navigate("dashboard");
seedDefaultStock();
setTimeout(handleNetworkChange, 0);

/* ===============================
   SERVICE WORKER (PROD ONLY)
=============================== */
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register("/sw.js");
}