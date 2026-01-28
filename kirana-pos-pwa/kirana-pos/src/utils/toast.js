let toastContainer = null;

/* ===============================
   ENSURE CONTAINER EXISTS
=============================== */
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
   SHOW TOAST
=============================== */
export function showToast(message, type = "success") {
  const container = ensureToastContainer();

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4500);
}