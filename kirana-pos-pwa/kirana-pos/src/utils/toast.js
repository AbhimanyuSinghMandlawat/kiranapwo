let toastContainer = null;

function ensureToastContainer() {
  if (toastContainer) return toastContainer;

  let container = document.getElementById("toast-container");

  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  toastContainer = container;
  return container;
}

/* ===============================
   SHOW TOAST — 5 second duration with fade-out
=============================== */
export function showToast(message, type = "success") {
  const container = ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  // Trigger enter animation on next frame
  requestAnimationFrame(() => {
    toast.classList.add("toast-visible");
  });

  // Start fade-out at 4.5s, remove at 5s
  setTimeout(() => {
    toast.classList.add("toast-hiding");
    setTimeout(() => toast.remove(), 500);
  }, 4500);
}