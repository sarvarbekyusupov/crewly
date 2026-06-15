<script setup lang="ts">
const { t } = useI18n()
const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const api = useApi()
const toast = useToast()

onErrorCaptured((err) => {
  console.error('[layout] unhandled error:', err)
  toast.add({ title: 'Something went wrong', description: String(err), color: 'error' })
  return true
})

const { data: counts } = await useAsyncData(
  'nav-counts',
  async () => {
    try {
      const [jobs, apps, conversations] = await Promise.all([
        api
          .get<{ total: number }>('/api/v1/jobs', { status: 'active', limit: 1 })
          .catch(() => ({ total: 0 })),
        api
          .get<{ total: number }>('/api/v1/applications', { limit: 1 })
          .catch(() => ({ total: 0 })),
        api
          .get<{ total: number }>('/api/v1/conversations', { limit: 1 })
          .catch(() => ({ total: 0 })),
      ])
      return {
        jobs: jobs.total ?? 0,
        applications: apps.total ?? 0,
        conversations: conversations.total ?? 0,
      }
    } catch {
      return { jobs: 0, applications: 0, conversations: 0 }
    }
  },
  { server: false },
)

const sseState = useSseConnectionState()
const eventsStore = useEventsStore()
const agentThoughts = storeToRefs(eventsStore).agentThoughts

const navGroups = computed(() => [
  {
    label: t('nav.workspace'),
    items: [
      { label: t('nav.dashboard'), to: '/employer/dashboard', icon: 'i-heroicons-home' },
      {
        label: t('nav.jobs'),
        to: '/employer/jobs',
        icon: 'i-heroicons-briefcase',
        count: counts.value?.jobs,
      },
      {
        label: t('nav.applications'),
        to: '/employer/applications',
        icon: 'i-heroicons-users',
        count: counts.value?.applications,
      },
      {
        label: t('nav.conversations'),
        to: '/employer/conversations',
        icon: 'i-heroicons-chat-bubble-left-right',
        count: counts.value?.conversations,
      },
      {
        label: 'HH Chats',
        to: '/employer/hh-chats',
        icon: 'i-heroicons-chat-bubble-oval-left-ellipsis',
      },
    ],
  },
  {
    label: t('nav.talent'),
    items: [
      { label: t('nav.candidates'), to: '/employer/candidates', icon: 'i-heroicons-user-circle' },
      { label: t('nav.placements'), to: '/employer/placements', icon: 'i-heroicons-check-badge' },
    ],
  },
  {
    label: t('nav.finance'),
    items: [
      { label: t('nav.invoices'), to: '/employer/invoices', icon: 'i-heroicons-document-text' },
    ],
  },
  {
    label: t('nav.intelligence') || 'Intelligence',
    items: [
      { label: 'Analytics', to: '/employer/analytics', icon: 'i-heroicons-chart-bar' },
      ...(auth.can('admin')
        ? [
            {
              label: t('nav.sourcing'),
              to: '/employer/sourcing',
              icon: 'i-heroicons-magnifying-glass',
            },
          ]
        : []),
    ],
  },
])

const { breadcrumbLabel, clearBreadcrumbLabel } = useBreadcrumb()
watch(
  () => route.path,
  () => clearBreadcrumbLabel(),
)

const crumbs = computed(() => {
  const parts = route.path
    .split('/')
    .filter(Boolean)
    .filter((p) => p !== 'employer')
  if (!parts.length) return []
  return parts.map((p, i) => {
    const isLast = i === parts.length - 1
    const rawLabel = p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' ')
    const label = isLast && breadcrumbLabel.value ? breadcrumbLabel.value : rawLabel
    // Reconstruct route using 'parts' before filtering or adjust path relative to employer namespace
    const fullParts = route.path.split('/').filter(Boolean)
    const employerIndex = fullParts.indexOf('employer')
    const actualIndex =
      employerIndex >= 0 && fullParts.indexOf(p) > employerIndex
        ? fullParts.indexOf(p)
        : fullParts.indexOf(p)
    return { label, to: '/' + fullParts.slice(0, actualIndex + 1).join('/'), current: isLast }
  })
})

