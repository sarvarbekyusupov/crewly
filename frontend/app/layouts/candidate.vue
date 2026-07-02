<script setup lang="ts">
import {
  scoringActive,
  resumeParseStatus,
  newMessageApplicationIds,
  useCandidateEventStream,
} from '~/composables/useCandidateEventStream'

const { t } = useI18n()

const hasNewMessages = computed(() => newMessageApplicationIds.value.size > 0)

const store = useCandidateAuthStore()
const router = useRouter()
const toast = useToast()

const { isTma, init: initTma, showBackButton, hideBackButton } = useTma()

const { connect, disconnect } = useCandidateEventStream()
onMounted(() => {
  connect()
  if (isTma.value) {
    initTma()
    showBackButton(() => router.back())
  }
})
onUnmounted(() => {
  disconnect()
  if (isTma.value) hideBackButton()
})

watch(resumeParseStatus, (status) => {
  if (status === 'parsing') {
    toast.add({ title: t('candidate.profile.cvUploaded'), color: 'info', duration: 0 })
  } else if (status === 'done') {
    toast.add({
      title: t('candidate.profile.resumeAnalysisComplete'),
      color: 'success',
      duration: 4000,
    })
  } else if (status === 'error') {
    toast.add({ title: t('candidate.profile.cvUploadFailed'), color: 'error', duration: 5000 })
  }
})

onErrorCaptured((err) => {
  console.error('[layout:candidate] unhandled error:', err)
  toast.add({ title: t('common.error'), description: String(err), color: 'error' })
  return true
})

const nav = computed(() => [
  { label: t('nav.dashboard'), to: '/candidate/dashboard', icon: 'i-heroicons-squares-2x2' },
  { label: t('nav.jobs'), to: '/candidate/jobs', icon: 'i-heroicons-magnifying-glass' },
  { label: t('nav.conversations'), to: '/candidate/inbox', icon: 'i-heroicons-inbox' },
  { label: 'HH Messages', to: '/candidate/hh-chats', icon: 'i-heroicons-chat-bubble-left-right' },
  {
    label: t('candidate.tracker.title'),
    to: '/candidate/tracker',
    icon: 'i-heroicons-clipboard-document-list',
  },
  { label: 'CV Builder', to: '/candidate/cv-builder', icon: 'i-heroicons-sparkles' },
])

const bottomNav = computed(() => [
  { label: t('candidate.profile.title'), to: '/candidate/profile', icon: 'i-heroicons-user' },
  { label: t('nav.settings'), to: '/candidate/preferences', icon: 'i-heroicons-cog-6-tooth' },
])

const mobileNav = computed(() => [
  { label: t('nav.dashboard'), to: '/candidate/dashboard', icon: 'i-heroicons-squares-2x2' },
  { label: t('nav.jobs'), to: '/candidate/jobs', icon: 'i-heroicons-magnifying-glass' },
  { label: t('nav.conversations'), to: '/candidate/inbox', icon: 'i-heroicons-inbox' },
  {
    label: t('candidate.tracker.title'),
    to: '/candidate/tracker',
    icon: 'i-heroicons-clipboard-document-list',
  },
  { label: 'CV Builder', to: '/candidate/cv-builder', icon: 'i-heroicons-sparkles' },
  { label: t('nav.settings'), to: '/candidate/preferences', icon: 'i-heroicons-cog-6-tooth' },
])

async function handleLogout() {
  await store.logout()
  router.push('/candidate/login')
}

const sidebarOpen = ref(false)
router.afterEach(() => {
  sidebarOpen.value = false
})

// ── Command palette ──
const ui = useUIStore()
const searchTerm = ref('')
const navGroups = computed(() => [
  {
    label: t('nav.commandGroupNav'),
    items: [
      ...nav.value,
      { label: t('nav.settings'), to: '/candidate/preferences', icon: 'i-heroicons-cog-6-tooth' },
    ].map((item) => ({ to: item.to, label: item.label, icon: item.icon })),
  },
])

