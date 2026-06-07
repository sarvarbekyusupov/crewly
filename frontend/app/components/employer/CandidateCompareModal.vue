<script setup lang="ts">
import type { Application } from '~/types/api'

const props = defineProps<{
  open: boolean
  selectedIds: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
}>()

const api = useApi()
const toast = useToast()

const applications = ref<Application[]>([])
const pending = ref(false)

watch(
  () => props.open,
  async (val) => {
    if (!val || !props.selectedIds.length) return
    pending.value = true
    try {
      const res = await Promise.all(
        props.selectedIds
          .slice(0, 3)
          .map((id) => api.get<Application>(`/api/v1/applications/${id}`)),
      )
      applications.value = res
    } catch (e) {
      toast.add({
        title: 'Failed to load comparison data',
        description: extractApiErrorMessage(e),
        color: 'error',
      })
    } finally {
      pending.value = false
    }
  },
)
</script>

<template>
  <UModal
    :model-value="open"
    title="Candidate Comparison Matrix"
    class="w-full max-w-5xl"
    @update:model-value="emit('update:open', $event)"
  >
    <template #content>
      <div v-if="pending" class="p-8 space-y-4">
        <USkeleton class="h-8 w-1/3" />
        <USkeleton class="h-48 w-full" />
      </div>

      <div v-else-if="applications.length" class="p-6 space-y-6 overflow-x-auto min-w-full">
        <!-- Matrix title -->
        <div class="text-center">
          <div
            class="inline-flex w-10 h-10 rounded-full bg-accent-soft text-accent items-center justify-center mb-3"
          >
            <UIcon name="i-heroicons-squares-plus" class="w-5 h-5" />
          </div>
          <h3 class="text-lg font-serif font-semibold text-ink">Side-by-Side Comparison</h3>
          <p class="text-xs text-ink-subtle mt-0.5">
            Juxtapose candidates head-to-head on key AI metrics.
          </p>
        </div>

        <!-- Sleek Responsive Matrix Table -->
        <table class="w-full border-collapse text-left text-xs min-w-[700px]">
          <thead>
            <tr class="bg-surface-2 border-b border-line">
              <th class="p-3 font-mono uppercase tracking-wider text-ink-subtle w-1/4">Criteria</th>
              <th
                v-for="app in applications"
                :key="app.id"
                class="p-3 text-center border-l border-line-soft"
              >
                <p class="text-sm font-semibold text-ink leading-tight">
                  {{ app.candidate?.fullName }}
                </p>
                <p class="text-[10px] text-ink-subtle mt-0.5 truncate max-w-44">
                  {{ app.candidate?.email }}
                </p>
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-line-soft bg-surface">
            <!-- Row 1: Match Score -->
            <tr>
              <td class="p-3 font-semibold text-ink-muted">Match Score</td>
              <td
                v-for="app in applications"
                :key="app.id"
                class="p-3 text-center border-l border-line-soft font-mono text-base font-bold text-accent"
              >
                {{ app.matchScore ? `${Number(app.matchScore).toFixed(0)}%` : '—' }}
              </td>
            </tr>

            <!-- Row 2: Recommendation -->
            <tr>
              <td class="p-3 font-semibold text-ink-muted">AI Recommendation</td>
              <td
                v-for="app in applications"
                :key="app.id"
                class="p-3 text-center border-l border-line-soft"
              >
                <span
                  class="px-2 py-0.5 rounded text-[10px] uppercase font-mono font-bold"
                  :style="
                    app.matchRecommendation === 'strong fit'
                      ? 'background: var(--positive-soft); color: var(--positive)'
                      : 'background: var(--accent-soft); color: var(--accent)'
                  "
                >
                  {{ app.matchRecommendation ?? 'possible fit' }}
                </span>
              </td>
            </tr>

            <!-- Row 3: Sourced Skills -->
            <tr>
              <td class="p-3 font-semibold text-ink-muted">Extracted Skills</td>
              <td v-for="app in applications" :key="app.id" class="p-3 border-l border-line-soft">
                <div class="flex flex-wrap gap-1 justify-center max-w-48 mx-auto">
                  <UBadge
                    v-for="s in app.candidate?.skills?.slice(0, 6)"
                    :key="s"
                    :label="s"
                    color="neutral"
                    variant="subtle"
                    size="xs"
                  />
                </div>
              </td>
            </tr>

            <!-- Row 4: AI Match Analysis -->
            <tr>
              <td class="p-3 font-semibold text-ink-muted">Matchmaker Insight</td>
              <td
                v-for="app in applications"
                :key="app.id"
                class="p-3 border-l border-line-soft leading-relaxed text-ink-muted text-justify"
              >
                <p class="text-[11px] line-clamp-4 max-w-xs mx-auto">
                  {{ app.screenings?.[0]?.aiAssessment?.summary ?? 'No assessment generated yet.' }}
                </p>
              </td>
            </tr>

            <!-- Row 5: Actions -->
            <tr class="bg-surface-2 border-t border-line">
              <td class="p-3 font-semibold text-ink-muted">Profiles</td>
              <td
                v-for="app in applications"
                :key="app.id"
                class="p-3 text-center border-l border-line-soft"
              >
                <div class="flex items-center justify-center gap-2">
                  <UButton
                    v-if="app.candidate?.resumeFileUrl"
                    :to="app.candidate.resumeFileUrl"
                    target="_blank"
                    size="xs"
                    variant="outline"
                    icon="i-heroicons-arrow-down-tray"
                  >
                    CV
                  </UButton>
                  <UButton
                    size="xs"
                    :to="`/employer/applications/${app.id}`"
                    icon="i-heroicons-arrow-top-right-on-square"
                    @click="emit('update:open', false)"
                  >
                    Full Page
                  </UButton>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Close -->
        <div class="flex justify-end pt-2 border-t border-line-soft">
          <UButton size="sm" @click="emit('update:open', false)">Close Matrix</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
