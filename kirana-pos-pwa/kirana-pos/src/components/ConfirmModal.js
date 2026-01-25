export function showConfirmModal({ title, message, onConfirm }) {
  const modal = document.createElement("div");
  modal.className = "confirm-overlay";

  modal.innerHTML = `
    <div class="confirm-modal">
      <h3>${title}</h3>
      <p>${message}</p>

      <div class="confirm-actions">
        <button class="btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn-danger" id="confirm-btn">Yes, Remove</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("cancel-btn").onclick = () => {
    modal.remove();
  };

  document.getElementById("confirm-btn").onclick = () => {
    modal.remove();
    onConfirm();
  };
}