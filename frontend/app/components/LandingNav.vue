<script setup lang="ts">
const { audience, set } = useAudience()
const colorMode = useColorMode()
const mobileOpen = ref(false)
const waitlistMode = useRuntimeConfig().public.waitlistMode

const route = useRoute()
watch(
  () => route.path,
  () => {
    mobileOpen.value = false
  },
)

function selectEmployer() {
  set('employer')
  mobileOpen.value = false
}
function selectCandidate() {
  set('candidate')
  mobileOpen.value = false
}
</script>

<template>
  <nav class="nav">
    <div class="nav-inner">
      <!-- Logo -->
      <NuxtLink to="/" class="logo" @click="set('employer')">
        <img
          src="/crewly-logo-horizontal.svg"
          alt="Crewly"
          class="logo-img block dark:hidden"
          height="28"
        />
        <img
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          class="logo-img hidden dark:block"
          height="28"
        />
      </NuxtLink>

      <!-- Desktop nav links -->
      <div class="nav-links">
        <NuxtLink
          to="/"
          class="nav-a"
          :class="{ on: audience === 'employer' }"
          @click="set('employer')"
          >Employers</NuxtLink
        >
        <NuxtLink
          to="/candidate"
          class="nav-a"
          :class="{ on: audience === 'candidate' }"
          @click="set('candidate')"
          >Candidates</NuxtLink
        >
        <a href="#how-it-works" class="nav-a">How it works</a>
      </div>

      <!-- Desktop right -->
      <div class="nav-r">
        <button
          type="button"
          class="theme-btn"
          :aria-label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        >
          <UIcon
            :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            style="width: 14px; height: 14px"
          />
        </button>
        <NuxtLink
          :to="audience === 'employer' ? '/employer/login' : '/candidate/login'"
          class="btn btn-ghost"
          >Login</NuxtLink
        >
        <template v-if="waitlistMode">
          <a href="#waitlist" class="btn btn-primary">Join waitlist</a>
        </template>
        <template v-else>
          <NuxtLink v-if="audience === 'employer'" to="/employer/signup" class="btn btn-primary"
            >Start hiring</NuxtLink
          >
          <NuxtLink v-else to="/candidate/login?mode=signup" class="btn btn-primary"
            >Build profile</NuxtLink
          >
        </template>
      </div>

      <!-- Mobile right: theme toggle + hamburger -->
      <div class="nav-mobile-r">
        <button
          type="button"
          class="theme-btn"
          :aria-label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
          @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
        >
          <UIcon
            :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            style="width: 14px; height: 14px"
          />
        </button>
        <button
          type="button"
          class="hamburger"
          :class="{ open: mobileOpen }"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="mobileOpen"
          @click="mobileOpen = !mobileOpen"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </div>

    <!-- Mobile menu dropdown -->
    <Transition name="mob-menu">
      <div v-if="mobileOpen" class="mob-menu">
        <NuxtLink
          to="/"
          class="mob-link"
          :class="{ on: audience === 'employer' }"
          @click="selectEmployer"
          >Employers</NuxtLink
        >
        <NuxtLink
          to="/candidate"
          class="mob-link"
          :class="{ on: audience === 'candidate' }"
          @click="selectCandidate"
          >Candidates</NuxtLink
        >
        <a href="#how-it-works" class="mob-link" @click="mobileOpen = false">How it works</a>
        <div class="mob-divider" />
        <div class="mob-actions">
          <NuxtLink
            :to="audience === 'employer' ? '/employer/login' : '/candidate/login'"
            class="btn btn-ghost mob-btn"
            @click="mobileOpen = false"
            >Login</NuxtLink
          >
          <template v-if="waitlistMode">
            <a href="#waitlist" class="btn btn-primary mob-btn" @click="mobileOpen = false"
              >Join waitlist</a
            >
          </template>
          <template v-else>
            <NuxtLink
              v-if="audience === 'employer'"
              to="/employer/signup"
              class="btn btn-primary mob-btn"
              @click="mobileOpen = false"
              >Start hiring</NuxtLink
            >
            <NuxtLink
              v-else
              to="/candidate/login?mode=signup"
              class="btn btn-primary mob-btn"
              @click="mobileOpen = false"
              >Build profile</NuxtLink
            >
          </template>
        </div>
      </div>
    </Transition>
  </nav>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--ld-nav);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid var(--ld-bd2);
}

