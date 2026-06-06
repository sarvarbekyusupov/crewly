<script setup lang="ts">
import { scoringActive, useCandidateEventStream } from '~/composables/useCandidateEventStream'

const store = useCandidateAuthStore()
const router = useRouter()
const toast = useToast()

const { connect, disconnect } = useCandidateEventStream()
onMounted(connect)
onUnmounted(disconnect)

onErrorCaptured((err) => {
  console.error('[layout:candidate] unhandled error:', err)
  toast.add({ title: 'Something went wrong', description: String(err), color: 'error' })
  return true
})

const nav = [
  { label: 'Dashboard', to: '/candidate/dashboard', icon: 'i-heroicons-home' },
  { label: 'Applications', to: '/candidate/offers', icon: 'i-heroicons-briefcase' },
  { label: 'Messages', to: '/candidate/chat', icon: 'i-heroicons-chat-bubble-left-right' },
  { label: 'Job Discovery', to: '/candidate/jobs', icon: 'i-heroicons-magnifying-glass' },
  {
    label: 'Job Tracker',
    to: '/candidate/tracker',
    icon: 'i-heroicons-paper-airplane',
  },
  {
    label: 'Preferences',
    to: '/candidate/preferences',
    icon: 'i-heroicons-adjustments-horizontal',
  },
  { label: 'Profile', to: '/candidate/profile', icon: 'i-heroicons-user' },
]

const mobileNav = [
  { label: 'Dashboard', to: '/candidate/dashboard', icon: 'i-heroicons-home' },
  { label: 'Discovery', to: '/candidate/jobs', icon: 'i-heroicons-magnifying-glass' },
  { label: 'Messages', to: '/candidate/chat', icon: 'i-heroicons-chat-bubble-left-right' },
  { label: 'Profile', to: '/candidate/profile', icon: 'i-heroicons-user' },
]

async function handleLogout() {
  await store.logout()
  router.push('/candidate/login')
}

const sidebarOpen = ref(false)
router.afterEach(() => {
  sidebarOpen.value = false
})
</script>

<template>
  <div class="min-h-screen flex" style="background: var(--bg); color: var(--ink)">
    <!-- Mobile backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 lg:hidden"
      style="background: rgba(0, 0, 0, 0.35)"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      style="background: var(--bg-deep); border-right: 1px solid var(--line)"
    >
      <!-- Brand -->
      <div class="flex items-center gap-3 px-5 py-5" style="border-bottom: 1px solid var(--line)">
        <div
          class="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style="
            background: var(--ink);
            color: var(--bg);
            font-family: 'Fraunces', serif;
            font-size: 16px;
            font-style: italic;
            letter-spacing: -0.04em;
          "
        >
          m
        </div>
        <span
          style="
            font-family: 'Fraunces', serif;
            font-size: 18px;
            letter-spacing: -0.04em;
            color: var(--ink);
          "
        >
          my<em style="font-style: italic; color: var(--accent)">hr</em>
        </span>
        <UBadge label="Jobs" color="primary" variant="subtle" class="ml-auto" />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors"
          style="color: var(--ink-muted)"
          active-class="nav-active"
        >
          <UIcon :name="item.icon" class="w-4 h-4 shrink-0" />
          {{ item.label }}
          <span
            v-if="item.to === '/candidate/jobs' && scoringActive"
            class="scanning-pill ml-auto"
          >
            <span class="scanning-dot" />AI
          </span>
        </NuxtLink>
      </nav>

      <!-- User section -->
      <div class="p-4" style="border-top: 1px solid var(--line)">
        <div class="flex items-center gap-3 mb-3">
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
            style="
              background: var(--accent-soft);
              color: var(--accent);
              font-family: 'Fraunces', serif;
              font-style: italic;
              border: 1px solid var(--line);
            "
          >
            {{
              store.candidate?.fullName?.[0]?.toUpperCase() ??
              store.candidate?.email?.[0]?.toUpperCase() ??
              'C'
            }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium truncate" style="color: var(--ink)">
              {{ store.candidate?.fullName ?? store.candidate?.email }}
            </p>
            <p class="text-xs truncate" style="color: var(--ink-muted)">Job Seeker</p>
          </div>
        </div>
        <UButton
          variant="ghost"
          size="xs"
          color="error"
          icon="i-heroicons-arrow-right-on-rectangle"
          block
          @click="handleLogout"
        >
          Sign out
        </UButton>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile topbar -->
      <header
        class="h-14 flex items-center justify-between px-4 shrink-0 lg:hidden"
        style="background: var(--bg-deep); border-bottom: 1px solid var(--line)"
      >
        <UButton
          icon="i-heroicons-bars-3"
          variant="ghost"
          size="sm"
          @click="sidebarOpen = !sidebarOpen"
        />
        <div class="flex items-center gap-2">
          <div
            class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style="
              background: var(--ink);
              color: var(--bg);
              font-family: 'Fraunces', serif;
              font-size: 14px;
              font-style: italic;
              letter-spacing: -0.04em;
            "
          >
            m
          </div>
          <span
            style="
              font-family: 'Fraunces', serif;
              font-size: 16px;
              letter-spacing: -0.04em;
              color: var(--ink);
            "
          >
            my<em style="font-style: italic; color: var(--accent)">hr</em>
          </span>
        </div>
        <div class="w-8" />
        <!-- Spacer -->
      </header>

      <main class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
        <slot />
      </main>

      <!-- Bottom Navigation for Mobile Viewports -->
      <div
        class="fixed bottom-0 left-0 right-0 z-30 lg:hidden flex justify-around items-center h-16 border-t px-2"
        style="background: var(--bg-deep); border-top: 1px solid var(--line)"
      >
        <NuxtLink
          v-for="item in mobileNav"
          :key="item.to"
          :to="item.to"
          class="flex flex-col items-center justify-center flex-1 py-1 text-[10px] transition-colors"
          style="color: var(--ink-muted)"
          active-class="mobile-nav-active"
        >
          <UIcon :name="item.icon" class="w-5 h-5 mb-0.5" />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scanning-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  color: var(--accent);
  letter-spacing: 0.04em;
}
.scanning-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
  animation: scan-pulse 1.2s ease-in-out infinite;
}
@keyframes scan-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.3; }
}
.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--ink);
}
.nav-active {
  background: var(--ink) !important;
  color: var(--bg) !important;
}
.nav-active:hover {
  background: var(--ink) !important;
  color: var(--bg) !important;
}
.mobile-nav-active {
  color: var(--ink) !important;
}
</style>
