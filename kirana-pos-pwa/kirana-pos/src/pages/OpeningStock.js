export async function renderOpeningStock(container) {
  container.innerHTML = `
    <section class="onboarding">
      <div class="onboard-card">

        <div class="onboard-icon">📦</div>

        <h1>Set Your Opening Inventory</h1>

        <p class="subtitle">
          Before billing customers, we need to know what stock you already have in the shop.
        </p>

        <div class="info-box">
          <h3>Why this is important</h3>
          <ul>
            <li>Correct profit calculation</li>
            <li>Accurate daily reports</li>
            <li>Proper stock alerts</li>
          </ul>
        </div>

        <button id="start-opening-stock" class="primary-btn">
          Add Opening Stock
        </button>

        <p class="footnote">
          You can update quantities anytime later from Stock page.
        </p>

      </div>
    </section>
  `;

  // NAVIGATE TO GRID SCREEN
  document
    .getElementById("start-opening-stock")
    .addEventListener("click", () => {
      location.hash = "opening-stock-entry";
    });
}