async function handleLogout() {
  await auth.logout()
  router.push('/employer/login')
}

const { locale, locales, setLocale } = useI18n()
const availableLocales = computed(() => locales.value as Array<{ code: string; name: string }>)
const colorMode = useColorMode()
const sidebarOpen = ref(false)
router.afterEach(() => {
  sidebarOpen.value = false
})

const { connect: connectSSE, disconnect: disconnectSSE } = useEventStream()
const { eventCount } = useSseEventCount()
watch(eventCount, () => refreshNuxtData('nav-counts'))
onMounted(() => connectSSE())
onUnmounted(() => disconnectSSE())

// ── Command palette ──
const ui = useUIStore()
const { searchTerm, commandGroups, onCommandSelect, openPalette } =
  useCommandPaletteSearch(navGroups)
</script>

<template>
  <a href="#main-content" class="skip-link">{{ t('nav.skipToContent') }}</a>
  <div style="background: var(--bg); color: var(--ink); min-height: 100vh; display: flex">
    <!-- Mobile backdrop -->
    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-30 lg:hidden"
      style="background: rgba(0, 0, 0, 0.35)"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside class="sidebar" :class="sidebarOpen ? 'sidebar-open' : 'sidebar-closed'">
      <!-- Brand -->
      <NuxtLink to="/employer/dashboard" class="brand-row">
        <img src="/crewly-logo-horizontal.svg" alt="Crewly" class="brand-logo block dark:hidden" />
        <img
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          class="brand-logo hidden dark:block"
        />
      </NuxtLink>

      <!-- Portal indicator -->
      <div class="portal-indicator">
        <span class="live-dot" />
        <span>{{ t('nav.companyPortal') }}</span>
      </div>

      <!-- Nav -->
      <nav class="sidebar-nav">
        <div v-for="group in navGroups" :key="group.label" class="nav-group">
          <div class="nav-label">{{ group.label }}</div>
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="nav-item"
            active-class="nav-item-active"
          >
            <span class="nav-ico">
              <UIcon :name="item.icon" style="width: 15px; height: 15px" />
            </span>
            <span class="nav-text">{{ item.label }}</span>
            <span v-if="item.count" class="nav-count">{{ item.count }}</span>
          </NuxtLink>
        </div>
      </nav>

      <!-- Agent status card -->
      <div class="agent-card">
        <div class="agent-head">
          <div class="agent-live">
            <span
              class="live-dot"
              :class="{ 'live-dot--active': agentThoughts[0]?.action === 'started' }"
            />
            <span>{{ t('agent.live') }}</span>
          </div>
          <span class="agent-ver">v0.8</span>
        </div>
        <div v-if="agentThoughts.length" class="agent-thoughts">
          <div
            v-for="thought in agentThoughts.slice(0, 4)"
            :key="thought.ts"
            class="agent-thought"
            :class="`agent-thought--${thought.action}`"
          >
            <span class="thought-dot" />
            <span class="thought-text">
              <span class="thought-agent">{{ thought.agent }}</span>
              {{ thought.purpose }}
            </span>
            <span v-if="thought.latency && thought.action === 'completed'" class="thought-ms">
              {{ thought.latency }}ms
            </span>
          </div>
        </div>
        <div v-else class="agent-label">
          {{ t('agent.sourcing', { count: counts?.jobs ?? 0 }) }}
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column">
      <!-- Topbar -->
      <header class="topbar">
        <!-- Mobile hamburger -->
        <button
          type="button"
          class="lg:hidden"
          style="
            width: 32px;
            height: 32px;
            display: grid;
            place-items: center;
            border-radius: 7px;
            color: var(--ink-muted);
            border: none;
            cursor: pointer;
            background: none;
            margin-right: 8px;
          "
          :aria-label="sidebarOpen ? 'Close menu' : 'Open menu'"
          :aria-expanded="sidebarOpen"
          @click="sidebarOpen = !sidebarOpen"
        >
          <UIcon name="i-heroicons-bars-3" style="width: 18px; height: 18px" />
        </button>

        <!-- Breadcrumbs -->
        <div class="crumbs hidden lg:flex">
          <template v-for="(c, i) in crumbs" :key="i">
            <span v-if="i > 0" class="crumb-sep" aria-hidden="true">/</span>
            <NuxtLink v-if="!c.current" :to="c.to" class="crumb-link">{{ c.label }}</NuxtLink>
            <span v-else class="crumb-here">{{ c.label }}</span>
          </template>
        </div>

        <!-- Search -->
        <button
          type="button"
          role="search"
          class="topbar-search hidden xl:flex"
          @click="openPalette()"
        >
          <UIcon
            name="i-heroicons-magnifying-glass"
            style="width: 14px; height: 14px; color: var(--ink-subtle); flex-shrink: 0"
          />
          <span style="flex: 1; font-size: 13px; color: var(--ink-subtle)">{{
            t('nav.commandPlaceholder')
          }}</span>
          <span class="search-kbd">⌘ K</span>
        </button>

        <!-- Actions -->
        <div class="topbar-actions ml-auto">
          <span
            v-if="sseState !== 'idle'"
            class="sse-pill hidden md:inline-flex"
            :class="{
              'sse-pill-connected': sseState === 'connected',
              'sse-pill-warn': sseState === 'reconnecting',
            }"
            role="status"
          >
            <span class="live-dot" />
            {{ sseState === 'connected' ? t('nav.sseConnected') : t('nav.sseReconnecting') }}
          </span>
          <USelect
            :model-value="locale"
            :items="availableLocales.map((l) => ({ label: l.name, value: l.code }))"
            size="xs"
            class="hidden md:block w-28"
            @update:model-value="setLocale($event as any)"
          />
          <button
            type="button"
            class="icon-btn grid"
            :aria-label="colorMode.value === 'dark' ? 'Light mode' : 'Dark mode'"
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
          >
            <UIcon
              :name="colorMode.value === 'dark' ? 'i-heroicons-sun' : 'i-heroicons-moon'"
              style="width: 15px; height: 15px"
            />
          </button>
          <!-- Notifications Popover -->
          <UPopover :close-on-content-click="false">
            <button type="button" class="icon-btn relative" :aria-label="t('nav.notifications')">
              <UIcon name="i-heroicons-bell" style="width: 15px; height: 15px" />
              <span
                class="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse pointer-events-none"
              />
            </button>

            <template #content>
              <div
                class="w-80 p-4 space-y-3 bg-surface border border-line rounded-lg shadow-xl z-50"
              >
                <div class="flex items-center justify-between pb-2 border-b border-line-soft">
                  <span class="text-xs font-mono font-bold text-ink uppercase tracking-wider"
                    >Recruiter Alerts</span
                  >
                  <UBadge label="3 New" size="xs" color="primary" variant="subtle" />
                </div>
                <div class="space-y-3 max-h-60 overflow-y-auto scrollbar-thin">
                  <div class="flex items-start gap-2.5 text-xs">
                    <div
                      class="w-6 h-6 rounded-full bg-accent-soft flex items-center justify-center shrink-0"
                    >
                      <UIcon name="i-heroicons-sparkles" class="w-3.5 h-3.5 text-accent" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-ink truncate">Matchmaker matched John Doe</p>
                      <p class="text-[10px] text-ink-muted leading-tight mt-0.5">
                        Matched with Senior Frontend Engineer with 92% match score.
                      </p>
                      <span class="text-[9px] text-ink-subtle mt-1 block">5m ago</span>
                    </div>
                  </div>
                  <div class="flex items-start gap-2.5 text-xs">
                    <div
                      class="w-6 h-6 rounded-full bg-info-soft flex items-center justify-center shrink-0"
                    >
                      <UIcon name="i-heroicons-envelope-open" class="w-3.5 h-3.5 text-info" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-ink truncate">Outreach replied by Alice</p>
                      <p class="text-[10px] text-ink-muted leading-tight mt-0.5">
                        Alice Smith booked an interview through automated outreach.
                      </p>
                      <span class="text-[9px] text-ink-subtle mt-1 block">2h ago</span>
                    </div>
                  </div>
                  <div class="flex items-start gap-2.5 text-xs">
                    <div
                      class="w-6 h-6 rounded-full bg-positive-soft flex items-center justify-center shrink-0"
                    >
                      <UIcon name="i-heroicons-calendar" class="w-3.5 h-3.5 text-positive" />
                    </div>
                    <div class="min-w-0 flex-1">
                      <p class="font-medium text-ink truncate">Interview scheduled</p>
                      <p class="text-[10px] text-ink-muted leading-tight mt-0.5">
                        Google Meet link created for candidate Bob Jones.
                      </p>
                      <span class="text-[9px] text-ink-subtle mt-1 block">Yesterday</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </UPopover>
          <!-- User avatar + settings + logout -->
          <div class="topbar-user">
            <div
              class="topbar-avatar hidden xs:grid"
              :title="auth.user?.fullName"
              :aria-label="auth.user?.fullName ?? t('nav.settings')"
              role="img"
            >
              {{ auth.user?.fullName?.[0] ?? '?' }}
            </div>
            <NuxtLink to="/employer/settings" class="icon-btn" :aria-label="t('nav.settings')">
              <UIcon name="i-heroicons-cog-6-tooth" style="width: 15px; height: 15px" />
            </NuxtLink>
            <button
              type="button"
              class="icon-btn"
              :aria-label="t('nav.logout')"
              @click="handleLogout"
            >
              <UIcon
                name="i-heroicons-arrow-right-on-rectangle"
                style="width: 15px; height: 15px"
              />
            </button>
          </div>
        </div>
      </header>

      <!-- Page -->
      <main id="main-content" class="page-main" tabindex="-1">
        <slot />
      </main>
    </div>
  </div>

  <!-- Command palette -->
  <UModal v-model:open="ui.paletteOpen" :close="false">
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="commandGroups"
        :placeholder="t('nav.commandPlaceholder')"
        @update:model-value="onCommandSelect as any"
      />
    </template>
  </UModal>
