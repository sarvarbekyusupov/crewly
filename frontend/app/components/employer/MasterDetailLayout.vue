<script setup lang="ts">
defineProps<{
  isDetailRoute: boolean
  eyebrow?: string
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
    <!-- Left panel (master list) -->
    <div class="lg:col-span-5 flex flex-col space-y-5" :class="{ 'hidden lg:flex': isDetailRoute }">
      <CommonPageHead :eyebrow="eyebrow" :title="title" :subtitle="subtitle">
        <template #default>
          <slot name="header-actions" />
        </template>
      </CommonPageHead>

      <slot name="list" />
    </div>

    <!-- Right panel (detail view) -->
    <div class="lg:col-span-7 h-full" :class="{ 'hidden lg:block': !isDetailRoute }">
      <slot />
    </div>
  </div>
</template>
