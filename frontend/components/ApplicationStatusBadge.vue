<script setup lang="ts">
const props = defineProps<{
  status: string
  size?: 'xs' | 'sm' | 'md'
}>()

const { appStatusLabel } = useStatusLabels()

const label = computed(() => appStatusLabel(props.status))
</script>

<template>
  <UBadge :color="appStatusColor(status)" variant="subtle" :size="size ?? 'xs'">
    {{ label }}
  </UBadge>
</template>
