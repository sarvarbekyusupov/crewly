<script setup lang="ts">
const store = useOnboardingStore()

function formatPhone(e: Event) {
  const input = e.target as HTMLInputElement
  let v = input.value.replace(/\D/g, '')
  if (!v.startsWith('998')) v = '998' + v.replace(/^998/, '')
  v = v.slice(0, 12)
  let formatted = '+998'
  if (v.length > 3) formatted += ' ' + v.slice(3, 5)
  if (v.length > 5) formatted += ' ' + v.slice(5, 8)
  if (v.length > 8) formatted += ' ' + v.slice(8, 10)
  if (v.length > 10) formatted += ' ' + v.slice(10, 12)
  store.contact.phone = formatted.trim()
}

function formatTelegram(e: Event) {
  let v = (e.target as HTMLInputElement).value
  if (v && !v.startsWith('@')) v = '@' + v
  store.contact.telegram = v
}

const anyFilled = computed(
  () => !!(store.contact.phone || store.contact.linkedin || store.contact.telegram),
)
</script>

<template>
  <div class="space-y-4">
    <div class="field-row">
      <label class="field-label">To'liq ism</label>
      <input
        v-model="store.contact.fullName"
        type="text"
        class="field-input"
        placeholder="e.g. Sarvar Yusupov"
        autofocus
      />
    </div>

    <div class="field-row">
      <label class="field-label">Telefon raqam</label>
      <input
        :value="store.contact.phone"
        type="tel"
        class="field-input"
        placeholder="+998 90 123 45 67"
        @input="formatPhone"
      />
    </div>

    <div class="field-row">
      <label class="field-label">LinkedIn</label>
      <div class="input-prefix-wrap">
        <span class="input-prefix">linkedin.com/in/</span>
        <input
          v-model="store.contact.linkedin"
          type="text"
          class="field-input field-input--prefixed"
          placeholder="yourprofile"
        />
      </div>
    </div>

    <div class="field-row">
      <label class="field-label">Telegram</label>
      <input
        :value="store.contact.telegram"
        type="text"
        class="field-input"
        placeholder="@username"
        @input="formatTelegram"
      />
    </div>

    <p v-if="!anyFilled" class="soft-warn">
      Kamida bitta aloqa ma'lumotini kiritish tavsiya etiladi — ish beruvchilar to'g'ridan-to'g'ri
      murojaat qiladi.
    </p>
  </div>
</template>

<style scoped>
.space-y-4 > * + * {
  margin-top: 16px;
}
.field-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}
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
.field-input:focus {
  border-color: var(--accent);
}
.input-prefix-wrap {
  display: flex;
  align-items: center;
  border: 1.5px solid var(--line);
  border-radius: 8px;
  background: var(--bg);
  overflow: hidden;
  transition: border-color 0.15s;
}
.input-prefix-wrap:focus-within {
  border-color: var(--accent);
}
.input-prefix {
  padding: 9px 10px 9px 12px;
  font-size: 13px;
  color: var(--ink-subtle);
  background: var(--bg-deep);
  border-right: 1.5px solid var(--line);
  white-space: nowrap;
  flex-shrink: 0;
}
.field-input--prefixed {
  border: none;
  border-radius: 0;
  flex: 1;
  min-width: 0;
}
.field-input--prefixed:focus {
  border-color: transparent;
}
.soft-warn {
  font-size: 12px;
  color: var(--warn);
  background: color-mix(in srgb, var(--warn) 8%, transparent);
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid color-mix(in srgb, var(--warn) 20%, transparent);
}
</style>
