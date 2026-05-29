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
  <UModal v-model:open="open">
    <UCard>
      <template #header>
        <p class="font-medium" style="color: var(--ink)">{{ title }}</p>
      </template>
      <slot />
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="ghost" @click="open = false">{{ t('common.cancel') }}</UButton>
          <UButton :color="confirmColor ?? 'primary'" :loading="loading" @click="$emit('confirm')">
            {{ confirmLabel ?? t('common.confirm') }}
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>