</template>

<style scoped>
/* ── Sidebar ── */
.sidebar {
  width: 232px;
  flex-shrink: 0;
  height: 100dvh;
  position: sticky;
  top: 0;
  border-right: 1px solid var(--line);
  background: var(--bg-deep);
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: transform 0.2s;
  z-index: 40;
}
@media (max-width: 1023px) {
  .sidebar {
    position: fixed;
    inset-y: 0;
    left: 0;
  }
  .sidebar-open {
    transform: translateX(0);
  }
  .sidebar-closed {
    transform: translateX(-100%);
  }
}
@media (min-width: 1024px) {
  .sidebar-closed {
    transform: translateX(0);
  }
}

.brand-row {
  display: flex;
  align-items: center;
  padding: 4px 6px;
  border-radius: 7px;
  text-decoration: none;
  transition: opacity 0.12s;
}
.brand-row:hover {
  opacity: 0.85;
}

.brand-logo {
  height: 20px;
  width: auto;
}

.portal-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--ink-subtle);
}
.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 20px;
  flex: 1;
  overflow-y: auto;
}
.nav-group {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.nav-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-subtle);
  padding: 6px 10px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 7px;
  font-size: 13px;
  color: var(--ink-muted);
  text-decoration: none;
  transition:
    background 0.12s,
    color 0.12s;
}
.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--ink);
}
.nav-item-active {
  background: var(--accent-soft) !important;
  color: var(--accent) !important;
}
.nav-ico {
  width: 16px;
  height: 16px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.nav-text {
  flex: 1;
}
.nav-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
}
.nav-item-active .nav-count {
  color: var(--accent);
  opacity: 0.7;
}

