<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: false })

defineOgImageComponent('Default', {
  title: 'Privacy Policy',
  description: 'How Crewly collects, uses, and protects your data.',
})

useHead({
  title: 'Privacy Policy',
  link: [{ rel: 'canonical', href: 'https://crewly.uz/privacy' }],
  meta: [
    {
      name: 'description',
      content: 'Learn how Crewly collects, uses, and protects your personal data.',
    },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://crewly.uz/privacy' },
    { property: 'og:title', content: 'Privacy Policy | Crewly' },
    {
      property: 'og:description',
      content: 'Learn how Crewly collects, uses, and protects your personal data.',
    },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Privacy Policy | Crewly' },
    {
      name: 'twitter:description',
      content: 'Learn how Crewly collects, uses, and protects your personal data.',
    },
  ],
})
</script>

<template>
  <div class="privacy-page">
    <nav class="privacy-nav">
      <NuxtLink to="/" class="brand">
        <img
          class="block dark:hidden"
          src="/crewly-logo-horizontal.svg"
          alt="Crewly"
          style="height: 20px; width: auto"
        />
        <img
          class="hidden dark:block"
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          style="height: 20px; width: auto"
        />
      </NuxtLink>
      <NuxtLink to="/employer/login?mode=signup" class="cta-btn">Start hiring</NuxtLink>
    </nav>

    <main class="privacy-main">
      <div class="page-head">
        <p class="eyebrow">Legal</p>
        <h1 class="title">Privacy Policy</h1>
        <p class="subtitle">Last updated: June 2026</p>
      </div>

      <article class="privacy-card">
        <section>
          <h2>1. Data We Collect</h2>
          <p>
            We collect information you provide directly: name, email address, work history, and
            skills when you create a candidate profile or employer account. We also collect usage
            data (pages visited, actions taken) and technical data (IP address, browser type, device
            identifiers) automatically via cookies and server logs.
          </p>
        </section>

        <section>
          <h2>2. How We Use Your Data</h2>
          <p>
            Candidate data is used to match you with relevant job opportunities and share relevant
            portions of your profile with employers actively hiring for matching roles. Employer
            data is used to manage your account and facilitate the recruitment process. Usage data
            is used to improve product quality and debug issues.
          </p>
        </section>

        <section>
          <h2>3. Data Sharing</h2>
          <p>
            We do not sell your personal data. We share candidate profile data only with employers
            you are matched with on Crewly. We use third-party services for infrastructure (cloud
            hosting), error monitoring (Sentry), and analytics. These providers process data on our
            behalf under strict data processing agreements.
          </p>
        </section>

        <section>
          <h2>4. Cookies</h2>
          <p>
            We use essential cookies required for authentication and session management. We do not
            use third-party advertising cookies. You can disable non-essential cookies via your
            browser settings, though this may affect functionality.
          </p>
        </section>

        <section>
          <h2>5. Data Retention</h2>
          <p>
            Candidate profiles are retained while your account is active. Employer data is retained
            for the duration of the business relationship plus a reasonable period for legal and
            accounting purposes. You may request deletion of your account and associated data at any
            time.
          </p>
        </section>

        <section>
          <h2>6. Your Rights</h2>
          <p>
            You have the right to access, correct, export, or delete your personal data. To exercise
            these rights, email us at
            <a href="mailto:hello@crewly.uz">hello@crewly.uz</a>. We will respond within 30 days.
          </p>
        </section>

        <section>
          <h2>7. Contact</h2>
          <p>
            For privacy questions or requests, contact us at
            <a href="mailto:hello@crewly.uz">hello@crewly.uz</a>.
          </p>
        </section>
      </article>
    </main>
  </div>
</template>

<style scoped>
.privacy-page {
  min-height: 100vh;
  background: var(--bg, #f5f1ea);
  color: var(--ink, #1a1a1a);
}
.privacy-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  border-bottom: 1px solid var(--line-soft, #e8e2d5);
}
.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit;
}
.cta-btn {
  font-size: 13px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #1a1a1a;
  color: #f5f1ea;
  text-decoration: none;
}
.privacy-main {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}
.page-head {
  text-align: center;
  margin-bottom: 40px;
}
.eyebrow {
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-muted, #6b6760);
  margin-bottom: 12px;
}
.title {
  font-family: 'Fraunces', serif;
  font-size: 40px;
  font-weight: 400;
  letter-spacing: -0.03em;
  margin-bottom: 8px;
  color: var(--ink, #1a1a1a);
}
.subtitle {
  font-size: 14px;
  color: var(--ink-muted, #6b6760);
}
.privacy-card {
  margin-top: 32px;
  background: var(--paper, #fdfcf8);
  border: 1px solid var(--line, #d9d3c7);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.privacy-card h2 {
  font-family: 'Fraunces', serif;
  font-size: 20px;
  margin-bottom: 8px;
  font-weight: 400;
}
.privacy-card p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-muted, #6b6760);
}
.privacy-card a {
  color: var(--ink, #1a1a1a);
}
</style>
