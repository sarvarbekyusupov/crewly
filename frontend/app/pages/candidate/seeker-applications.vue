<script setup lang="ts">
import type { SeekerApplication } from '~/types/api'

definePageMeta({ middleware: 'candidate-auth', layout: 'candidate' })

const { t } = useI18n()
const api = useCandidateApi()
const toast = useToast()

useHead({ title: 'My Applications' })

const {
  data: applications,
  pending,
  refresh,
} = await useAsyncData('seeker-applications', () =>
  api
    .get<SeekerApplication[]>('/api/v1/candidate-portal/seeker-applications')
    .catch(() => [] as SeekerApplication[]),
)

const viewMode = ref<'list' | 'kanban'>('kanban')
const expandedId = ref<string | null>(null)
const updatingId = ref<string | null>(null)

const COLUMNS = [
  { status: 'queued', label: 'Queued', color: 'warning' as const },
  { status: 'applied', label: 'Applied', color: 'primary' as const },
  { status: 'viewed', label: 'Viewed', color: 'info' as const },
  { status: 'interview', label: 'Interview', color: 'success' as const },
  { status: 'offer', label: 'Offer', color: 'success' as const },
  { status: 'rejected', label: 'Rejected', color: 'error' as const },
]

const statusOptions = COLUMNS.map((c) => ({ label: c.label, value: c.status }))

function statusColor(status: string): 'neutral' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' {
  return COLUMNS.find((c) => c.status === status)?.color ?? 'neutral'
}

function columnApps(status: string) {
  return (applications.value ?? []).filter((a) =>
    status === 'rejected' ? a.status === 'rejected' || a.status === 'failed' : a.status === status,
  )
}

