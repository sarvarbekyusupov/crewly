<script setup lang="ts">
import { hiringStepIndex } from '~/utils/applicationPipeline'

const props = defineProps<{
  status: string
}>()

const { t } = useI18n()

const steps = computed(() => [
  { key: 'sourced', label: t('applications.stepper.sourced') },
  { key: 'screened', label: t('applications.stepper.screened') },
  { key: 'delivered', label: t('applications.stepper.delivered') },
  { key: 'interview', label: t('applications.stepper.interview') },
  { key: 'offer', label: t('applications.stepper.offer') },
  { key: 'hired', label: t('applications.stepper.hired') },
])

const current = computed(() => hiringStepIndex(props.status))
const terminal = computed(() =>
  ['rejected_by_client', 'withdrew', 'screened_fail'].includes(props.status),
)

const nextHint = computed(() => {
  if (terminal.value) return t('applications.stepper.terminal')
  const hints: Record<string, string> = {
    matched: t('applications.stepper.hintApprove'),
    outreach_sent: t('applications.stepper.hintWaiting'),
    responded: t('applications.stepper.hintScreening'),
    screening: t('applications.stepper.hintScreening'),
    screened_pass: t('applications.stepper.hintDelivered'),
    delivered: t('applications.stepper.hintInterview'),
    interview_scheduled: t('applications.stepper.hintMarkInterviewed'),
    interviewed: t('applications.stepper.hintOfferOrHire'),
    offered: t('applications.stepper.hintHire'),
    hired: t('applications.stepper.hintDone'),
  }
  return hints[props.status] ?? ''
})
</script>

<template>
  <UCard>
    <h3 class="section-label mb-4">{{ t('applications.stepper.title') }}</h3>
    <ol class="stepper" :class="{ 'stepper-terminal': terminal }">
      <li
        v-for="(step, i) in steps"
        :key="step.key"
        class="step"
        :class="{
          'step-done': !terminal && i < current,
          'step-active': !terminal && i === current,
          'step-pending': !terminal && i > current,
        }"
      >
        <span class="step-dot" aria-hidden="true" />
        <span class="step-label">{{ step.label }}</span>
      </li>
    </ol>
    <p v-if="nextHint" class="step-hint">{{ nextHint }}</p>
  </UCard>
</template>

<style scoped>
.stepper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 4px;
  list-style: none;
  padding: 0;
  margin: 0;
}
.step {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-subtle);
}
.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--line);
  flex-shrink: 0;
}
.step-done .step-dot {
  background: var(--positive);
}
.step-done .step-label {
  color: var(--ink-muted);
}
.step-active .step-dot {
  background: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.step-active .step-label {
  color: var(--ink);
  font-weight: 500;
}
.stepper-terminal .step-dot {
  background: var(--line);
}
.step-hint {
  margin-top: 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}
</style>
