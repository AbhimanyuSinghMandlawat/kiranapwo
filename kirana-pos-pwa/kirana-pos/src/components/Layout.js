export function renderLayout(contentHtml) {
  return `
    <div class="app-layout">

      <!-- Sidebar (Desktop) -->
      <aside class="sidebar">
        <h2 class="logo">Kirana POS</h2>
        <nav>
          <a href="#" data-page="dashboard">Dashboard</a>
          <a href="#" data-page="add-sale">Add Sale</a>
          <a href="#" data-page="reports">Reports</a>
          <a href="#" data-page="credit">Credit Score</a>
          <a href="#" data-page="ledger">Credit Ledger</a>
          <a href="#" data-page="stock">Stock</a>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="main-content page-enter">
        <div class="network-status" id="network-status"></div>
        <div class="sync-status" id="sync-status"></div>
        <div id="toast-container"></div>

        ${contentHtml}
      </main>

      <!-- Bottom Navigation (Mobile) -->
      <nav class="bottom-nav">
        <button data-page="dashboard">Home</button>
        <button data-page="add-sale">Sale</button>
        <button data-page="reports">Reports</button>
        <button data-page="credit">Credit</button>
        <button data-page="ledger">Credit Ledger</button>
        <button data-page="stock">Stock</button>
      </nav>

    </div>
  `;
}
