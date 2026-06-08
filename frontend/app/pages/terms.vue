<script setup lang="ts">
definePageMeta({ layout: 'empty', auth: false })
const { t } = useI18n()

useHead({
  title: computed(() => t('terms.title')),
  link: [{ rel: 'canonical', href: 'https://crewly.uz/terms' }],
  meta: [
    {
      name: 'description',
      content: computed(() => t('terms.subtitle')),
    },
    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://crewly.uz/terms' },
    { property: 'og:title', content: computed(() => `${t('terms.title')} | Crewly`) },
    { property: 'og:description', content: computed(() => t('terms.subtitle')) },

    // Twitter
    { name: 'twitter:card', content: 'summary' },
    { name: 'twitter:url', content: 'https://crewly.uz/terms' },
    { name: 'twitter:title', content: computed(() => `${t('terms.title')} | Crewly`) },
    { name: 'twitter:description', content: computed(() => t('terms.subtitle')) },
  ],
})
</script>

<template>
  <div class="terms-page">
    <nav class="terms-nav">
      <NuxtLink to="/" class="brand">
        <img
          src="/crewly-logo-horizontal.svg"
          alt="Crewly"
          style="height: 20px; width: auto; display: block"
        />
      </NuxtLink>
      <NuxtLink to="/employer/login?mode=signup" class="cta-btn">{{
        t('landing.doorCompanyCta')
      }}</NuxtLink>
    </nav>

    <main class="terms-main">
      <CommonPageHead
        :eyebrow="t('terms.title')"
        :title="t('terms.title')"
        :subtitle="t('terms.subtitle')"
      />

      <article class="terms-card">
        <section>
          <h2>{{ t('terms.feeTitle') }}</h2>
          <p>{{ t('terms.feeBody') }}</p>
        </section>
        <section>
          <h2>{{ t('terms.paymentTitle') }}</h2>
          <p>{{ t('terms.paymentBody') }}</p>
        </section>
        <section>
          <h2>{{ t('terms.guaranteeTitle') }}</h2>
          <p>{{ t('terms.guaranteeBody') }}</p>
        </section>
        <section>
          <h2>{{ t('terms.replacementTitle') }}</h2>
          <p>{{ t('terms.replacementBody') }}</p>
        </section>
        <section>
          <h2>{{ t('terms.contactTitle') }}</h2>
          <p>{{ t('terms.contactBody') }}</p>
        </section>
      </article>
    </main>
  </div>
</template>

<style scoped>
.terms-page {
  min-height: 100vh;
  background: var(--bg, #f5f1ea);
  color: var(--ink, #1a1a1a);
}
.terms-nav {
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
.terms-main {
  max-width: 720px;
  margin: 0 auto;
  padding: 48px 24px 80px;
}
.terms-card {
  margin-top: 32px;
  background: var(--paper, #fdfcf8);
  border: 1px solid var(--line, #d9d3c7);
  border-radius: 16px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.terms-card h2 {
  font-family: 'Fraunces', serif;
  font-size: 22px;
  margin-bottom: 8px;
}
.terms-card p {
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink-muted, #6b6760);
}
</style>
