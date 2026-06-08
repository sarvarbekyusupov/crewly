<script setup lang="ts">
const props = defineProps<{ audience: 'employer' | 'candidate' }>()

const { t } = useI18n()

const email = ref('')
const state = ref<'idle' | 'loading' | 'success' | 'duplicate' | 'error'>('idle')

async function submit() {
  if (!email.value || state.value === 'loading') return
  state.value = 'loading'
  try {
    const res = await $fetch<{ alreadyJoined: boolean }>('/api/v1/waitlist', {
      method: 'POST',
      body: { email: email.value, role: props.audience },
    })
    state.value = res.alreadyJoined ? 'duplicate' : 'success'
  } catch {
    state.value = 'error'
  }
}

const successMsg = computed(() =>
  props.audience === 'employer'
    ? t('landing.waitlist.successEmployer')
    : t('landing.waitlist.successCandidate'),
)
</script>

<template>
  <div class="wl-form" :class="`wl-form--${audience}`">
    <Transition name="wl-fade" mode="out-in">
      <div v-if="state === 'success'" key="success" class="wl-success">
        <span class="wl-success-icon">✓</span>
        <p>{{ successMsg }}</p>
      </div>
      <div v-else key="form" class="wl-row">
        <input
          v-model="email"
          type="email"
          class="wl-input"
          :placeholder="t('landing.waitlist.emailPlaceholder')"
          :disabled="state === 'loading'"
          @keydown.enter="submit"
        />
        <button
          class="wl-btn"
          :class="{ 'wl-btn--loading': state === 'loading' }"
          :disabled="state === 'loading' || !email"
          @click="submit"
        >
          <span v-if="state === 'loading'" class="wl-spinner" />
          <span v-else>{{ t('landing.waitlist.cta') }}</span>
        </button>
      </div>
    </Transition>
    <Transition name="wl-fade">
      <p v-if="state === 'duplicate'" class="wl-msg wl-msg--info">
        {{ t('landing.waitlist.duplicate') }}
      </p>
      <p v-else-if="state === 'error'" class="wl-msg wl-msg--error">
        {{ t('landing.waitlist.error') }}
      </p>
    </Transition>
  </div>
</template>

<style scoped>
.wl-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 440px;
}

.wl-row {
  display: flex;
  gap: 8px;
  width: 100%;
}

.wl-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #d9d3c7;
  border-radius: 999px;
  background: #fdfcf8;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  color: #1a1a1a;
  outline: none;
  transition:
    border-color 0.12s,
    box-shadow 0.12s;
  min-width: 0;
}
.wl-input::placeholder {
  color: #a8a39a;
}
.wl-input:focus {
  border-color: #1a1a1a;
  box-shadow: 0 0 0 3px rgba(26, 26, 26, 0.08);
}
.wl-input:disabled {
  opacity: 0.6;
}

.wl-form--candidate .wl-input:focus {
  border-color: #c84a1f;
  box-shadow: 0 0 0 3px rgba(200, 74, 31, 0.1);
}

.wl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 22px;
  border: none;
  border-radius: 999px;
  background: #1a1a1a;
  color: #f5f1ea;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition:
    background 0.15s,
    opacity 0.15s;
}
.wl-btn:hover:not(:disabled) {
  background: #333;
}
.wl-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.wl-form--candidate .wl-btn {
  background: #c84a1f;
}
.wl-form--candidate .wl-btn:hover:not(:disabled) {
  background: #a33b17;
}

.wl-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(245, 241, 234, 0.3);
  border-top-color: #f5f1ea;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.wl-success {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border: 1px solid #c8e6c9;
  border-radius: 12px;
  background: #f1f8f1;
  color: #2e7d32;
  font-size: 14px;
  line-height: 1.45;
}
.wl-success-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.wl-msg {
  font-size: 12px;
  padding: 0 4px;
  margin: 0;
}
.wl-msg--info {
  color: #6b6760;
}
.wl-msg--error {
  color: #c84a1f;
}

.wl-fade-enter-active,
.wl-fade-leave-active {
  transition: opacity 0.18s ease;
}
.wl-fade-enter-from,
.wl-fade-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .wl-row {
    flex-direction: column;
  }
  .wl-btn {
    width: 100%;
  }
}
</style>
