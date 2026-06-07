<script setup lang="ts">
defineProps<{
  message?: string
  retry?: () => void
}>()
</script>

<template>
  <div class="flex flex-col items-center py-14 gap-3 text-center">
    <UIcon
      name="i-heroicons-exclamation-triangle"
      class="w-10 h-10"
      style="color: var(--negative)"
    />
    <p class="font-medium" style="color: var(--ink)">Failed to load</p>
    <p v-if="message" class="text-sm max-w-sm" style="color: var(--ink-muted)">{{ message }}</p>
    <UButton v-if="retry" size="sm" variant="outline" class="mt-2" @click="retry">
      Try again
    </UButton>
  </div>
</template>
