export default function Welcome() {

  return `
    <div class="welcome-page">

      <!-- Animated background blobs -->
      <div class="welcome-bg">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
        <div class="blob blob-3"></div>
      </div>

      <div class="welcome-card">

        <!-- Logo + Brand -->
        <div class="welcome-logo">
          <div class="welcome-logo-icon">🛒</div>
          <div class="welcome-logo-glow"></div>
        </div>

        <h1 class="welcome-title">Kirana POS</h1>
        <p class="welcome-subtitle">Smart Point-of-Sale for Modern Kirana Stores</p>

        <!-- Features row -->
        <div class="welcome-features">
          <div class="welcome-feature">
            <span>📦</span>
            <span>Inventory</span>
          </div>
          <div class="welcome-feature">
            <span>📊</span>
            <span>Analytics</span>
          </div>
          <div class="welcome-feature">
            <span>📷</span>
            <span>AI Scanner</span>
          </div>
          <div class="welcome-feature">
            <span>📶</span>
            <span>Offline</span>
          </div>
        </div>

        <div class="welcome-divider"></div>

        <!-- CTAs -->
        <div class="welcome-actions">
          <button class="welcome-btn welcome-btn-primary" data-page="login">
            <span>🔑</span>
            Sign In to Your Shop
          </button>

          <button class="welcome-btn welcome-btn-secondary" data-page="owner-setup">
            <span>🏪</span>
            Register New Shop
          </button>

          <button class="welcome-btn welcome-btn-ghost" data-page="customer-login">
            <span>👤</span>
            Customer Login
          </button>
        </div>

        <p class="welcome-footer">
          Works offline · Your data stays private · No subscription
        </p>

      </div>

    </div>

    <style id="welcome-styles">
      .welcome-page {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #080F1E;
        position: relative;
        overflow: hidden;
        padding: 20px;
      }

      /* ── Animated background ── */
      .welcome-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .blob {
        position: absolute;
        border-radius: 50%;
        filter: blur(80px);
        opacity: 0.18;
        animation: blobFloat 8s ease-in-out infinite;
      }

      .blob-1 {
        width: 500px; height: 500px;
        background: radial-gradient(circle, #22c55e, #16a34a);
        top: -150px; left: -150px;
        animation-delay: 0s;
      }

      .blob-2 {
        width: 400px; height: 400px;
        background: radial-gradient(circle, #6366f1, #4f46e5);
        bottom: -120px; right: -120px;
        animation-delay: 3s;
      }

      .blob-3 {
        width: 300px; height: 300px;
        background: radial-gradient(circle, #14b8a6, #0d9488);
        top: 50%; right: 10%;
        animation-delay: 6s;
        opacity: 0.1;
      }

      @keyframes blobFloat {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(20px, -20px) scale(1.05); }
        66% { transform: translate(-15px, 10px) scale(0.97); }
      }

      /* ── Card ── */
      .welcome-card {
        position: relative;
        z-index: 2;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 28px;
        padding: 48px 40px;
        width: 100%;
        max-width: 420px;
        text-align: center;
        backdrop-filter: blur(20px);
        box-shadow: 0 24px 80px rgba(0,0,0,0.5),
                    inset 0 1px 0 rgba(255,255,255,0.07);
      }

      /* ── Logo ── */
      .welcome-logo {
        position: relative;
        display: inline-block;
        margin-bottom: 20px;
      }

      .welcome-logo-icon {
        font-size: 64px;
        display: block;
        filter: drop-shadow(0 4px 16px rgba(34,197,94,0.4));
        animation: logoBounce 3s ease-in-out infinite;
      }

      .welcome-logo-glow {
        position: absolute;
        inset: -10px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(34,197,94,0.2), transparent 70%);
        animation: glowPulse 2.5s ease-in-out infinite;
      }

      @keyframes logoBounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }

      @keyframes glowPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(1.3); }
      }

      /* ── Title ── */
      .welcome-title {
        font-size: 32px;
        font-weight: 800;
        letter-spacing: -0.8px;
        margin: 0 0 8px;
        background: linear-gradient(135deg, #e5e7eb 0%, #22c55e 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .welcome-subtitle {
        font-size: 14px;
        color: #64748b;
        margin: 0 0 24px;
        line-height: 1.5;
      }

      /* ── Feature row ── */
      .welcome-features {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 24px;
        flex-wrap: wrap;
      }

      .welcome-feature {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 10px 14px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 12px;
        font-size: 11px;
        color: #64748b;
        font-weight: 500;
        min-width: 72px;
      }

      .welcome-feature span:first-child { font-size: 18px; }

      /* ── Divider ── */
      .welcome-divider {
        height: 1px;
        background: rgba(255,255,255,0.07);
        margin: 0 0 24px;
      }

      /* ── Buttons ── */
      .welcome-actions {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 24px;
      }

      .welcome-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 14px 20px;
        border: none;
        border-radius: 14px;
        font-size: 15px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.15s ease;
        font-family: inherit;
      }

      .welcome-btn:hover { transform: translateY(-2px); }
      .welcome-btn:active { transform: translateY(0); }

      .welcome-btn-primary {
        background: linear-gradient(135deg, #22c55e, #16a34a);
        color: #fff;
        box-shadow: 0 4px 20px rgba(34,197,94,0.35);
      }

      .welcome-btn-primary:hover {
        box-shadow: 0 8px 32px rgba(34,197,94,0.45);
      }

      .welcome-btn-secondary {
        background: rgba(255,255,255,0.07);
        color: #e5e7eb;
        border: 1px solid rgba(255,255,255,0.12);
      }

      .welcome-btn-secondary:hover {
        background: rgba(255,255,255,0.1);
      }

      .welcome-btn-ghost {
        background: transparent;
        color: #64748b;
        border: 1px solid rgba(255,255,255,0.06);
        font-size: 13px;
        padding: 10px 20px;
      }

      .welcome-btn-ghost:hover {
        color: #94a3b8;
        background: rgba(255,255,255,0.03);
      }

      /* ── Footer note ── */
      .welcome-footer {
        font-size: 11px;
        color: #374151;
        margin: 0;
      }

      /* ── Mobile ── */
      @media (max-width: 480px) {
        .welcome-card {
          padding: 36px 24px;
          border-radius: 20px;
        }

        .welcome-title { font-size: 26px; }
        .welcome-features { gap: 6px; }
        .welcome-feature { padding: 8px 10px; min-width: 60px; font-size: 10px; }
      }
    </style>
  `;

}