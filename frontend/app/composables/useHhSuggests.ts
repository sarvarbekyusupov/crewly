interface SuggestItem {
  id: string
  text: string
}

export function useHhSuggests() {
  const config = useRuntimeConfig()
  const base = config.public.apiBase as string

  async function fetchSuggests(endpoint: string, text: string): Promise<SuggestItem[]> {
    if (!text?.trim() || text.trim().length < 2) return []
    try {
      const res = await $fetch<SuggestItem[]>(
        `${base}/api/v1/candidate-portal/hh/suggests/${endpoint}`,
        { params: { text }, credentials: 'include' },
      )
      return res ?? []
    } catch {
      return []
    }
  }

  function searchAreas(text: string) {
    return fetchSuggests('areas', text)
  }

  function searchSkills(text: string) {
    return fetchSuggests('skills', text)
  }

  function searchUniversities(text: string) {
    return fetchSuggests('universities', text)
  }

  return { searchAreas, searchSkills, searchUniversities }
}
