export default function Welcome() {
  return `
    <div class="auth-container">
      <h2>Use As</h2>

      <button onclick="location.hash='#owner-setup'">
        Shop Owner
      </button>

      <button onclick="location.hash='#customer-login'">
        Customer
      </button>
    </div>
  `;
}