const commandGroups = computed(() => [
  {
    id: 'nav',
    label: t('nav.commandGroupNav'),
    items: (navGroups.value[0]?.items ?? [])
      .filter((item) => item.label.toLowerCase().includes(searchTerm.value.toLowerCase()))
      .map((item) => ({ id: item.to, label: item.label, icon: item.icon, to: item.to })),
  },
])

function onCommandSelect(item: { to: string }) {
  if (item && item.to) {
    router.push(item.to)
    ui.closePalette()
  }
}

const handleKbd = (e: KeyboardEvent) => {
  if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    ui.openPalette()
  }
}

onMounted(() => document.addEventListener('keydown', handleKbd))
onUnmounted(() => document.removeEventListener('keydown', handleKbd))
</script>

<template>
  <div class="h-screen overflow-hidden flex" style="background: var(--bg); color: var(--ink)">
    <!-- Mobile backdrop -->
    <div
      v-if="!isTma && sidebarOpen"
      class="fixed inset-0 z-30 lg:hidden"
      style="background: rgba(0, 0, 0, 0.35)"
      @click="sidebarOpen = false"
    />

    <!-- Sidebar -->
    <aside
      v-if="!isTma"
      class="fixed inset-y-0 left-0 z-40 w-64 flex flex-col transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:z-auto"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      style="background: var(--bg-deep); border-right: 1px solid var(--line)"
    >
      <!-- Brand -->
      <div class="flex items-center gap-3 px-5 pt-6 pb-5">
        <img
          src="/crewly-logo-horizontal.svg"
          alt="Crewly"
          class="block dark:hidden"
          style="height: 22px; width: auto"
        />
        <img
          src="/crewly-logo-horizontal-white.svg"
          alt="Crewly"
          class="hidden dark:block"
          style="height: 22px; width: auto"
        />
      </div>

      <!-- Main Navigation -->
      <nav class="px-3 pt-1 space-y-0.5">
        <NuxtLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          active-class="nav-active"
        >
          <UIcon :name="item.icon" class="w-4.5 h-4.5 shrink-0" />
          {{ item.label }}
          <span v-if="item.to === '/candidate/jobs' && scoringActive" class="scanning-pill ml-auto">
            <span class="scanning-dot" />AI
          </span>
          <span
            v-if="item.to === '/candidate/inbox' && hasNewMessages"
            class="new-msg-dot ml-auto"
          />
        </NuxtLink>
      </nav>

      <!-- Divider -->
      <div class="mx-3 my-3" style="height: 1px; background: var(--line)" />

      <!-- Bottom Navigation (Profile + Settings) -->
      <nav class="px-3 space-y-0.5">
        <NuxtLink
          v-for="item in bottomNav"
          :key="item.to"
          :to="item.to"
          class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
          active-class="nav-active"
        >
          <UIcon :name="item.icon" class="w-4.5 h-4.5 shrink-0" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- Spacer -->
      <div class="flex-1" />

      <!-- AI Agent status -->
      <div class="px-5 py-2 flex items-center gap-2" style="border-top: 1px solid var(--line)">
        <span
          class="w-1.5 h-1.5 rounded-full shrink-0 transition-colors"
          :style="scoringActive ? 'background: var(--positive)' : 'background: var(--ink-subtle)'"
        />
        <span class="text-xs font-mono" style="color: var(--ink-subtle); letter-spacing: 0.04em">{{
          scoringActive ? t('candidate.layout.agentScanning') : t('candidate.layout.agentIdle')
        }}</span>
      </div>

      <!-- Help & Support -->
      <div class="px-3 pb-2">
        <a href="mailto:support@crewly.uz" class="support-card" style="text-decoration: none">
          <span class="support-icon">
            <UIcon name="i-heroicons-question-mark-circle" class="w-5 h-5" />
          </span>
          <div class="text-left">
            <p class="support-title">{{ t('candidate.layout.supportTitle') }}</p>
            <p class="support-sub">{{ t('candidate.layout.supportSub') }}</p>
          </div>
        </a>
      </div>

      <!-- User section -->
      <div class="px-4 py-3 flex items-center gap-3" style="border-top: 1px solid var(--line)">
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
          <p class="text-xs truncate" style="color: var(--ink-muted)">
            {{ t('candidate.layout.jobSeeker') }}
          </p>
        </div>
        <UTooltip :text="t('nav.logout')">
          <UButton
            variant="ghost"
            size="xs"
            color="neutral"
            icon="i-heroicons-arrow-right-on-rectangle"
            :ui="{ base: 'opacity-40 hover:opacity-100 transition-opacity' }"
            @click="handleLogout"
          />
        </UTooltip>
      </div>
    </aside>

    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile topbar -->
      <header
        v-if="!isTma"
        class="h-14 flex items-center justify-between px-4 shrink-0 lg:hidden"
        style="background: var(--bg-deep); border-bottom: 1px solid var(--line)"
      >
        <UButton
          icon="i-heroicons-bars-3"
          variant="ghost"
          size="sm"
          aria-label="Toggle sidebar"
          @click="sidebarOpen = !sidebarOpen"
        />
        <div class="flex items-center">
          <img
            src="/crewly-logo-horizontal.svg"
            alt="Crewly"
            class="block dark:hidden"
            style="height: 18px; width: auto"
          />
          <img
            src="/crewly-logo-horizontal-white.svg"
            alt="Crewly"
            class="hidden dark:block"
            style="height: 18px; width: auto"
          />
        </div>
        <div class="w-8" />
        <!-- Spacer -->
      </header>

      <main
        class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col"
        :class="isTma ? 'pb-4' : 'pb-20 lg:pb-8'"
        style="height: 0"
      >
        <slot />
      </main>

      <!-- Bottom Navigation for Mobile Viewports -->
      <div
        v-if="!isTma"
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
          <div class="relative">
            <UIcon :name="item.icon" class="w-5 h-5" />
            <span v-if="item.to === '/candidate/inbox' && hasNewMessages" class="mobile-new-dot" />
          </div>
          <span class="mt-0.5">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </div>
  </div>

  <!-- Command palette -->
  <UModal v-model:open="ui.paletteOpen" :close="false">
    <template #content>
      <UCommandPalette
        v-model:search-term="searchTerm"
        :groups="commandGroups"
        placeholder="Search pages..."
        @update:model-value="onCommandSelect as any"
      />
    </template>
  </UModal>
</template>

<style scoped>
.new-msg-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}
.mobile-new-dot {
  position: absolute;
  top: -2px;
  right: -4px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--accent);
  border: 1.5px solid var(--bg-deep);
}
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
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}
.nav-item {
  color: var(--ink-muted);
  position: relative;
}
.nav-item:hover {
  background: var(--bg-elevated);
  color: var(--ink);
}
.nav-active {
  background: color-mix(in srgb, var(--positive) 10%, transparent) !important;
  color: var(--positive) !important;
}
.nav-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6px;
  bottom: 6px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--positive);
}
.nav-active:hover {
  background: color-mix(in srgb, var(--positive) 14%, transparent) !important;
}
.mobile-nav-active {
  color: var(--ink) !important;
}

/* Support card */
.support-card {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--line);
  cursor: pointer;
  transition: all 0.12s;
  text-align: left;
}
.support-card:hover {
  border-color: var(--ink-subtle);
}
.support-icon {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--bg);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ink-muted);
  flex-shrink: 0;
}
.support-title {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink);
  line-height: 1.2;
}
.support-sub {
  font-size: 11px;
  color: var(--ink-subtle);
  margin-top: 1px;
}
</style>
