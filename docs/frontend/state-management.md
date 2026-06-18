# State Management

8 Pinia stores, 20 composables.

---

## Pinia Stores

### `auth` (`stores/auth.ts`)

HR staff authentication state.

```typescript
state: {
  user: User | null,
  loading: boolean,
}

computed: {
  isAuthenticated: user != null,
  role: user?.role,
}

actions: {
  fetchMe()        // GET /auth/me → set user
  login(email, password)  // POST /auth/login → set user
  logout()         // POST /auth/logout → clear user, redirect /employer/login
  can(minRole)     // role hierarchy check: can('hiring_manager')
  clearUser()      // clear state (on 401)
}
```

`can()` implementation:
```typescript
const ROLE_VALUES = { owner: 4, admin: 3, hiring_manager: 2, viewer: 1 }
can(minRole: Role): boolean {
  return ROLE_VALUES[user.role] >= ROLE_VALUES[minRole]
}
```

### `candidate-auth` (`stores/candidate-auth.ts`)

Candidate authentication state. Same shape as `auth` but for candidates.

```typescript
state: {
  candidate: Candidate | null,
  loading: boolean,
}

actions: {
  fetchMe()
  login(email, password)
  signup(email, password, fullName)
  initiateGoogleLogin()   // redirect to /candidate-auth/google
  logout()
  clearCandidate()
}
```

### `ui` (`stores/ui.ts`)

UI state shared between components.

```typescript
state: {
  breadcrumbLabel: string | null,   // custom breadcrumb text
  paletteOpen: boolean,             // command palette visible
}

actions: {
  setBreadcrumbLabel(label)
  clearBreadcrumbLabel()
  openPalette()
  closePalette()
}
```

### `events` (`stores/events.ts`)

Real-time event state for HR portal SSE stream.

```typescript
state: {
  connectionState: 'connecting' | 'connected' | 'disconnected',
  eventCount: number,
  lastEvent: SSEEvent | null,
  agentThoughts: AgentThought[],   // live AI activity feed
}

actions: {
  pushAgentThought(thought)        // adds to live feed in default.vue layout
}
```

### `staff-events` (`stores/staff-events.ts`)

Same structure as `events` but for staff portal SSE.

### `staff` (`stores/staff.ts`)

Staff admin state (current staff user, loading).

### `onboarding` (`stores/onboarding.ts`)

7-step candidate onboarding wizard state.

```typescript
state: {
  currentStep: number,    // 0-6
  formData: {
    // accumulated across steps
    fullName?, role?, skills?, experience?, salary?, location?, settings?
  },
  completed: boolean[]    // which steps are done
}

actions: {
  nextStep()
  prevStep()
  setStepData(step, data)
  submit()    // POST /candidate-portal/profile
}
```

### `tma` (`stores/tma.ts`)

Telegram Mini App session.

```typescript
state: {
  token: string | null,
  role: 'candidate' | 'hr' | null,
  profile: Candidate | User | null,
}

computed: {
  isAuthenticated,
  isHR,
  isCandidate
}

actions: {
  login(initData)   // POST /tma/auth
  logout()
}
```

---

## Composables

### API Clients

#### `useApi()` — HR portal API
```typescript
const api = useApi()
const jobs = await api('/jobs?status=active')
// Handles: 401 → auto-refresh → retry, 403 → toast, network error → toast
```

Internally wraps `$fetch` with:
- Cookie forwarding (SSR)
- Auto-refresh via `tryRefreshHrToken()` on 401
- Global error handler (toast + redirect on auth failure)

#### `useCandidateApi()` — Candidate portal API
Same pattern, uses `c_access_token` + `tryRefreshCandidateToken()`.

#### `useStaffApi()` — Staff admin API
Same pattern, uses `staff_session`.

#### `useApiBase()` — Base factory
Shared logic used by all three API composables. Exports:
```typescript
buildApiClient(baseUrl, options)
createTokenRefresher(refreshEndpoint)
```

---

### SSE Streams

#### `useEventStream()` — HR portal
```typescript
const { connectionState, subscribe } = useEventStream()
subscribe('new_match', (event) => {
  // refresh applications list
})
```

Manages EventSource lifecycle: connect on mount, reconnect on disconnect (5s delay), disconnect on unmount.

#### `useCandidateEventStream()` — Candidate portal
Same API. Events: `scoring_complete`, `resume_parsed`, `new_message`, `application_status`.

Auto-navigates on `new_matches` event if candidate is on dashboard.

#### `useStaffEventStream()` — Staff portal
Platform-wide events for admin monitoring.

---

### UI Utilities

#### `useListQuery()`
Builds stable `useAsyncData` cache keys from route + query params. Prevents stale data when navigating between paginated lists.

```typescript
const { data, pending, refresh } = useListQuery('/applications', {
  jobId: route.query.jobId,
  status: route.query.status,
  page: route.query.page ?? 1,
})
```

#### `useCommandPalette()` + `useCommandPaletteSearch()`
Command palette (⌘K in employer portal). Fuzzy search across jobs, candidates, navigation.

#### `useProfileCompletion()` (candidate portal)
Tracks which profile sections are filled. Returns `{ percentage, missingSections[] }`.

#### `useResourceInvalidation()`
Refreshes `useAsyncData` caches after mutations.
```typescript
const { invalidate } = useResourceInvalidation()
await api.patch('/jobs/uuid', data)
invalidate('jobs-list')
```

#### `useBreadcrumb()`
Injects dynamic breadcrumb labels into `default.vue` layout.
```typescript
useBreadcrumb('John Smith — Backend Engineer')
// appears in breadcrumb as: Jobs > Applications > John Smith — Backend Engineer
```

#### `useStatusLabels()`
Returns styled label config per application status:
```typescript
const { appStatusLabel } = useStatusLabels()
const label = appStatusLabel('screening')
// { text: 'In Screening', color: 'blue', icon: 'heroicons:chat-bubble-left' }
```

---

### Feature Composables

#### `useTma()`
Telegram Mini App SDK wrapper.
```typescript
const { isTma, init, getInitData } = useTma()
if (isTma.value) {
  await init()
  const data = getInitData()  // window.Telegram.WebApp.initData
}
```

#### `useHhSuggests()`
HH.uz autocomplete for job form fields (areas, skills, positions).
```typescript
const { suggestions, search } = useHhSuggests('skills')
await search('java')  // → ['Java', 'JavaScript', 'JavaFX', ...]
```

#### `useAudience()`
User segmentation — sets `employer` or `candidate` context for analytics.

#### `useConfetti()`
Celebration animation. Used on successful hire, onboarding completion.

#### `useAudio()`
Notification sounds. One subtle ping on new SSE event.

#### `useFadeIn()`
Page entrance animation. Applied in layouts.
