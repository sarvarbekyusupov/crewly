<script setup lang="ts">
const props = defineProps<{
  sections: { id: string; label: string }[]
}>()

const activeId = ref(props.sections[0]?.id ?? '')

onMounted(() => {
  const scrollRoot = document.querySelector('main.overflow-y-auto') as HTMLElement | null
  if (!scrollRoot) return

  function updateActive() {
    const rootRect = scrollRoot.getBoundingClientRect()
    const atBottom = scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 60
    if (atBottom) {
      activeId.value = props.sections[props.sections.length - 1]?.id ?? activeId.value
      return
    }
    const threshold = rootRect.top + 100
    let found = ''
    for (const s of props.sections) {
      const el = document.getElementById(s.id)
      if (!el) continue
      if (el.getBoundingClientRect().top <= threshold) found = s.id
    }
    if (found) activeId.value = found
  }

  updateActive()
  scrollRoot.addEventListener('scroll', updateActive, { passive: true })
  onUnmounted(() => scrollRoot.removeEventListener('scroll', updateActive))
})

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  activeId.value = id
  const scrollRoot = document.querySelector('main.overflow-y-auto') as HTMLElement | null
  if (scrollRoot) {
    const elRect = el.getBoundingClientRect()
    const rootRect = scrollRoot.getBoundingClientRect()
    scrollRoot.scrollBy({ top: elRect.top - rootRect.top - 16, behavior: 'smooth' })
  } else {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}
</script>

<template>
  <nav class="right-nav">
    <ul class="nav-list">
      <li v-for="s in sections" :key="s.id">
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeId === s.id }"
          @click="scrollTo(s.id)"
        >
          <span class="dot" />
          {{ s.label }}
        </button>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.right-nav {
  width: 168px;
  flex-shrink: 0;
  position: sticky;
  top: 32px;
  align-self: flex-start;
}
.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 9px;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 5px 0;
  font-size: 12.5px;
  font-weight: 400;
  color: var(--ink-subtle);
  cursor: pointer;
  transition: color 0.12s;
  white-space: nowrap;
}
.nav-item:hover {
  color: var(--ink-muted);
}
.nav-item:hover .dot {
  background: var(--ink-muted);
}
.nav-item.active {
  color: var(--positive, #22c55e);
  font-weight: 500;
}
.nav-item.active .dot {
  background: var(--positive, #22c55e);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--positive, #22c55e) 18%, transparent);
}
.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: color-mix(in srgb, var(--ink) 20%, transparent);
  transition:
    background 0.12s,
    box-shadow 0.12s;
}
@media (max-width: 1024px) {
  .right-nav {
    display: none;
  }
}
</style>
