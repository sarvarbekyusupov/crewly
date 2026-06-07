export type Audience = 'employer' | 'candidate'

export const useAudience = () => {
  const cookie = useCookie<Audience>('crewly_audience', { default: () => 'employer' })
  const audience = useState<Audience>('audience', () => cookie.value)

  const set = (a: Audience) => {
    audience.value = a
    cookie.value = a
  }

  return { audience, set }
}
