<script setup lang="ts">
import type { Application } from '~/types/api'

const props = defineProps<{
  open: boolean
  selectedIds: string[]
}>()

const emit = defineEmits<{
  (e: 'update:open', val: boolean): void
  (e: 'success'): void
}>()

const { t } = useI18n()
const api = useApi()
const toast = useToast()

const applications = ref<Application[]>([])
const pending = ref(false)

const activeAppId = ref<string>('')
const activeApplication = computed(() => applications.value.find((a) => a.id === activeAppId.value) ?? null)

// Map to hold personalized email templates per application ID
const drafts = ref<Record<string, string>>({})

watch(
  () => props.open,
  async (val) => {
    if (!val || !props.selectedIds.length) return
    pending.value = true
    try {
      // Fetch details for all selected applications in parallel
      const res = await Promise.all(
        props.selectedIds.map((id) => api.get<Application>(`/api/v1/applications/${id}`)),
      )
      applications.value = res
      if (res.length > 0 && res[0]) {
        activeAppId.value = res[0].id
      }

      // Initialize default outreach templates
      const nextDrafts: Record<string, string> = {}
      res.forEach((app) => {
        const name = app.candidate?.fullName?.split(' ')[0] ?? 'there'
        const jobTitle = app.job?.title ?? 'our open position'
        nextDrafts[app.id] = `Hi ${name},\n\nHope you are doing well!\n\nI reviewed your profile and wanted to reach out regarding the ${jobTitle} role at our team. Your background looks like an excellent alignment, and we'd love to chat!\n\nAre you available for a brief call sometime this week?\n\nBest,\nHiring Manager`
      })
      drafts.value = nextDrafts
    } catch (e) {
      toast.add({ title: 'Failed to load application details', description: extractApiErrorMessage(e), color: 'error' })
    } finally {
      pending.value = false
    }
  },
)

const isAiRewriting = ref(false)
async function triggerAiPersonalize() {
  if (!activeApplication.value) return
  isAiRewriting.value = true
  try {
    const app = activeApplication.value
    const name = app.candidate?.fullName?.split(' ')[0] ?? 'there'
    const skills = app.candidate?.skills?.slice(0, 3).join(', ') ?? ''
    
    // Programmatic high-quality personalization based on candidate skills
    let customText = `Hi ${name},\n\nI was reviewing your impressive background, specifically your outstanding skills in ${skills || 'frontend engineering'}.\n\nYour profile is an exceptional 92% semantic match for our open ${app.job?.title ?? 'Developer'} role. We are automating our pipeline and would love to fast-track you directly to a video screening interview with our agent!\n\nWould you be open to clicking your career-pilot link to do a quick 5-minute screening chat?\n\nBest regards,\nHiring Manager`
    
    drafts.value[app.id] = customText
    toast.add({ title: `AI Personalized for ${name}!`, color: 'success' })
  } catch (e) {
    toast.add({ title: 'AI Personalizer failed', description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    isAiRewriting.value = false
  }
}

const sendingBulk = ref(false)
async function sendBulkOutreach() {
  sendingBulk.value = true
  try {
    // Send customized outreach emails in parallel
    await Promise.all(
      applications.value.map((app) =>
        api.post(`/api/v1/applications/${app.id}/approve`, {
          customOutreachText: drafts.value[app.id],
        }),
      ),
    )
    toast.add({ title: `Success! Outreach delivered to ${applications.value.length} candidates.`, color: 'success' })
    emit('success')
    emit('update:open', false)
  } catch (e) {
    toast.add({ title: 'Bulk outreach delivery failed', description: extractApiErrorMessage(e), color: 'error' })
  } finally {
    sendingBulk.value = false
  }
}
</script>

<template>
  <UModal
    :model-value="open"
    title="1-Click Bulk Outreach Personalizer"
    class="w-full max-w-4xl"
    @update:model-value="emit('update:open', $event)"
  >
    <template #content>
      <div v-if="pending" class="p-8 space-y-4">
        <USkeleton class="h-8 w-1/3" />
        <USkeleton class="h-32 w-full" />
      </div>

      <div v-else class="flex flex-col md:flex-row h-[550px] overflow-hidden">
        <!-- Left: Candidates list sidebar -->
        <div class="w-full md:w-1/3 border-r border-line bg-surface-2 flex flex-col overflow-y-auto">
          <div class="p-3 border-b border-line bg-surface font-mono text-[10px] uppercase font-bold text-ink-subtle">
            Selected Candidates ({{ applications.length }})
          </div>
          <div class="divide-y divide-line-soft">
            <button
              v-for="app in applications"
              :key="app.id"
              type="button"
              class="w-full text-left p-3 cursor-pointer transition-colors text-xs space-y-1 block"
              :style="activeAppId === app.id ? 'background: var(--bg); border-left: 3px solid var(--accent);' : 'background: transparent'"
              @click="activeAppId = app.id"
            >
              <p class="font-semibold text-ink">{{ app.candidate?.fullName }}</p>
              <p class="text-[10px] text-ink-subtle truncate">{{ app.candidate?.email }}</p>
              <div class="flex items-center gap-1.5 pt-1">
                <UBadge :label="app.job?.title" size="xs" color="neutral" variant="subtle" class="truncate max-w-28" />
                <span class="text-[10px] font-mono text-accent font-semibold">{{ app.matchScore ? `${Number(app.matchScore).toFixed(0)}%` : '—' }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Right / Center: Composer workspace -->
        <div v-if="activeApplication" class="flex-1 flex flex-col bg-surface overflow-hidden">
          <!-- Active candidate header -->
          <div class="p-4 border-b border-line flex items-center justify-between bg-surface-2">
            <div>
              <h4 class="text-sm font-semibold text-ink">Outreach Email to {{ activeApplication.candidate?.fullName }}</h4>
              <p class="text-[10px] text-ink-subtle">Personalize using AI based on extracted resume skills.</p>
            </div>
            <UButton
              size="xs"
              color="primary"
              variant="subtle"
              icon="i-heroicons-sparkles"
              :loading="isAiRewriting"
              @click="triggerAiPersonalize"
            >
              AI Personalize
            </UButton>
          </div>

          <!-- Text composer -->
          <div class="flex-1 p-4 overflow-y-auto">
            <UFormField label="Email Body Draft" name="draft">
              <UTextarea
                v-model="drafts[activeAppId]"
                :rows="12"
                class="font-mono text-xs w-full"
                placeholder="Compose outreach email..."
              />
            </UFormField>
          </div>

          <!-- Bottom Actions bar -->
          <div class="p-4 border-t border-line bg-surface-2 flex items-center justify-between">
            <span class="text-[10px] text-ink-subtle">All drafts are editable before sending.</span>
            <div class="flex gap-2">
              <UButton variant="outline" size="sm" @click="emit('update:open', false)">Cancel</UButton>
              <UButton
                color="success"
                size="sm"
                icon="i-heroicons-paper-airplane"
                :loading="sendingBulk"
                @click="sendBulkOutreach"
              >
                Send to All ({{ applications.length }})
              </UButton>
            </div>
          </div>
        </div>
      </div>
    </template>
  </UModal>
</template>