.nav-inner {
  max-width: 1440px;
  margin: 0 auto;
  padding: 0 32px;
  display: flex;
  align-items: center;
  height: 56px;
  gap: 0;
}

/* Logo */
.logo {
  display: flex;
  align-items: center;
  text-decoration: none;
  margin-right: 32px;
  flex-shrink: 0;
  transition: opacity 0.15s;
}
.logo:hover {
  opacity: 0.8;
}
.logo-img {
  height: 28px;
  width: auto;
}

/* Desktop nav links */
.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nav-a {
  font-size: 13px;
  font-weight: 500;
  color: var(--ld-t2);
  padding: 5px 9px;
  border-radius: 6px;
  text-decoration: none;
  transition:
    color 0.15s,
    background 0.15s;
  white-space: nowrap;
}
.nav-a:hover {
  color: var(--ld-t1);
  background: var(--ld-surf);
}
.nav-a.on {
  color: var(--ld-t1);
  font-weight: 600;
}

/* Desktop right */
.nav-r {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* Mobile right */
.nav-mobile-r {
  display: none;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.theme-btn {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: none;
  border: 1px solid var(--ld-bd);
  color: var(--ld-t2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
}
.theme-btn:hover {
  color: var(--ld-t1);
  background: var(--ld-surf);
}

/* Hamburger */
.hamburger {
  width: 32px;
  height: 32px;
  border-radius: 7px;
  background: none;
  border: 1px solid var(--ld-bd);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;
}
.hamburger:hover {
  background: var(--ld-surf);
}
.hamburger span {
  display: block;
  width: 14px;
  height: 1.5px;
  background: var(--ld-t2);
  border-radius: 1px;
  transition: all 0.22s ease;
  transform-origin: center;
}
.hamburger.open span:nth-child(1) {
  transform: translateY(5.5px) rotate(45deg);
}
.hamburger.open span:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}
.hamburger.open span:nth-child(3) {
  transform: translateY(-5.5px) rotate(-45deg);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: none;
  font-size: 13.5px;
  font-weight: 600;
  font-family: 'Manrope', system-ui, sans-serif;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-ghost {
  background: transparent;
  color: var(--ld-t2);
}
.btn-ghost:hover {
  color: var(--ld-t1);
  background: var(--ld-surf);
}

.btn-primary {
  background: var(--ld-acc);
  color: #fff;
}
.btn-primary:hover {
  background: var(--ld-acc-h);
  transform: translateY(-1px);
}

/* Mobile menu */
.mob-menu {
  border-top: 1px solid var(--ld-bd2);
  background: var(--ld-nav);
  padding: 8px 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mob-link {
  font-size: 15px;
  font-weight: 500;
  color: var(--ld-t2);
  padding: 11px 10px;
  border-radius: 8px;
  text-decoration: none;
  transition:
    color 0.15s,
    background 0.15s;
}
.mob-link:hover,
.mob-link.on {
  color: var(--ld-t1);
  background: var(--ld-surf);
}
.mob-link.on {
  font-weight: 600;
}

.mob-divider {
  height: 1px;
  background: var(--ld-bd2);
  margin: 8px 0;
}

.mob-actions {
  display: flex;
  gap: 8px;
  padding-top: 2px;
}

.mob-btn {
  flex: 1;
  justify-content: center;
  padding: 10px 14px;
  font-size: 14px;
}

/* Mobile menu transition */
.mob-menu-enter-active,
.mob-menu-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.mob-menu-enter-from,
.mob-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .nav-r {
    display: none;
  }
  .nav-mobile-r {
    display: flex;
  }
  .nav-inner {
    padding: 0 16px;
  }
  .logo {
    margin-right: 0;
  }
}
</style>
