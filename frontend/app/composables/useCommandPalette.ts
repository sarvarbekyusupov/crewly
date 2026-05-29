const paletteOpen = ref(false)

export function useCommandPalette() {
  return {
    paletteOpen,
    open: () => {
      paletteOpen.value = true
    },
    close: () => {
      paletteOpen.value = false
    },
  }
}
