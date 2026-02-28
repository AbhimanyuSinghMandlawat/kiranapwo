export default function Welcome() {

  return `
    <div class="auth-container">

      <div class="auth-card">

        <h2>Use As</h2>

        <button class="btn-primary" data-page="owner-setup">
          Shop Owner (First Time Setup)
        </button>

        <button class="btn-primary" data-page="login">
          Existing User Login
        </button>

        <button class="btn-secondary" data-page="customer-login">
          Customer Login
        </button>

      </div>

    </div>
  `;

}