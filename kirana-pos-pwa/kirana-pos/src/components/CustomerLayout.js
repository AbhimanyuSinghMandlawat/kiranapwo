export function renderCustomerLayout(customerName){

  setTimeout(() => {

    document
      .querySelectorAll(".sidebar-link")
      .forEach(link => {

        link.addEventListener("click",() => {

          const page =
            link.dataset.page;
          location.hash = page;
        });
      });
  },0);

  return `
  
  <div class="customer-app-layout">

    <!-- CUSTOMER SIDEBAR -->
    <aside class="customer-sidebar">

      <div class="customer-sidebar-header">
        <div class="customer-sidebar-logo">
          Customer Portal
        </div>
        <div class="customer-sidebar-user">
          ${customerName}
        </div>
      </div>

      <nav class="customer-sidebar-nav">

        <a class="customer-sidebar-link active"
           data-page="customer-profile">
            Profile
        </a>

        <a class="customer-sidebar-link"
           data-page="customer-coupons">
            Coupons
        </a>

        <a class="customer-sidebar-link"
           data-page="customer-logout">
            Logout
        </a>

      </nav>

    </aside>

    <main class="customer-main-content">

      <div id="customer-content"
           class="customer-page-container">
      </div>

    </main>

  </div>

  `;
}