/* ── Agent card ── */
.agent-card {
  border: 1px solid var(--line);
  background: var(--bg-elevated);
  border-radius: 10px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: auto;
}
.agent-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.agent-live {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.agent-ver {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
}
.agent-label {
  font-size: 12px;
  color: var(--ink);
  line-height: 1.4;
}
.agent-thoughts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.agent-thought {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--ink-muted);
  min-width: 0;
}
.agent-thought--started {
  color: var(--ink);
}
.agent-thought--completed {
  color: var(--ink-subtle);
}
.agent-thought--failed {
  color: var(--warn);
}
.thought-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
  opacity: 0.6;
}
.agent-thought--started .thought-dot {
  background: var(--accent);
  opacity: 1;
  animation: scan-pulse 1.2s ease-in-out infinite;
}
@keyframes scan-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
.thought-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.thought-agent {
  font-weight: 600;
  margin-right: 3px;
}
.thought-ms {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--ink-subtle);
  flex-shrink: 0;
}
.live-dot--active {
  animation: scan-pulse 1.2s ease-in-out infinite;
  background: var(--accent) !important;
}

/* ── Topbar ── */
.topbar {
  height: 56px;
  border-bottom: 1px solid var(--line);
  padding: 0 28px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg);
  position: sticky;
  top: 0;
  z-index: 10;
  flex-shrink: 0;
}

