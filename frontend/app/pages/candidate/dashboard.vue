<script setup lang="ts">
import type { DiscoveredJob, SeekerApplication, PaginatedResponse } from '~/types/api'

definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const store = useCandidateAuthStore()
const api = useCandidateApi()

useHead({ title: 'Dashboard' })

interface HrApplication {
  id: string
  status: string
  matchScore?: string
  matchedAt?: string
  job: { id: string; title: string; company: { name: string } }
}

interface Profile {
  fullName?: string
  skills?: string[]
  resumeFileUrl?: string
  currentPosition?: string
  minMatchScore?: number | null
}

const [profileRes, topJobsRes, seekerAppsRes, hrAppsRes] = await Promise.all([
  useAsyncData('dash-profile', () =>
    api.get<Profile>('/api/v1/candidate-portal/profile').catch(() => null),
  ),
  useAsyncData('dash-top-jobs', () =>
    api
      .get<
        PaginatedResponse<DiscoveredJob>
      >('/api/v1/candidate-portal/discovered-jobs', { sortBy: 'score', page: 1, limit: 5 })
      .catch(() => null),
  ),
  useAsyncData('dash-seeker-apps', () =>
    api
      .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
      .catch(() => [] as SeekerApplication[]),
  ),
  useAsyncData('dash-hr-apps', () =>
    api
      .get<HrApplication[]>('/api/v1/candidate-portal/applications')
      .catch(() => [] as HrApplication[]),
  ),
])

const profile = profileRes.data
const topJobs = computed(() => topJobsRes.data.value?.data ?? [])
const seekerApps = computed(() => seekerAppsRes.data.value ?? [])
const hrApps = computed(() => hrAppsRes.data.value ?? [])

// Stats
const stats = computed(() => {
  const apps = seekerApps.value
  return {
    discovered: topJobsRes.data.value?.total ?? 0,
    applied: apps.filter((a) => a.status === 'applied').length,
    interviews: apps.filter((a) => a.status === 'interview').length,
    offers: apps.filter((a) => a.status === 'offer').length,
  }
})

// Profile completeness
const completeness = computed(() => {
  const p = profile.value
  if (!p) return 0
  const fields = [p.fullName, p.currentPosition, p.resumeFileUrl]
  const hasSkills = (p.skills?.length ?? 0) > 0 ? 1 : 0
  return Math.round(((fields.filter(Boolean).length + hasSkills) / (fields.length + 1)) * 100)
})

function scoreColor(score: number | null | undefined): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  if (score == null) return 'neutral'
  if (score >= 70) return 'success'
  if (score >= 40) return 'warning'
  return 'error'
}

function seekerStatusColor(status: string): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  const map: Record<string, 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error'> = {
    queued: 'warning',
    applied: 'primary',
    viewed: 'info',
    interview: 'success',
    rejected: 'error',
    offer: 'success',
    failed: 'error',
  }
  return map[status] ?? 'neutral'
}

const { t } = useI18n()
const scoringInProgress = ref(false)
const toast = useToast()

