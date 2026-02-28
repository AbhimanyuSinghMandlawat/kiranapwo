import { createCustomerAccount } from "../services/customerAuthService";

export async function renderCustomerRegister(container) {

  container.innerHTML = `
    <div class="auth-container">

      <div class="glass-card" style="max-width:400px;margin:auto;margin-top:120px;">

        <h2>Create Customer Account</h2>

        <input id="cust-name"
          placeholder="Full Name" />

        <input id="cust-phone"
          placeholder="Phone Number" />

        <input id="cust-password"
          type="password"
          placeholder="Set Password" />

        <button id="cust-register"
          class="btn-primary">

          Register

        </button>

        <div id="cust-error"
          style="color:#ef4444;margin-top:10px;"></div>

      </div>

    </div>
  `;


  document.getElementById("cust-register").onclick = async () => {

    const name =
      document.getElementById("cust-name").value;

    const phone =
      document.getElementById("cust-phone").value;

    const password =
      document.getElementById("cust-password").value;

    if (!name || !phone || !password) {

      document.getElementById("cust-error")
        .textContent = "All fields required";

      return;
    }

    await createCustomerAccount({
      id: crypto.randomUUID(),
      name,
      phone,
      password,
      createdAt: Date.now()
    });

    location.hash = "customer-login";

  };

}