.crumbs {
  display: flex;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--ink-muted);
  letter-spacing: 0.04em;
}
.crumb-sep {
  opacity: 0.4;
  margin: 0 8px;
}
.crumb-link {
  color: var(--ink-muted);
  text-decoration: none;
  transition: color 0.12s;
}
.crumb-link:hover {
  color: var(--accent);
}
.crumb-here {
  color: var(--ink);
}

.topbar-search {
  flex: 1;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-elevated);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 10px;
  margin-left: 14px;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.12s;
}
.topbar-search:hover {
  border-color: var(--ink-muted);
}
.search-kbd {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--paper);
  white-space: nowrap;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.icon-btn {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  color: var(--ink-muted);
  transition:
    background 0.12s,
    color 0.12s;
  border: none;
  cursor: pointer;
  background: none;
  text-decoration: none;
}
.icon-btn:hover {
  background: var(--bg-elevated);
  color: var(--ink);
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-left: 8px;
  border-left: 1px solid var(--line);
}
.topbar-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--accent-soft);
  color: var(--accent);
  display: grid;
  place-items: center;
  font-family: 'Fraunces', serif;
  font-size: 13px;
  font-style: italic;
  border: 1px solid var(--line);
  margin-right: 4px;
}

/* ── Page main ── */
.page-main {
  flex: 1;
  overflow-y: auto;
  padding: 32px 40px 80px;
}
@media (max-width: 768px) {
  .page-main {
    padding: 20px 16px 60px;
  }
  .topbar {
    padding: 0 16px;
  }
}

.skip-link {
  position: absolute;
  left: -9999px;
  top: 0;
  z-index: 200;
  padding: 8px 16px;
  background: var(--ink);
  color: var(--bg);
  border-radius: 0 0 8px 0;
  font-size: 13px;
  text-decoration: none;
}
.skip-link:focus {
  left: 0;
}

.sse-pill {
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--ink-subtle);
  padding: 4px 8px;
  border: 1px solid var(--line-soft);
  border-radius: 999px;
}
.sse-pill-warn {
  color: var(--warn);
  border-color: var(--warn);
}
.sse-pill-connected {
  color: var(--positive);
  border-color: var(--positive);
}
.sse-pill-connected .live-dot {
  background: var(--positive);
}
</style>
