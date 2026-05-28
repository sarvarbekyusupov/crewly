<script setup lang="ts">
defineProps<{
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  actionTo?: string
}>()
</script>

<template>
  <div class="flex flex-col items-center py-14 gap-3 text-center">
    <UIcon v-if="icon" :name="icon" class="w-10 h-10" style="color: var(--ink-subtle)" />
    <p class="font-medium" style="color: var(--ink)">{{ title }}</p>
    <p v-if="description" class="text-sm max-w-sm" style="color: var(--ink-muted)">
      {{ description }}
    </p>
    <UButton v-if="actionLabel && actionTo" :to="actionTo" size="sm" class="mt-2">
      {{ actionLabel }}
    </UButton>
    <slot />
  </div>
</template>
