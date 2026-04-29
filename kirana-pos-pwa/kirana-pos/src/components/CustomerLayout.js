export function renderCustomerLayout(customerName){

  setTimeout(() => {
    const currentPage =
      location.hash.replace("#","") || "customer-profile";

    document
      .querySelectorAll(".customer-sidebar-link")
      .forEach(link => {

        link.classList.remove("active");

        if(link.dataset.page == currentPage) {
          link.classList.add("active");
        }

        link.onclick = () => {

          location.hash =
            link.dataset.page;
        };
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