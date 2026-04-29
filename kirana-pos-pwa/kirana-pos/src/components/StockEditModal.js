export function showStockEditModal({
  title,
  label,
  placeholder,
  confirmText,
  onConfirm
}) {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";

  overlay.innerHTML = `
    <div class="confirm-modal">
      <h3>${title}</h3>

      <input
        id="stock-edit-input"
        type="number"
        placeholder="${placeholder}"
        class="modal-input"
      />

      <div class="confirm-actions">
        <button class="btn-secondary" id="cancel-btn">Cancel</button>
        <button class="btn-primary" id="confirm-btn">
          ${confirmText}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("cancel-btn").onclick = () => {
    overlay.remove();
  };

  document.getElementById("confirm-btn").onclick = () => {
    const value = Number(
      document.getElementById("stock-edit-input").value
    );

    if (!value || value <= 0) return;

    overlay.remove();
    onConfirm(value);
  };
}