async function updateStatus(app: SeekerApplication, newStatus: string) {
  if (updatingId.value) return
  updatingId.value = app.id
  try {
    await api.patch(`/api/v1/candidate-portal/seeker-applications/${app.id}/status`, {
      status: newStatus,
    })
    await refresh()
  } catch (e) {
    toast.add({ title: t('common.error'), description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    updatingId.value = null
  }
}
</script>

<template>
  <div class="space-y-5">
    <!-- Header -->
    <div class="pb-4" style="border-bottom: 1px solid var(--line)">
      <div class="flex items-center justify-between">
        <div>
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
            Auto-Apply
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
            My Applications
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <!-- View toggle -->
          <div class="flex rounded-lg overflow-hidden" style="border: 1px solid var(--line)">
            <button
              class="px-3 py-1.5 text-xs transition-colors"
              :style="
                viewMode === 'kanban'
                  ? 'background: var(--ink); color: var(--bg);'
                  : 'background: var(--surface); color: var(--ink-muted);'
              "
              @click="viewMode = 'kanban'"
            >
              Board
            </button>
            <button
              class="px-3 py-1.5 text-xs transition-colors"
              :style="
                viewMode === 'list'
                  ? 'background: var(--ink); color: var(--bg);'
                  : 'background: var(--surface); color: var(--ink-muted);'
              "
              @click="viewMode = 'list'"
            >
              List
            </button>
          </div>
          <UButton
            variant="ghost"
            size="sm"
            icon="i-heroicons-arrow-path"
            :loading="pending"
            @click="() => refresh()"
          />
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-if="!pending && !applications?.length" class="flex flex-col items-center py-16 gap-3">
      <UIcon name="i-heroicons-paper-airplane" class="w-12 h-12" style="color: var(--ink-subtle)" />
      <p
        style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400"
      >
        No applications yet
      </p>
      <p class="text-sm" style="color: var(--ink-muted)">
        Browse jobs and hit Apply to start the queue.
      </p>
      <UButton to="/candidate/jobs" size="sm" variant="outline" icon="i-heroicons-magnifying-glass"
        >Browse Jobs</UButton
      >
    </div>

    <!-- Kanban board -->
    <div v-else-if="viewMode === 'kanban'" class="overflow-x-auto pb-4 snap-x snap-mandatory">
      <div class="flex gap-3 min-w-max">
        <div
          v-for="col in COLUMNS"
          :key="col.status"
          class="w-64 shrink-0 flex flex-col gap-2 snap-start"
        >
          <!-- Column header -->
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-1.5">
              <div
                class="w-2 h-2 rounded-full"
                :style="{
                  background:
                    col.color === 'warning'
                      ? 'var(--warning)'
                      : col.color === 'primary'
                        ? 'var(--accent)'
                        : col.color === 'info'
                          ? 'var(--info)'
                          : col.color === 'success'
                            ? 'var(--positive)'
                            : col.color === 'error'
                              ? 'var(--negative)'
                              : 'var(--ink-subtle)',
                }"
              />
              <span
                class="text-xs font-medium"
                style="color: var(--ink-muted); text-transform: uppercase; letter-spacing: 0.08em"
              >
                {{ col.label }}
              </span>
            </div>
            <span class="text-xs font-mono" style="color: var(--ink-subtle)">{{
              columnApps(col.status).length
            }}</span>
          </div>

          <!-- Cards -->
          <div
            class="rounded-lg min-h-20 p-1.5 space-y-1.5"
            style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
          >
            <div
              v-for="app in columnApps(col.status)"
              :key="app.id"
              class="rounded-md p-2.5 cursor-pointer transition-opacity"
              :style="{
                background: 'var(--surface)',
                border: '1px solid var(--line-soft)',
                opacity: updatingId === app.id ? 0.5 : 1,
              }"
              @click="expandedId = expandedId === app.id ? null : app.id"
            >
              <p class="text-sm font-medium leading-snug" style="color: var(--ink)">
                {{ app.discoveredJob?.title ?? '—' }}
              </p>
              <p class="text-xs mt-0.5 truncate" style="color: var(--ink-muted)">
                {{ app.discoveredJob?.company }}
              </p>
              <div class="flex items-center justify-between mt-2 gap-1">
                <span
                  class="text-xs font-mono px-1.5 py-0.5 rounded"
                  style="
                    background: var(--bg-elevated);
                    color: var(--ink-subtle);
                    text-transform: uppercase;
                    font-size: 9px;
                    letter-spacing: 0.06em;
                  "
                >
                  {{ app.source }}
                </span>
                <span v-if="app.coverLetter" class="text-xs" style="color: var(--accent)"
                  >✦ CL</span
                >
              </div>

              <!-- Expanded: move controls -->
              <div
                v-if="expandedId === app.id"
                class="mt-2 pt-2"
                style="border-top: 1px solid var(--line-soft)"
                @click.stop
              >
                <p class="text-xs mb-1.5" style="color: var(--ink-subtle)">Move to:</p>
                <div class="flex flex-wrap gap-1">
                  <button
                    v-for="c in COLUMNS.filter((c) => c.status !== col.status)"
                    :key="c.status"
                    class="text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-80"
                    :style="`background: var(--bg-elevated); color: var(--ink-muted); border: 1px solid var(--line);`"
                    @click="updateStatus(app, c.status); expandedId = null"
                  >
                    {{ c.label }}
                  </button>
                </div>
                <a
                  v-if="app.discoveredJob?.sourceUrl"
                  :href="app.discoveredJob.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="mt-2 flex items-center gap-1 text-xs hover:underline"
                  style="color: var(--accent)"
                >
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="w-3 h-3" />
                  View job
                </a>
                <p
                  v-if="app.coverLetter"
                  class="mt-2 text-xs leading-relaxed line-clamp-3"
                  style="color: var(--ink-subtle)"
                >
                  {{ app.coverLetter }}
                </p>
              </div>
            </div>

            <p
              v-if="!columnApps(col.status).length"
              class="text-xs text-center py-4"
              style="color: var(--ink-subtle)"
            >
              —
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- List view -->
    <div v-else class="space-y-3">
      <div
        v-for="app in applications"
        :key="app.id"
        class="rounded-lg overflow-hidden"
        style="background: var(--surface); border: 1px solid var(--line-soft)"
      >
        <div class="p-4 flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <a
              v-if="app.discoveredJob?.sourceUrl"
              :href="app.discoveredJob.sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="font-medium hover:underline"
              style="color: var(--ink); font-size: 15px"
            >
              {{ app.discoveredJob?.title ?? '—' }}
            </a>
            <span v-else class="font-medium" style="color: var(--ink); font-size: 15px">
              {{ app.discoveredJob?.title ?? '—' }}
            </span>
            <p class="text-sm mt-0.5" style="color: var(--ink-muted)">
              {{ app.discoveredJob?.company }}
              <span v-if="app.discoveredJob?.location"> · {{ app.discoveredJob.location }}</span>
            </p>
            <div class="flex items-center gap-2 mt-1 text-xs" style="color: var(--ink-subtle)">
              <span v-if="app.discoveredJob?.workMode">{{ app.discoveredJob.workMode }}</span>
              <span v-if="app.appliedAt">Applied {{ formatDateTime(app.appliedAt) }}</span>
              <span v-else>Queued {{ formatDateTime(app.createdAt) }}</span>
              <span
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 9px;
                  text-transform: uppercase;
                "
                >{{ app.source }}</span
              >
            </div>
            <p v-if="app.error" class="text-xs mt-1" style="color: var(--negative)">
              {{ app.error }}
            </p>
          </div>

          <div class="flex flex-col items-end gap-2 shrink-0">
            <UBadge :color="statusColor(app.status)" variant="subtle" size="sm">
              {{ app.status.replace(/_/g, ' ') }}
            </UBadge>
            <USelect
              :model-value="app.status"
              :options="statusOptions"
              size="xs"
              class="w-32"
              :disabled="updatingId === app.id"
              @update:model-value="(v) => updateStatus(app, v as string)"
            />
            <UButton
              v-if="app.coverLetter"
              variant="ghost"
              size="xs"
              :icon="expandedId === app.id ? 'i-heroicons-chevron-up' : 'i-heroicons-document-text'"
              @click="expandedId = expandedId === app.id ? null : app.id"
            >
              Cover letter
            </UButton>
          </div>
        </div>

        <div
          v-if="expandedId === app.id && app.coverLetter"
          class="px-4 pb-4"
          style="border-top: 1px solid var(--line-soft); background: var(--bg-elevated)"
        >
          <p
            class="text-xs font-medium mb-2 pt-3"
            style="color: var(--ink-subtle); text-transform: uppercase; letter-spacing: 0.08em"
          >
            Generated Cover Letter
          </p>
          <p class="text-sm leading-relaxed whitespace-pre-line" style="color: var(--ink-muted)">
            {{ app.coverLetter }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
