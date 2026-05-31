<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

defineProps<{
  title: string
  confirmLabel?: string
  confirmColor?: 'primary' | 'error' | 'success'
  loading?: boolean
}>()

defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <UModal v-model:open="open" :title="title">
    <template #body>
      <slot />
    </template>
    <template #footer="{ close }">
      <div class="flex justify-end gap-2">
        <UButton variant="ghost" @click="close">{{ t('common.cancel') }}</UButton>
        <UButton :color="confirmColor ?? 'primary'" :loading="loading" @click="$emit('confirm')">
          {{ confirmLabel ?? t('common.confirm') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
