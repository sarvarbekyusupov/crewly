<script setup lang="ts">
const props = defineProps<{ name: string; size?: number }>()

const BG_COLORS = [
  '#e8f4fd',
  '#fef3c7',
  '#d1fae5',
  '#fce7f3',
  '#ede9fe',
  '#ffedd5',
  '#f0fdf4',
  '#fef9c3',
]
const TEXT_COLORS = [
  '#1d6fa4',
  '#92400e',
  '#065f46',
  '#9d174d',
  '#5b21b6',
  '#9a3412',
  '#14532d',
  '#713f12',
]

function hashName(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % BG_COLORS.length
  return h
}

const idx = computed(() => hashName(props.name || '?'))
const bg = computed(() => BG_COLORS[idx.value] ?? BG_COLORS[0])
const fg = computed(() => TEXT_COLORS[idx.value] ?? TEXT_COLORS[0])
const initials = computed(() => {
  const parts = (props.name || '?').trim().split(/\s+/)
  if (parts.length === 1) return (parts[0]![0] ?? '?').toUpperCase()
  return ((parts[0]![0] ?? '') + (parts[parts.length - 1]![0] ?? '')).toUpperCase()
})
const sz = computed(() => props.size ?? 36)
</script>

<template>
  <div
    class="avatar"
    :style="{
      width: sz + 'px',
      height: sz + 'px',
      background: bg,
      color: fg,
      fontSize: Math.floor(sz * 0.36) + 'px',
    }"
  >
    {{ initials }}
  </div>
</template>

<style scoped>
.avatar {
  border-radius: 9px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
</style>
