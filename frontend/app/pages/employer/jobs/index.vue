<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div
    class="h-full flex flex-col items-center justify-center py-20 text-center border border-dashed rounded-lg"
    style="background: var(--surface); border-color: var(--line-soft)"
  >
    <UIcon name="i-heroicons-briefcase" class="w-12 h-12 mb-3" style="color: var(--ink-subtle)" />
    <p style="font-family: 'Fraunces', serif; font-size: 20px; color: var(--ink); font-weight: 400">
      No Job Selected
    </p>
    <p class="max-w-xs mt-1" style="font-size: 13px; color: var(--ink-muted)">
      Select a job from the left panel to view detailed information, candidate matching analysis,
      and applications.
    </p>
  </div>
</template>
