<script setup lang="ts">
import type { Application } from '~/types/api'
import { groupApplicationsByStage } from '~/utils/applicationPipeline'

const props = defineProps<{
  applications: Application[]
  loading?: boolean
}>()

defineEmits<{
  (e: 'select', id: string): void
}>()

const { t } = useI18n()
const toast = useToast()
const { appStatusLabel } = useStatusLabels()

const orderList = ref(['applied', 'delivered', 'screening', 'interview', 'offered', 'hired', 'rejected'])

const columns = computed(() => {
  const grouped = groupApplicationsByStage(props.applications)
  // Sort grouped columns by local custom order list
  return [...grouped].sort((a, b) => orderList.value.indexOf(a.key) - orderList.value.indexOf(b.key))
})

let draggedColIdx = -1

function onColDragStart(idx: number) {
  draggedColIdx = idx
}

function onColDragOver(e: DragEvent) {
  e.preventDefault()
}

function onColDrop(targetIdx: number) {
  if (draggedColIdx === -1 || draggedColIdx === targetIdx) return
  
  const list = [...orderList.value]
  const [removed] = list.splice(draggedColIdx, 1)
  if (removed) {
    list.splice(targetIdx, 0, removed)
    orderList.value = list
    toast.add({ title: 'Kanban columns reordered!', color: 'success' })
  }
  
  draggedColIdx = -1
}

function recommendationColor(rec?: string | null) {
  if (rec === 'strong fit') return 'var(--positive)'
  if (rec === 'good fit') return 'var(--info)'
  if (rec === 'possible fit') return 'var(--warning)'
  return 'var(--ink-subtle)'
}
</script>

<template>
  <CommonListSkeleton v-if="loading" variant="kanban" />
  <div v-else class="overflow-x-auto pb-4">
    <div class="flex gap-3" style="min-width: max-content">
      <div
        v-for="(col, idx) in columns"
        :key="col.key"
        class="rounded-xl flex flex-col cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md"
        style="width: 220px; background: var(--bg-elevated); border: 1px solid var(--line-soft)"
        draggable="true"
        @dragstart="onColDragStart(idx)"
        @dragover="onColDragOver"
        @drop="onColDrop(idx)"
      >
        <div
          class="flex items-center justify-between px-3 py-2.5"
          style="border-bottom: 1px solid var(--line-soft)"
        >
          <span class="col-label">
            {{ appStatusLabel(col.labelKey) }}
          </span>
          <span class="col-count" :style="{ color: col.color }">{{ col.cards.length }}</span>
        </div>
        <div class="flex flex-col gap-2 p-2 flex-1">
          <NuxtLink
            v-for="card in col.cards"
            :key="card.id"
            :to="`/employer/applications/${card.id}`"
            class="kanban-card"
            :style="`border-left-color: ${col.color};`"
            @click.prevent="$emit('select', card.id)"
          >
            <div class="flex items-start gap-2 mb-2">
              <div class="avatar-sm">{{ card.candidate?.fullName?.[0] ?? '?' }}</div>
              <div class="min-w-0 flex-1">
                <p class="text-xs font-medium truncate" style="color: var(--ink)">
                  {{ card.candidate?.fullName ?? '—' }}
                </p>
                <p class="text-xs truncate" style="color: var(--ink-muted)">
                  {{ card.job?.title ?? '—' }}
                </p>
              </div>
            </div>
            <div v-if="card.matchScore" class="mt-2">
              <div class="flex justify-between items-center mb-1">
                <span class="match-label">{{ t('applications.matchScore') }}</span>
                <span class="match-val" :style="{ color: col.color }">
                  {{ Number(card.matchScore).toFixed(0) }}%
                </span>
              </div>
              <div class="h-0.5 rounded-full overflow-hidden" style="background: var(--bg-deep)">
                <div
                  class="h-full rounded-full"
                  :style="`width: ${Math.min(100, Number(card.matchScore))}%; background: ${col.color};`"
                />
              </div>
              <span
                v-if="card.matchRecommendation"
                class="match-rec"
                :style="{ color: recommendationColor(card.matchRecommendation) }"
              >
                {{ card.matchRecommendation }}
              </span>
            </div>
          </NuxtLink>
          <div v-if="!col.cards.length" class="py-6 text-center empty-col">—</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.col-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-muted);
}
.col-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
}
.kanban-card {
  display: block;
  border-radius: 8px;
  padding: 12px;
  background: var(--paper);
  border: 1px solid var(--line-soft);
  border-left-width: 3px;
  text-decoration: none;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px -6px rgba(0, 0, 0, 0.12);
}
.kanban-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}
.avatar-sm {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  font-size: 12px;
  background: var(--accent-soft);
  color: var(--accent);
  font-family: 'Fraunces', serif;
  font-style: italic;
}
.match-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--ink-subtle);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.match-val {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
}
.match-rec {
  display: inline-block;
  margin-top: 3px;
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: 'JetBrains Mono', monospace;
}
.empty-col {
  color: var(--ink-subtle);
  font-size: 12px;
}
</style>
