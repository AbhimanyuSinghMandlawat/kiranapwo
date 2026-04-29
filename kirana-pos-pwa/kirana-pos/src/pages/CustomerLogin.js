import { loginCustomer, getCustomerByPhone } from "../services/customerAuthService";

export async function renderCustomerLogin(container) {

  container.innerHTML = `
    <div class="auth-container">

      <div class="glass-card" style="max-width:400px;margin:auto;margin-top:120px;">

        <h2>Customer Login</h2>

        <input id="cust-phone"
          placeholder="Phone Number" />

        <input id="cust-password"
          type="password"
          placeholder="Password" />

        <button id="cust-login"
          class="btn-primary"
          style="width:100%;margin-top:12px;">
          Login
        </button>

        <button id="cust-register"
          class="btn-secondary"
          style="width:100%;margin-top:10px;">
          New Customer? Register
        </button>

        <div id="cust-error"
          style="color:#ef4444;margin-top:10px;"></div>

      </div>

    </div>
  `;


  /* LOGIN */
    document.getElementById("cust-login").onclick = async () => {

     const phone =
      document.getElementById("cust-phone").value.trim();

     const password =
       document.getElementById("cust-password").value.trim();
     const error =
        document.getElementById("cust-error");

     error.textContent = "";

        if (!phone || !password) {
         error.textContent = "Enter phone and password";
         return;
        }

        const customer =
          await loginCustomer(phone, password);

        if (!customer) {
         error.textContent = "Invalid phone or password";
         return;
        }

        location.hash = "customer-portal";
    };


  /* REGISTER BUTTON */
  document.getElementById("cust-register").onclick = () => {

    const phone =
      document.getElementById("cust-phone").value.trim();

    if (!phone) {
      document.getElementById("cust-error").textContent =
        "Enter phone number first";
      return;
    }

    location.hash =
      "customer-register?phone=" + phone;
  };

}