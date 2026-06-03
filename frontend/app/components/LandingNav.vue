<script setup lang="ts">
const { audience, set } = useAudience()

const scrolled = ref(false)

function onScroll() {
  scrolled.value = window.scrollY > 20
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="nav-wrap">
    <nav class="nav">
      <div class="nav-bg" :class="{ scrolled }" />

      <!-- Logo -->
      <NuxtLink to="/" class="brand" @click="set('employer')">
        <svg class="brand-icon" viewBox="0 0 30 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M15 2L28 26H2L15 2Z" fill="rgb(245, 240, 234)" />
        </svg>
        <span class="brand-name">myHR</span>
      </NuxtLink>

      <!-- Tab switcher pill -->
      <div class="tab-pill" role="group" aria-label="Choose audience">
        <div class="tab-indicator" :class="{ 'tab-indicator--right': audience === 'candidate' }" />
        <NuxtLink
          to="/"
          class="tab-btn"
          :class="{ active: audience === 'employer' }"
          @click="set('employer')"
        >Employers</NuxtLink>
        <NuxtLink
          to="/candidate"
          class="tab-btn"
          :class="{ active: audience === 'candidate' }"
          @click="set('candidate')"
        >Candidates</NuxtLink>
      </div>

      <!-- Right: links + CTA -->
      <div class="nav-r">
        <a href="#about" class="nav-link">About</a>
        <NuxtLink
          :to="audience === 'employer' ? '/employer/login' : '/candidate/login'"
          class="nav-link"
        >Login</NuxtLink>
        <NuxtLink
          v-if="audience === 'employer'"
          to="/employer/signup"
          class="cta"
        >Start hiring</NuxtLink>
        <NuxtLink
          v-else
          to="/candidate/login?mode=signup"
          class="cta"
        >Build profile</NuxtLink>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.nav-wrap {
  position: relative;
  z-index: 50;
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
  backdrop-filter: blur(6px) saturate(1.1);
  -webkit-backdrop-filter: blur(6px) saturate(1.1);
  background: transparent;
  transition: background 0.3s ease, border-color 0.3s ease;
  border-bottom: 1px solid transparent;
}

.nav-bg.scrolled {
  background: color-mix(in srgb, var(--l-bg) 80%, transparent);
  border-bottom-color: var(--l-line);
}

/* ── Logo ── */
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  justify-self: start;
  transition: opacity 0.15s;
}

.brand:hover {
  opacity: 0.8;
}

.brand-icon {
  width: 30px;
  height: 28px;
  flex-shrink: 0;
}

.brand-name {
  font-family: var(--l-sans);
  font-size: 18px;
  font-weight: 500;
  color: rgb(245, 240, 234);
  line-height: 28px;
}

/* ── Tab pill ── */
.tab-pill {
  width: 232px;
  height: 44px;
  padding: 3px;
  border-radius: 9999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
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
  background: rgb(214, 227, 143);
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
  color: rgba(245, 240, 234, 0.7);
  text-decoration: none;
  border-radius: 9999px;
  position: relative;
  z-index: 10;
  transition: color 0.2s;
  padding: 8px 20px;
}

.tab-btn.active {
  color: rgb(61, 64, 47);
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
  color: rgb(245, 240, 234);
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
  background: rgb(207, 176, 219);
  color: rgb(74, 29, 96);
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
  .tab-pill {
    display: none;
  }

  .nav {
    grid-template-columns: 1fr auto;
  }
}

@media (max-width: 480px) {
  .nav {
    padding: 8px 16px;
  }

  .nav-link {
    display: none;
  }

  .nav-r {
    gap: 12px;
  }
}
</style>
