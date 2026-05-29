const breadcrumbLabel = ref('')

export function useBreadcrumb() {
  return {
    breadcrumbLabel: readonly(breadcrumbLabel),
    setBreadcrumbLabel: (label: string) => {
      breadcrumbLabel.value = label
    },
    clearBreadcrumbLabel: () => {
      breadcrumbLabel.value = ''
    },
  }
}
