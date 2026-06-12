<script setup lang="ts">
const props = defineProps<{
  fullName?: string
  currentPosition?: string
  currentCompany?: string
  city?: string
  country?: string
  email?: string
  phone?: string
  telegramUsername?: string
  linkedinUrl?: string
  githubUrl?: string
  summary?: string
  completeness: number
  missing: string[]
}>()
const emit = defineEmits<{ edit: [] }>()

const locationText = computed(() => {
  return [props.city, props.country].filter(Boolean).join(', ') || null
})

const missingItems = computed(() => {
  if (!props.missing.length) return [[{ label: "Profil to'liq! 🎉", disabled: true }]]
  return [
    props.missing.map((gap) => ({
      label: `${gap} qo'shish (+${Math.floor(100 / 9)}%)`,
    })),
  ]
})
</script>

<template>
  <div id="profile-header" class="header-card">
    <!-- Top row -->
    <div class="header-top">
      <div class="avatar-name">
        <CandidateProfileUiCompanyAvatar :name="fullName || 'U'" :size="52" />
        <div>
          <h1 class="header-name">{{ fullName || "Isim qo'shilmagan" }}</h1>
          <p v-if="currentPosition || currentCompany" class="header-role">
            {{ [currentPosition, currentCompany].filter(Boolean).join(' · ') }}
          </p>
          <p v-if="locationText" class="header-location">
            <UIcon
              name="i-heroicons-map-pin"
              style="width: 12px; height: 12px; margin-right: 3px"
            />
            {{ locationText }}
          </p>
        </div>
      </div>

      <div class="header-right">
        <UDropdownMenu :items="missingItems" :content="{ side: 'bottom', align: 'end' }">
          <button type="button" class="completion-btn">
            <CandidateProfileProfileCompletion :percentage="completeness" />
            <span v-if="missing.length" class="missing-badge">{{ missing.length }} missing</span>
          </button>
        </UDropdownMenu>

        <button type="button" class="edit-header-btn" @click="emit('edit')">
          <UIcon name="i-heroicons-pencil" style="width: 13px; height: 13px" />
          Tahrirlash
        </button>
      </div>
    </div>

    <!-- Summary -->
    <p v-if="summary" class="header-summary">{{ summary }}</p>
    <p v-else class="header-summary-placeholder" @click="emit('edit')">
      + Qisqacha tavsif qo'shing (1-2 jumla)…
    </p>

    <!-- Links row -->
    <div class="links-row">
      <a v-if="email" :href="`mailto:${email}`" class="link-pill">
        <UIcon name="i-heroicons-envelope" style="width: 12px; height: 12px" />
        {{ email }}
      </a>
      <a v-if="linkedinUrl" :href="linkedinUrl" target="_blank" class="link-pill">
        <UIcon name="i-heroicons-link" style="width: 12px; height: 12px" />
        LinkedIn
      </a>
      <a v-if="githubUrl" :href="githubUrl" target="_blank" class="link-pill">
        <UIcon name="i-heroicons-code-bracket" style="width: 12px; height: 12px" />
        GitHub
      </a>
      <span v-if="telegramUsername" class="link-pill link-pill--plain">
        <UIcon name="i-heroicons-paper-airplane" style="width: 12px; height: 12px" />
        @{{ telegramUsername }}
      </span>
      <span v-if="phone" class="link-pill link-pill--plain">
        <UIcon name="i-heroicons-phone" style="width: 12px; height: 12px" />
        {{ phone }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.header-card {
  background: var(--bg);
  border: 1.5px solid var(--line);
  border-radius: 14px;
  padding: 22px 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.header-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.avatar-name {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}
.header-name {
  font-size: 20px;
  font-weight: 700;
  color: var(--ink);
  line-height: 1.1;
}
.header-role {
  font-size: 13px;
  color: var(--ink-muted);
  margin-top: 3px;
}
.header-location {
  font-size: 12px;
  color: var(--ink-subtle);
  margin-top: 4px;
  display: flex;
  align-items: center;
}
.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
}
.completion-btn {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 0;
}
.missing-badge {
  font-size: 10px;
  color: var(--ink-subtle);
}
.edit-header-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-subtle);
  background: none;
  border: 1.5px solid var(--line);
  border-radius: 7px;
  padding: 5px 11px;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}
.edit-header-btn:hover {
  color: var(--ink);
  border-color: var(--ink);
}
.header-summary {
  font-size: 13px;
  color: var(--ink-muted);
  line-height: 1.6;
}
.header-summary-placeholder {
  font-size: 13px;
  color: var(--ink-subtle);
  cursor: pointer;
  font-style: italic;
  transition: color 0.12s;
}
.header-summary-placeholder:hover {
  color: var(--ink-muted);
}
.links-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.link-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 20px;
  background: var(--bg-elevated);
  color: var(--ink-muted);
  border: 1px solid var(--line);
  text-decoration: none;
  transition: all 0.12s;
}
.link-pill:not(.link-pill--plain):hover {
  border-color: var(--ink);
  color: var(--ink);
}
.link-pill--plain {
  cursor: default;
}
</style>