async function triggerScoring() {
  scoringInProgress.value = true
  try {
    await api.post('/api/v1/candidate-portal/discovered-jobs/score', {})
    toast.add({
      title: 'AI scoring queued',
      description: 'Scores ready in ~1 minute',
      color: 'success',
    })
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    scoringInProgress.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome header -->
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
      <p
        style="
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--ink-subtle);
          margin-bottom: 6px;
        "
      >
        Overview
      </p>
      <h1
        style="
          font-family: 'Fraunces', serif;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: -0.03em;
          color: var(--ink);
          font-weight: 400;
        "
      >
        Welcome back<template v-if="store.candidate?.fullName"
          >, {{ store.candidate.fullName.split(' ')[0] }}</template
        >
      </h1>
    </div>

    <!-- Profile completeness banner -->
    <div
      v-if="completeness < 80"
      class="rounded-lg px-4 py-3 flex items-center justify-between gap-4"
      style="background: var(--accent-soft); border: 1px solid var(--accent)"
    >
      <div class="flex items-center gap-3 min-w-0">
        <UIcon
          name="i-heroicons-user-circle"
          class="w-5 h-5 shrink-0"
          style="color: var(--accent)"
        />
        <div class="min-w-0">
          <p class="text-sm font-medium" style="color: var(--ink)">
            Profile {{ completeness }}% complete — better profiles get better matches
          </p>
          <div class="w-48 h-1 rounded-full mt-1 overflow-hidden" style="background: var(--line)">
            <div
              class="h-full rounded-full"
              :style="{ width: completeness + '%', background: 'var(--accent)' }"
            />
          </div>
        </div>
      </div>
      <UButton to="/candidate/profile" size="xs" variant="outline">Complete profile</UButton>
    </div>

    <!-- Active Screening Banner -->
    <div
      v-if="hrApps.some((a) => a.status === 'screening')"
      class="rounded-lg px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
      style="background: var(--ink); color: var(--bg)"
    >
      <div class="flex items-center gap-4">
        <div
          class="w-10 h-10 rounded-full bg-(--accent) flex items-center justify-center animate-pulse"
        >
          <UIcon name="i-heroicons-chat-bubble-left-right" class="w-6 h-6 text-(--bg)" />
        </div>
        <div>
          <p class="font-medium text-lg leading-tight">AI Screening in progress</p>
          <p class="text-xs opacity-70">The recruiter agent is waiting for your reply.</p>
        </div>
      </div>
      <UButton
        :to="`/candidate/chat/${hrApps.find((a) => a.status === 'screening')?.id}`"
        color="primary"
        size="md"
        icon="i-heroicons-chat-bubble-left-ellipsis"
      >
        Go to Chat
      </UButton>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div
        v-for="(item, key) in [
          {
            label: 'Jobs discovered',
            value: stats.discovered,
            icon: 'i-heroicons-magnifying-glass',
            color: 'var(--accent)',
          },
          {
            label: 'Applied',
            value: stats.applied,
            icon: 'i-heroicons-paper-airplane',
            color: 'var(--info)',
          },
          {
            label: 'Interviews',
            value: stats.interviews,
            icon: 'i-heroicons-chat-bubble-left-right',
            color: 'var(--warning)',
          },
          {
            label: 'Offers',
            value: stats.offers,
            icon: 'i-heroicons-trophy',
            color: 'var(--positive)',
          },
        ]"
        :key="key"
        class="rounded-lg p-4"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <div class="flex items-center gap-2 mb-2">
          <UIcon :name="item.icon" class="w-4 h-4" :style="{ color: item.color }" />
          <span class="text-xs" style="color: var(--ink-subtle)">{{ item.label }}</span>
        </div>
        <div
          style="
            font-family: 'Fraunces', serif;
            font-size: 28px;
            color: var(--ink);
            font-weight: 400;
            line-height: 1;
          "
        >
          {{ item.value }}
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Top job matches (3/5 width) -->
      <div class="lg:col-span-3 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="section-label">Top job matches</h2>
          <div class="flex items-center gap-2">
            <UButton
              variant="ghost"
              size="xs"
              icon="i-heroicons-sparkles"
              :loading="scoringInProgress"
              @click="triggerScoring"
            >
              Score all
            </UButton>
            <UButton variant="ghost" size="xs" to="/candidate/jobs">See all →</UButton>
          </div>
        </div>

        <div
          v-if="!topJobs.length"
          class="rounded-lg p-6 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <UIcon
            name="i-heroicons-briefcase"
            class="w-8 h-8 mx-auto mb-2"
            style="color: var(--ink-subtle)"
          />
          <p class="text-sm" style="color: var(--ink-muted)">No jobs discovered yet</p>
          <p class="text-xs mt-1" style="color: var(--ink-subtle)">
            Ask staff to run a job discovery scan
          </p>
        </div>

        <div
          v-for="job in topJobs"
          :key="job.id"
          class="rounded-lg p-3 flex items-start gap-3"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <a
                :href="job.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm font-medium hover:underline truncate"
                style="color: var(--ink)"
                >{{ job.title }}</a
              >
              <UBadge
                v-if="job.displayScore != null"
                :color="scoreColor(job.displayScore)"
                variant="subtle"
                size="xs"
                class="font-mono shrink-0"
                >{{ job.displayScore }}%</UBadge
              >
            </div>
            <p class="text-xs" style="color: var(--ink-muted)">
              {{ job.company }}<span v-if="job.location"> · {{ job.location }}</span>
            </p>
            <p
              v-if="job.matchExplanation"
              class="text-xs mt-1 line-clamp-1"
              style="color: var(--ink-subtle)"
            >
              {{ job.matchExplanation }}
            </p>
          </div>
          <NuxtLink to="/candidate/jobs">
            <UButton variant="ghost" size="xs" icon="i-heroicons-arrow-right" />
          </NuxtLink>
        </div>
      </div>

      <!-- Recent applications (2/5 width) -->
      <div class="lg:col-span-2 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="section-label">Recent applications</h2>
          <UButton variant="ghost" size="xs" to="/candidate/seeker-applications">See all →</UButton>
        </div>

        <div
          v-if="!seekerApps.length"
          class="rounded-lg p-6 text-center"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <UIcon
            name="i-heroicons-paper-airplane"
            class="w-8 h-8 mx-auto mb-2"
            style="color: var(--ink-subtle)"
          />
          <p class="text-sm" style="color: var(--ink-muted)">No applications yet</p>
          <UButton to="/candidate/jobs" size="xs" variant="outline" class="mt-2"
            >Browse jobs</UButton
          >
        </div>

        <div
          v-for="app in seekerApps.slice(0, 6)"
          :key="app.id"
          class="rounded-lg p-3 flex items-center justify-between gap-2"
          style="background: var(--surface); border: 1px solid var(--line-soft)"
        >
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate" style="color: var(--ink)">
              {{ app.discoveredJob?.title ?? '—' }}
            </p>
            <p class="text-xs truncate" style="color: var(--ink-muted)">
              {{ app.discoveredJob?.company }}
            </p>
          </div>
          <UBadge
            :color="seekerStatusColor(app.status)"
            variant="subtle"
            size="xs"
            class="shrink-0"
          >
            {{ app.status }}
          </UBadge>
        </div>

        <!-- HR pipeline apps -->
        <div v-if="hrApps.length" class="mt-4">
          <h3 class="section-label mb-2">In recruiter pipeline</h3>
          <div class="space-y-2">
            <div
              v-for="app in hrApps.slice(0, 3)"
              :key="app.id"
              class="rounded-lg p-3 flex items-center justify-between gap-2"
              style="background: var(--surface); border: 1px solid var(--line-soft)"
            >
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium truncate" style="color: var(--ink)">
                  {{ app.job?.title ?? '—' }}
                </p>
                <p class="text-xs" style="color: var(--ink-muted)">{{ app.job?.company?.name }}</p>
              </div>
              <div class="flex items-center gap-2">
                <UBadge
                  :color="app.status === 'screening' ? 'primary' : 'neutral'"
                  variant="subtle"
                  size="xs"
                  class="shrink-0"
                >
                  {{ app.status.replace(/_/g, ' ') }}
                </UBadge>
                <NuxtLink
                  v-if="['screening', 'responded', 'outreach_sent'].includes(app.status)"
                  :to="`/candidate/chat/${app.id}`"
                >
                  <UButton variant="ghost" size="xs" icon="i-heroicons-chat-bubble-left-right" />
                </NuxtLink>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <NuxtLink
        v-for="action in [
          { label: 'Browse Jobs', icon: 'i-heroicons-magnifying-glass', to: '/candidate/jobs' },
          {
            label: 'My Applications',
            icon: 'i-heroicons-paper-airplane',
            to: '/candidate/seeker-applications',
          },
          { label: 'Edit Profile', icon: 'i-heroicons-user', to: '/candidate/profile' },
          {
            label: 'Preferences',
            icon: 'i-heroicons-adjustments-horizontal',
            to: '/candidate/preferences',
          },
        ]"
        :key="action.to"
        :to="action.to"
        class="rounded-lg p-4 flex flex-col items-center gap-2 text-center transition-colors hover:opacity-80"
        style="
          background: var(--surface);
          border: 1px solid var(--line-soft);
          color: var(--ink-muted);
          text-decoration: none;
        "
      >
        <UIcon :name="action.icon" class="w-5 h-5" />
        <span class="text-xs font-medium" style="color: var(--ink)">{{ action.label }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
