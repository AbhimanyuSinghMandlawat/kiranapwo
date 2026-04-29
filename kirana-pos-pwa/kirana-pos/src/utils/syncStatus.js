export function updateSyncStatus(state, time = null) {
  const el = document.getElementById("sync-status");
  if (!el) return;

  let text = "";
  let dotClass = "sync-dot";

  if (state === "offline") {
    text = "Offline - saving locally";
  }

  if (state === "syncing") {
    text = "Syncing data…";
    dotClass += " syncing";
  }

  if (state === "synced") {
    text = `All data synced${time ? ` • ${time}` : ""}`;
    dotClass += " synced";
  }

  el.innerHTML = `
    <span class="${dotClass}"></span>
    <span>${text}</span>
  `;
}
