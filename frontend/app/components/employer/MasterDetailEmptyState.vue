<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description?: string
}>()
</script>

<template>
  <div
    class="h-full flex flex-col items-center justify-center py-20 px-6 text-center border border-dashed border-line-soft rounded-lg bg-bg-elevated"
  >
    <UIcon :name="icon" class="w-12 h-12 mb-3 text-ink-subtle" />
    <h3 class="font-serif text-xl text-ink font-normal">
      {{ title }}
    </h3>
    <p v-if="description" class="max-w-xs mt-1 text-xs text-ink-muted leading-relaxed">
      {{ description }}
    </p>
  </div>
</template>
