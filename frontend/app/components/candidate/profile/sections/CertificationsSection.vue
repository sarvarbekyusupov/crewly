<script setup lang="ts">
export interface Certification {
  name?: string
  issuer?: string
  date?: string
  url?: string
}

defineProps<{ certs: Certification[] }>()
const emit = defineEmits<{ add: []; edit: [index: number] }>()
</script>

<template>
  <CandidateProfileUiSectionCard
    id="certifications"
    icon="i-heroicons-trophy"
    title="Sertifikatlar"
    :subtitle="certs.length ? `${certs.length} ta sertifikat` : undefined"
    @edit="emit('add')"
  >
    <template v-if="!certs.length">
      <CandidateProfileUiEmptyState
        icon="i-heroicons-trophy"
        text="Sertifikatlaringizni qo'shing — profilingizni mustahkamlaydi"
        cta="Sertifikat qo'shish"
        @add="emit('add')"
      />
    </template>

    <div v-else class="cert-list">
      <div v-for="(cert, i) in certs" :key="i" class="cert-item">
        <CandidateProfileUiCompanyAvatar :name="cert.issuer || cert.name || '?'" :size="36" />
        <div class="cert-body">
          <div class="cert-header">
            <div>
              <p class="cert-name">{{ cert.name || 'Sertifikat' }}</p>
              <p class="cert-issuer">{{ cert.issuer || 'Muassasa' }}</p>
            </div>
            <div class="cert-actions">
              <span v-if="cert.date" class="cert-date">{{ cert.date }}</span>
              <a v-if="cert.url" :href="cert.url" target="_blank" class="cert-link">
                <UIcon
                  name="i-heroicons-arrow-top-right-on-square"
                  style="width: 12px; height: 12px"
                />
              </a>
              <button type="button" class="item-edit" @click="emit('edit', i)">
                <UIcon name="i-heroicons-pencil" style="width: 12px; height: 12px" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button type="button" class="add-row" @click="emit('add')">
      <UIcon name="i-heroicons-plus" style="width: 13px; height: 13px" />
      Sertifikat qo'shish
    </button>
  </CandidateProfileUiSectionCard>
</template>

<style scoped>
.cert-list {
  display: flex;
  flex-direction: column;
}
.cert-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line-soft);
}
.cert-item:last-child {
  border-bottom: none;
}
.cert-body {
  flex: 1;
  min-width: 0;
}
.cert-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.cert-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--ink);
}
.cert-issuer {
  font-size: 12px;
  color: var(--ink-muted);
  margin-top: 2px;
}
.cert-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.cert-date {
  font-size: 11.5px;
  color: var(--ink-subtle);
  white-space: nowrap;
}
.cert-link {
  color: var(--ink-subtle);
  text-decoration: none;
  transition: color 0.12s;
}
.cert-link:hover {
  color: var(--accent);
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
