export const useUIStore = defineStore('ui', () => {
  const breadcrumbLabel = ref('')
  const paletteOpen = ref(false)

  function setBreadcrumbLabel(label: string) {
    breadcrumbLabel.value = label
  }

  function clearBreadcrumbLabel() {
    breadcrumbLabel.value = ''
  }

  function openPalette() {
    paletteOpen.value = true
  }

  function closePalette() {
    paletteOpen.value = false
  }

  return {
    breadcrumbLabel: readonly(breadcrumbLabel),
    paletteOpen,
    setBreadcrumbLabel,
    clearBreadcrumbLabel,
    openPalette,
    closePalette,
  }
})
