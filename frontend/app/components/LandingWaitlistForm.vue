<script setup lang="ts">
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

const props = defineProps<{ audience: 'employer' | 'candidate' }>()

const { t } = useI18n()

const schema = toTypedSchema(z.object({ email: z.string().email('Enter a valid email address') }))

const { defineField, handleSubmit, errors, isSubmitting, resetForm } = useForm({
  validationSchema: schema,
})

const [email, emailAttrs] = defineField('email', { validateOnModelUpdate: false })

const state = ref<'idle' | 'success' | 'duplicate' | 'error'>('idle')

const submit = handleSubmit(async (values) => {
  try {
    const res = await $fetch<{ alreadyJoined: boolean }>('/api/v1/waitlist', {
      method: 'POST',
      body: { email: values.email, role: props.audience },
    })
    state.value = res.alreadyJoined ? 'duplicate' : 'success'
    resetForm()
  } catch {
    state.value = 'error'
  }
})

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
        <div class="wl-input-wrap">
          <input
            v-model="email"
            v-bind="emailAttrs"
            type="email"
            class="wl-input"
            :class="{ 'wl-input--error': errors.email }"
            :placeholder="t('landing.waitlist.emailPlaceholder')"
            :disabled="isSubmitting"
            @keydown.enter="submit"
          />
          <Transition name="wl-fade">
            <span v-if="errors.email" class="wl-field-error">{{ errors.email }}</span>
          </Transition>
        </div>
        <button
          class="wl-btn"
          :class="{ 'wl-btn--loading': isSubmitting }"
          :disabled="isSubmitting"
          @click="submit"
        >
          <span v-if="isSubmitting" class="wl-spinner" />
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
  align-items: flex-start;
}

.wl-input-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.wl-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--ld-bd, #e2e0da);
  border-radius: 8px;
  background: var(--ld-surf, #ffffff);
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 13.5px;
  color: var(--ld-t1, #0f0f12);
  outline: none;
  transition: border-color 0.15s;
  min-width: 0;
}
.wl-input::placeholder {
  color: var(--ld-t3, #9898a8);
}
.wl-input:focus {
  border-color: var(--ld-acc, #4252e8);
}
.wl-input--error {
  border-color: #e53935;
}
.wl-input:disabled {
  opacity: 0.6;
}

.wl-form--candidate .wl-input:focus {
  border-color: var(--ld-acc, #4252e8);
}

.wl-field-error {
  font-size: 11px;
  color: #e53935;
  padding: 0 4px;
}

.wl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border: none;
  border-radius: 8px;
  background: var(--ld-acc, #4252e8);
  color: #fff;
  font-family: 'Manrope', system-ui, sans-serif;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition:
    background 0.15s,
    transform 0.15s;
}
.wl-btn:hover:not(:disabled) {
  background: var(--ld-acc-h, #3545d8);
  transform: translateY(-1px);
}
.wl-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.wl-form--candidate .wl-btn {
  background: var(--ld-acc, #4252e8);
}
.wl-form--candidate .wl-btn:hover:not(:disabled) {
  background: var(--ld-acc-h, #3545d8);
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

@media (max-width: 640px) {
  .wl-row {
    flex-direction: column;
    gap: 10px;
  }

  .wl-input-wrap {
    width: 100%;
  }

  .wl-input {
    padding: 14px 16px;
    font-size: 16px;
  }

  .wl-btn {
    width: 100%;
    padding: 14px 20px;
    font-size: 15px;
    height: auto;
  }
}
</style>
