<script setup lang="ts">
const { audience, set } = useAudience()
const colorMode = useColorMode()

const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 20
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="nav-wrap" :class="{ scrolled }">
    <nav class="nav">
      <div class="nav-bg" :class="{ scrolled }" />

      <!-- Logo -->
      <NuxtLink to="/" class="brand" @click="set('employer')">
        <img
          :src="colorMode.value === 'dark' ? '/crewly-logo-horizontal-white.svg' : '/crewly-logo-horizontal.svg'"
          alt="Crewly"
          class="brand-logo"
          height="32"
        />
      </NuxtLink>

      <!-- Tab switcher pill -->
      <div class="tab-pill" role="group" aria-label="Choose audience">
        <div class="tab-indicator" :class="{ 'tab-indicator--right': audience === 'candidate' }" />
        <NuxtLink
          to="/"
          class="tab-btn"
          :class="{ active: audience === 'employer' }"
          @click="set('employer')"
          >Employers</NuxtLink
        >
        <NuxtLink
          to="/candidate"
          class="tab-btn"
          :class="{ active: audience === 'candidate' }"
          @click="set('candidate')"
          >Candidates</NuxtLink
        >
      </div>

      <!-- Right: links + CTA -->
      <div class="nav-r">
        <a href="#how-it-works" class="nav-link">How it works</a>
        <NuxtLink
          :to="audience === 'employer' ? '/employer/login' : '/candidate/login'"
          class="nav-link"
          >Login</NuxtLink
        >
        <template v-if="useRuntimeConfig().public.waitlistMode">
          <a href="#waitlist" class="cta">Join waitlist</a>
        </template>
        <template v-else>
          <NuxtLink v-if="audience === 'employer'" to="/employer/signup" class="cta"
            >Start hiring</NuxtLink
          >
          <NuxtLink v-else to="/candidate/login?mode=signup" class="cta">Build profile</NuxtLink>
        </template>

        <!-- Theme Toggle -->
        <button
          type="button"
          class="icon-btn theme-toggle-btn"
          :aria-label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
          style="
            background: transparent;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 8px;
            color: var(--l-text);
            transition: opacity 0.2s;
          "
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        >
          <UIcon
            :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            style="width: 18px; height: 18px"
          />
        </button>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.nav-wrap {
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  transition: padding 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.nav-wrap.scrolled {
  padding: 0 clamp(16px, 4vw, 40px);
}

.nav {
  position: relative;
  height: 68px;
  padding: 8px 32px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 24px;
}

/* Frosted glass background layer */
.nav-bg {
  position: absolute;
  inset: 0;
  z-index: -1;
  backdrop-filter: blur(12px) saturate(1.2);
  -webkit-backdrop-filter: blur(12px) saturate(1.2);
  background: transparent;
  transition:
    all 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    border-color 0.3s ease;
  border-bottom: 1px solid transparent;
  border-radius: 0;
}

.nav-bg.scrolled {
  background: color-mix(in srgb, var(--l-surface) 60%, transparent);
  border: 1px solid var(--l-line);
  border-radius: 34px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}

/* ── Logo ── */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  justify-self: start;
  transition: opacity 0.15s;
  color: var(--l-text);
}

.brand:hover {
  opacity: 0.8;
}

.brand-logo {
  height: 32px;
  width: auto;
  flex-shrink: 0;
  display: block;
}

/* ── Tab pill ── */
.tab-pill {
  width: 232px;
  height: 44px;
  padding: 3px;
  border-radius: 9999px;
  border: 1px solid var(--l-line);
  backdrop-filter: blur(16px) saturate(1.2);
  -webkit-backdrop-filter: blur(16px) saturate(1.2);
  display: flex;
  position: relative;
  justify-self: center;
}

.tab-indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  height: calc(100% - 6px);
  width: calc(50% - 3px);
  border-radius: 9999px;
  background: var(--l-green);
  transition: left 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.tab-indicator--right {
  left: calc(50%);
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--l-sans);
  font-size: 14px;
  font-weight: 500;
  color: color-mix(in srgb, var(--l-text) 70%, transparent);
  text-decoration: none;
  border-radius: 9999px;
  position: relative;
  z-index: 10;
  transition: color 0.2s;
  padding: 8px 20px;
}

.tab-btn.active {
  color: #1a1a18;
}

/* ── Right section ── */
.nav-r {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-self: end;
}

.nav-link {
  font-family: var(--l-sans);
  font-size: 14px;
  font-weight: 500;
  color: var(--l-text);
  text-decoration: none;
  transition: opacity 0.12s;
  white-space: nowrap;
}

.nav-link:hover {
  opacity: 0.7;
}

.cta {
  display: flex;
  align-items: center;
  height: 52px;
  padding: 16px 24px;
  background: var(--l-green);
  color: var(--l-cta-text, #fff);
  font-family: var(--l-sans);
  font-size: 16px;
  font-weight: 500;
  border-radius: 9999px;
  text-decoration: none;
  white-space: nowrap;
  transition: filter 0.15s;
}

.cta:hover {
  filter: brightness(1.05);
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .nav {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    height: auto;
    padding: 12px 24px;
    gap: 12px;
  }

  .tab-pill {
    grid-row: 2;
    grid-column: 1 / span 2;
    justify-self: center;
    width: 100%;
    max-width: 320px;
  }

  .brand {
    grid-row: 1;
    grid-column: 1;
  }

  .nav-r {
    grid-row: 1;
    grid-column: 2;
  }
}

@media (max-width: 480px) {
  .nav {
    padding: 12px 16px;
  }

  .nav-link {
    display: none;
  }

  .nav-r {
    gap: 12px;
  }
}
</style>
