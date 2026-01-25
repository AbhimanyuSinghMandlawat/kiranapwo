import "./styles/variables.css";
import "./styles/main.css";
import { navigate } from "./app";
import { getNetworkStatus } from "./utils/network";
import { updateSyncStatus } from "./utils/syncStatus";
import { seedDefaultStock } from "./services/db";

/* =====================================================
   NETWORK & SYNC HANDLING
   ===================================================== */
function handleNetworkChange() {
  // Update network status text
  const networkEl = document.getElementById("network-status");
  if (networkEl) {
    networkEl.textContent = getNetworkStatus();
    networkEl.className = navigator.onLine
      ? "network-status online"
      : "network-status offline";
  }

  // Optional: network quality logging
  if (navigator.connection?.effectiveType) {
    console.log("Network type:", navigator.connection.effectiveType);
  }

  // Update sync status
  if (!navigator.onLine) {
    updateSyncStatus("offline");
  } else {
    updateSyncStatus("syncing");

    setTimeout(() => {
      const time = new Date().toLocaleTimeString();
      localStorage.setItem("lastSyncTime", time);
      updateSyncStatus("synced", time);
    }, 1500);
  }
}

window.addEventListener("online", handleNetworkChange);
window.addEventListener("offline", handleNetworkChange);

/* =====================================================
   APP START
   ===================================================== */
navigate("dashboard");
seedDefaultStock();

// Run once after first render
setTimeout(handleNetworkChange, 0);

/* =====================================================
   SERVICE WORKER
   ===================================================== */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => console.log("Service Worker registered"))
      .catch((err) =>
        console.error("Service Worker registration failed:", err)
      );
  });
}
