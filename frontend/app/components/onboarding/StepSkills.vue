<script setup lang="ts">
const store = useOnboardingStore()

const PRESET_SKILLS: Record<string, string[]> = {
  Texnik: [
    'JavaScript',
    'TypeScript',
    'Python',
    'Java',
    'React',
    'Vue.js',
    'Node.js',
    'SQL',
    'PostgreSQL',
    'MongoDB',
    'Docker',
    'Git',
    'AWS',
    'REST API',
    'GraphQL',
    'Linux',
  ],
  Marketing: ['SEO', 'Google Ads', 'SMM', 'Content Writing', 'Email Marketing', 'Google Analytics'],
  Moliya: ['Financial Analysis', 'Accounting', 'Excel', '1C', 'Budgeting'],
  Boshqaruv: ['Project Management', 'Agile', 'Scrum', 'Jira', 'Team Leadership'],
  Dizayn: ['Figma', 'UI/UX', 'Photoshop', 'Adobe XD'],
  Tillar: ['English', 'Russian', 'Uzbek', 'German', 'Chinese'],
}

const EXPERIENCE_LEVELS = ['Intern', 'Junior', 'Middle', 'Senior', 'Lead', 'C-Level']
const INDUSTRIES = [
  'IT',
  'Marketing',
  'Moliya',
  'Savdo',
  'Dizayn',
  'Muhandislik',
  "Ta'lim",
  'Tibbiyot',
  'Boshqa',
]
const EDUCATION_LEVELS = ["O'rta maxsus", 'Bakalavr', 'Magistr', 'PhD', 'Boshqa']

const customInput = ref('')
const activeCategory = ref<string | null>(null)

function toggleTag(tag: string) {
  const idx = store.skills.tags.indexOf(tag)
  if (idx >= 0) store.skills.tags.splice(idx, 1)
  else store.skills.tags.push(tag)
}

function addCustom() {
  const tag = customInput.value.trim()
  if (tag && !store.skills.tags.includes(tag)) {
    store.skills.tags.push(tag)
  }
  customInput.value = ''
}

function onCustomKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    addCustom()
  }
}

const currentYear = new Date().getFullYear()
</script>

<template>
  <div class="space-y-5">
    <!-- Skills tags -->
    <div class="field-row">
      <div class="tags-header">
        <label class="field-label">Ko'nikmalar <span class="req">*</span></label>
        <span class="tag-count">{{ store.skills.tags.length }} tanlandi</span>
      </div>

      <!-- Category filter -->
      <div class="cat-tabs">
        <button
          v-for="cat in Object.keys(PRESET_SKILLS)"
          :key="cat"
          type="button"
          class="cat-tab"
          :class="{ active: activeCategory === cat }"
          @click="activeCategory = activeCategory === cat ? null : cat"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Tags grid -->
      <div class="tags-grid">
        <template v-for="(tags, cat) in PRESET_SKILLS" :key="cat">
          <template v-if="!activeCategory || activeCategory === cat">
            <button
              v-for="tag in tags"
              :key="tag"
              type="button"
              class="tag-btn"
              :class="{ selected: store.skills.tags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </template>
        </template>
      </div>

      <!-- Custom input -->
      <div class="custom-input-wrap">
        <input
          v-model="customInput"
          type="text"
          class="custom-input"
          placeholder="Qo'shimcha ko'nikma qo'shish…"
          @keydown="onCustomKeydown"
        />
        <button type="button" class="add-btn" @click="addCustom">+</button>
      </div>

      <!-- Selected chips -->
      <div v-if="store.skills.tags.length" class="selected-tags">
        <span v-for="tag in store.skills.tags" :key="tag" class="chip">
          {{ tag }}
          <button type="button" class="chip-remove" @click="toggleTag(tag)">×</button>
        </span>
      </div>
    </div>

    <!-- Experience level -->
    <div class="field-row">
      <label class="field-label">Tajriba darajasi <span class="req">*</span></label>
      <div class="radio-group">
        <button
          v-for="lvl in EXPERIENCE_LEVELS"
          :key="lvl"
          type="button"
          class="radio-btn"
          :class="{ selected: store.skills.experienceLevel === lvl }"
          @click="store.skills.experienceLevel = lvl"
        >
          {{ lvl }}
        </button>
      </div>
    </div>

    <!-- Industry -->
    <div class="field-row">
      <label class="field-label">Soha</label>
      <select v-model="store.skills.industry" class="field-select">
        <option value="">Tanlang…</option>
        <option v-for="ind in INDUSTRIES" :key="ind" :value="ind">{{ ind }}</option>
      </select>
    </div>

    <div class="grid-2">
      <!-- Education -->
      <div class="field-row">
        <label class="field-label">Ta'lim</label>
        <select v-model="store.skills.educationLevel" class="field-select">
          <option value="">Tanlang…</option>
          <option v-for="edu in EDUCATION_LEVELS" :key="edu" :value="edu">{{ edu }}</option>
        </select>
      </div>

      <!-- Graduation year -->
      <div class="field-row">
        <label class="field-label">Bitirgan yil</label>
        <input
          v-model.number="store.skills.graduationYear"
          type="number"
          class="field-input"
          :min="1990"
          :max="currentYear + 5"
          placeholder="2020"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.space-y-5 > * + * {
  margin-top: 20px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tags-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}
.req {
  color: var(--accent);
}
.tag-count {
  font-size: 12px;
  color: var(--ink-subtle);
}

.cat-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.cat-tab {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  border: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.cat-tab.active,
.cat-tab:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}
.tag-btn {
  padding: 5px 11px;
  font-size: 13px;
  border-radius: 7px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.tag-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.tag-btn.selected {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.custom-input-wrap {
  display: flex;
  gap: 8px;
}
.custom-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 13px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  font-family: inherit;
  transition: border-color 0.15s;
}
.custom-input:focus {
  border-color: var(--accent);
}
.add-btn {
  padding: 8px 14px;
  font-size: 18px;
  line-height: 1;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.add-btn:hover {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.selected-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-top: 2px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 20px;
  background: var(--accent-soft);
  color: var(--accent);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
}
.chip-remove {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--accent);
  font-size: 14px;
  line-height: 1;
  padding: 0;
  opacity: 0.7;
}
.chip-remove:hover {
  opacity: 1;
}

.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.radio-btn {
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  border-radius: 8px;
  border: 1.5px solid var(--line);
  background: var(--bg);
  color: var(--ink-muted);
  cursor: pointer;
  transition: all 0.12s;
}
.radio-btn:hover {
  border-color: var(--ink);
  color: var(--ink);
}
.radio-btn.selected {
  background: var(--ink);
  color: var(--bg);
  border-color: var(--ink);
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.field-select,
.field-input {
  width: 100%;
  padding: 9px 12px;
  font-size: 14px;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  color: var(--ink);
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  font-family: inherit;
}
.field-select:focus,
.field-input:focus {
  border-color: var(--accent);
}
.field-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 32px;
}
@media (max-width: 480px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}
</style>
