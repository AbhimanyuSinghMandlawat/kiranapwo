export function renderLayout(contentHtml) {
  // Determine current network state safely
  const online = navigator.onLine;

  const syncText = online
    ? `<span class="dot online"></span> Online · All data synced`
    : `<span class="dot offline"></span> Offline · Working locally`;

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

          <!-- NEW: Logout Option -->
          <a href="#" data-page="logout">Logout</a>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="main-content page-enter">

        <!-- Network / Sync Status -->
        <div class="network-status" id="network-status"></div>

        <div class="sync-status" id="sync-status">
          ${syncText}
        </div>

        <!-- Global Toast Container -->
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

        <!-- NEW: Logout Button in Mobile Nav -->
        <button data-page="logout">Logout</button>
      </nav>

    </div>
  `;
}
