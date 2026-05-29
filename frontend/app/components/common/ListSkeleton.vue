<script setup lang="ts">
defineProps<{
  variant?: 'table' | 'kanban' | 'cards'
  rows?: number
}>()
</script>

<template>
  <div v-if="variant === 'kanban'" class="overflow-x-auto pb-4">
    <div class="flex gap-3" style="min-width: max-content">
      <div
        v-for="i in 6"
        :key="i"
        class="rounded-xl animate-pulse"
        style="
          width: 220px;
          height: 320px;
          background: var(--bg-elevated);
          border: 1px solid var(--line-soft);
        "
      />
    </div>
  </div>
  <div v-else-if="variant === 'cards'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
    <div
      v-for="i in rows ?? 6"
      :key="i"
      class="rounded-xl animate-pulse h-28"
      style="background: var(--bg-elevated); border: 1px solid var(--line-soft)"
    />
  </div>
  <div v-else class="space-y-2">
    <div
      v-for="i in rows ?? 8"
      :key="i"
      class="h-12 rounded-lg animate-pulse"
      style="background: var(--bg-elevated)"
    />
  </div>
</template>
