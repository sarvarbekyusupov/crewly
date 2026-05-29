export function useBreadcrumb() {
  const ui = useUIStore()
  return {
    breadcrumbLabel: computed(() => ui.breadcrumbLabel),
    setBreadcrumbLabel: ui.setBreadcrumbLabel,
    clearBreadcrumbLabel: ui.clearBreadcrumbLabel,
  }
}
