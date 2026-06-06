<template>
  <footer class="footer-outer">
    <div class="footer-card">
      <!-- Top section -->
      <div class="footer-top">
        <!-- Left: logo + tagline -->
        <div class="col col-brand">
          <div class="logo">
            <svg
              class="logo-icon"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path d="M12 3L22 20H2L12 3Z" fill="white" />
            </svg>
            <span class="logo-name">myHR</span>
          </div>
          <p class="tagline">Match people with opportunities that actually fit.</p>
        </div>

        <!-- Middle: Product links -->
        <div class="col col-links">
          <h4 class="col-heading">Product</h4>
          <nav>
            <a href="#how-it-works" class="link">How It Works</a>
            <a href="#faq" class="link">FAQ</a>
            <a href="#candidates" class="link">For candidates</a>
          </nav>
        </div>

        <!-- Right: Contact -->
        <div class="col col-contact">
          <h4 class="col-heading">Contact</h4>
          <a href="mailto:founders@tryprism.com" class="link link--underline"
            >founders@tryprism.com</a
          >
          <span class="link">San Francisco, CA</span>
        </div>
      </div>

      <!-- Divider -->
      <hr class="divider" />

      <!-- Bottom bar -->
      <div class="footer-bottom">
        <p class="copy">© 2026 myHR. Stop sorting. Start hiring.</p>
        <div class="legal">
          <a href="/terms" class="legal-link">Terms of Service</a>
          <a href="/privacy" class="legal-link">Privacy Policy</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer-outer {
  width: 100%;
  padding: 0 24px 32px;
  box-sizing: border-box;
  font-family:
    system-ui,
    'Inter',
    -apple-system,
    sans-serif;
  -webkit-font-smoothing: antialiased;
}

.footer-card {
  background: #0f1210;
  border-radius: 18px;
  padding: 48px 40px 36px;
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Top grid ── */
.footer-top {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 48px;
  align-items: start;
}

/* ── Brand column ── */
.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.logo-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.logo-name {
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.tagline {
  font-size: 14px;
  color: #888;
  line-height: 1.5;
  margin: 0;
  max-width: 240px;
}

/* ── Link columns ── */
.col-heading {
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 0 0 16px 0;
}

nav {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.col-contact {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.col-contact .col-heading {
  margin-bottom: 6px;
}

.link {
  font-size: 14px;
  color: #aaa;
  text-decoration: none;
  transition: color 0.15s;
  line-height: 1.4;
}

.link:hover {
  color: #e8e8e8;
}

.link--underline {
  text-decoration: underline;
  text-underline-offset: 3px;
  color: #fff;
}

.link--underline:hover {
  color: #e8e8e8;
}

/* ── Divider ── */
.divider {
  border: none;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin: 36px 0 28px;
}

/* ── Bottom bar ── */
.footer-bottom {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}

.copy {
  font-size: 13px;
  color: #666;
  margin: 0;
}

.legal {
  display: flex;
  gap: 24px;
}

.legal-link {
  font-size: 13px;
  color: #666;
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s;
}

.legal-link:hover {
  color: #aaa;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .footer-card {
    padding: 36px 24px 28px;
  }

  .footer-top {
    grid-template-columns: 1fr;
    gap: 32px;
  }

  .tagline {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .footer-outer {
    padding: 0 12px 24px;
  }

  .footer-card {
    border-radius: 14px;
    padding: 28px 20px 24px;
  }
}
</style>
