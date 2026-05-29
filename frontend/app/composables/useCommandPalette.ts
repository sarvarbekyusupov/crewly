export function useCommandPalette() {
  const ui = useUIStore()
  return {
    open: ui.openPalette,
    close: ui.closePalette,
  }
}
