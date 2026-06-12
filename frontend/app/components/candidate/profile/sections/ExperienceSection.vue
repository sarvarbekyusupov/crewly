<script setup lang="ts">
export interface Position {
  title?: string
  company?: string
  start?: string
  end?: string
  bullets?: string[]
}

const props = defineProps<{ positions: Position[] }>()
const emit = defineEmits<{ add: []; edit: [index: number] }>()

const expanded = ref<Record<number, boolean>>({})

function toggle(i: number) {
  expanded.value[i] = !expanded.value[i]
}

function isCurrentRole(p: Position) {
  return (
    !p.end ||
    p.end.toLowerCase().includes('present') ||
    p.end.toLowerCase().includes('now') ||
    p.end === ''
  )
}
</script>

<template>
  <CandidateProfileUiSectionCard
    id="experience"
    icon="i-heroicons-briefcase"
    title="Ish tajribasi"
    :subtitle="positions.length ? `${positions.length} ta ish joyi` : undefined"
    @edit="emit('add')"
  >
    <template v-if="!positions.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-briefcase"
        text="Ish tajribasini qo'shing — ariza yuborishda muhim rol o'ynaydi"
        cta="Tajriba qo'shish"
        @add="emit('add')"
      />
    </template>

    <div v-else class="exp-list">
      <div v-for="(pos, i) in positions" :key="i" class="exp-item">
        <CandidateProfileUiCompanyAvatar :name="pos.company || '?'" :size="38" />

        <div class="exp-body">
          <div class="exp-header">
            <div>
              <p class="exp-title">{{ pos.title || 'Lavozim' }}</p>
              <p class="exp-company">{{ pos.company || 'Kompaniya' }}</p>
            </div>
            <div class="exp-actions">
              <span class="exp-dates">
                {{ pos.start || '—' }} — {{ isCurrentRole(pos) ? 'Hozir' : pos.end || '—' }}
              </span>
              <button type="button" class="item-edit" @click="emit('edit', i)">
                <UIcon name="i-heroicons-pencil" style="width: 12px; height: 12px" />
              </button>
            </div>
          </div>

          <template v-if="pos.bullets && pos.bullets.length">
            <ul class="exp-bullets" :class="{ collapsed: !expanded[i] }">
              <li v-for="(b, bi) in pos.bullets" :key="bi">{{ b }}</li>
            </ul>
            <button
              v-if="pos.bullets.length > 3"
              type="button"
              class="expand-btn"
              @click="toggle(i)"
            >
              {{ expanded[i] ? "Kamroq ko'rsatish" : `+${pos.bullets.length - 3} ta ko\'proq` }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <button type="button" class="add-row" @click="emit('add')">
      <UIcon name="i-heroicons-plus" style="width: 13px; height: 13px" />
      Ish joyi qo'shish
    </button>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.exp-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.exp-item {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  border-bottom: 1px solid var(--line-soft);
}
.exp-item:last-child {
  border-bottom: none;
}
.exp-body {
  flex: 1;
  min-width: 0;
}
.exp-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.exp-title {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.exp-company {
  font-size: 12.5px;
  color: var(--ink-muted);
  margin-top: 1px;
}
.exp-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.exp-dates {
  font-size: 11.5px;
  color: var(--ink-subtle);
  white-space: nowrap;
}
.item-edit {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--ink-subtle);
  padding: 3px;
  border-radius: 5px;
  transition: all 0.12s;
}
.item-edit:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}
.exp-bullets {
  margin-top: 8px;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.exp-bullets.collapsed li:nth-child(n + 4) {
  display: none;
}
.exp-bullets li {
  font-size: 12.5px;
  color: var(--ink-muted);
  line-height: 1.5;
}
.expand-btn {
  margin-top: 4px;
  font-size: 12px;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}
.add-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-subtle);
  background: none;
  border: 1.5px dashed var(--line);
  width: 100%;
  padding: 9px;
  border-radius: 8px;
  cursor: pointer;
  justify-content: center;
  transition: all 0.12s;
}
.add-row:hover {
  border-color: var(--ink);
  color: var(--ink);
}
</style>
