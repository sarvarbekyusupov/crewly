<script setup lang="ts">
const props = defineProps<{
  sections: { id: string; label: string }[]
}>()

const activeId = ref(props.sections[0]?.id ?? '')

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          activeId.value = e.target.id
          break
        }
      }
    },
    { threshold: 0.25 },
  )
  for (const s of props.sections) {
    const el = document.getElementById(s.id)
    if (el) observer.observe(el)
  }
  onUnmounted(() => observer.disconnect())
})

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <nav class="right-nav">
    <p class="nav-heading">On this page</p>
    <ul class="nav-list">
      <li v-for="s in sections" :key="s.id">
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeId === s.id }"
          @click="scrollTo(s.id)"
        >
          {{ s.label }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.right-nav {
  width: 160px;
  flex-shrink: 0;
  position: sticky;
  top: 24px;
  align-self: flex-start;
}
.nav-heading {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-subtle);
  margin-bottom: 10px;
}
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.nav-item {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 5px 8px;
  font-size: 12.5px;
  color: var(--ink-subtle);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.12s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.nav-item:hover {
  color: var(--ink);
  background: var(--bg-elevated);
}
.nav-item.active {
  color: var(--ink);
  font-weight: 600;
  background: var(--bg-elevated);
}
@media (max-width: 1024px) {
  .right-nav {
    display: none;
  }
}
</style>
