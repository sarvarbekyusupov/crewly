<script setup lang="ts">
defineProps<{
  count: number
  loading?: boolean
}>()

defineEmits<{
  approve: []
  reject: []
  clear: []
  personalize: []
  compare: []
}>()

const { t } = useI18n()
</script>

<template>
  <Transition name="slide-down">
    <div
      v-if="count > 0"
      class="flex items-center gap-3 px-4 py-2.5 rounded-xl mb-2"
      style="background: var(--accent-soft); border: 1px solid var(--accent)"
      role="toolbar"
      :aria-label="t('applications.bulkSelected', { count })"
    >
      <span class="text-sm font-medium flex-1" style="color: var(--ink)">
        {{ t('applications.bulkSelected', { count }) }}
      </span>
      <UButton
        v-if="count >= 2"
        size="xs"
        color="primary"
        variant="solid"
        :loading="loading"
        icon="i-heroicons-squares-plus"
        @click="$emit('compare')"
      >
        Compare
      </UButton>
      <UButton
        size="xs"
        color="primary"
        variant="soft"
        :loading="loading"
        icon="i-heroicons-sparkles"
        @click="$emit('personalize')"
      >
        Personalize
      </UButton>
      <UButton
        size="xs"
        color="success"
        variant="soft"
        :loading="loading"
        icon="i-heroicons-check"
        @click="$emit('approve')"
      >
        {{ t('applications.approve') }}
      </UButton>
      <UButton
        size="xs"
        color="error"
        variant="soft"
        :loading="loading"
        icon="i-heroicons-x-mark"
        @click="$emit('reject')"
      >
        {{ t('applications.reject') }}
      </UButton>
      <UButton
        size="xs"
        variant="ghost"
        icon="i-heroicons-x-mark"
        :aria-label="t('common.cancel')"
        @click="$emit('clear')"
      />
    </div>
  </Transition>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
