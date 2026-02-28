export async function renderCustomerPortal(container){

  container.innerHTML = `

    <!-- PAGE HEADER -->
    <div class="page-header">

      <div style="
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:24px;
      ">

        <div>

          <h1 class="page-title">
            Your Shops
          </h1>

          <p class="page-subtitle">
            Manage your loyalty, coupons and shop relationships
          </p>

        </div>

        <div class="status-badge online">
          ● Active
        </div>

      </div>

    </div>


    <!-- STATS CARDS -->
    <div class="card-grid">

      <div class="card stat-card">
        <div class="card-body">
          <div class="stat-label">Linked Shops</div>
          <div class="stat-value">0</div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="card-body">
          <div class="stat-label">Available Coupons</div>
          <div class="stat-value">0</div>
        </div>
      </div>

      <div class="card stat-card">
        <div class="card-body">
          <div class="stat-label">Total Savings</div>
          <div class="stat-value">₹0</div>
        </div>
      </div>

    </div>


    <!-- MAIN CARD -->
    <div class="card" style="margin-top:24px;">

      <div class="card-header">
        <h3>Your Shop Memberships</h3>
      </div>

      <div class="card-body">

        <div class="empty-state">

          <div class="empty-icon">
            🏪
          </div>

          <div class="empty-title">
            No shops linked yet
          </div>

          <div class="empty-description">
            Visit partner shops and scan coupons to build loyalty and earn rewards.
          </div>

        </div>

      </div>

    </div>

  `;

}