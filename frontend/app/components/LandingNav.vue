<script setup lang="ts">
const { audience, set } = useAudience()
const colorMode = useColorMode()
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

      <!-- Nav links -->
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

      <!-- Right -->
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
        <template v-if="useRuntimeConfig().public.waitlistMode">
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
    </div>
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

/* Nav links */
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

/* Right */
.nav-r {
  display: flex;
  align-items: center;
  gap: 6px;
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

/* Responsive */
@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  .nav-inner {
    padding: 0 20px;
  }
  .logo {
    margin-right: 0;
  }
  .nav-r {
    margin-left: auto;
  }
}
</style>
