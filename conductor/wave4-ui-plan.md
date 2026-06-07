# Advanced Visual Delight & Copilot Cockpit (Wave 4)

## Background & Motivation
Wave 3 delivered sensory click audio, dictation, and modal bulk capabilities. Wave 4 sets our sights on a zero-friction experience: passwordless auth flows, drag-and-drop physics, and Copilot-driven UI filtering (simulated AI natural-language parsers). This wave bridges the gap between traditional SaaS and cutting-edge next-gen app experiences.

## Scope
1.  **Fluid Drag-Physics Job Cards (Candidate)**: Add touch/mouse drag physics to the `jobs.vue` Tinder discovery cards. Dragging left/right rotates the card and eventually drops it into a Pass/Interested state.
2.  **Passwordless Magic Links (Candidate)**: Enhance the candidate login view (`login.vue`) with a "Magic Link" toggle that abstracts the password requirement away and offers an instant email verification simulation.
3.  **Copilot Natural Language Filter (Employer)**: Add a command input to the Employer Applications page. A candidate types "Show me seniors matching >80%" and a local parser extracts intents to set `statusFilter` or `search` parameters.
4.  **Outreach Template Manager (Employer)**: A new tab in the Slideover or `BulkOutreachEditorModal.vue` allowing recruiters to select saved templates (e.g. "Senior Dev Intro", "Rejection") containing `{name}` and `{job}` dynamic tags.
5.  **SVG Success Micro-Animations (Global)**: Implement highly visual animated SVGs for key milestone states (e.g., Application Approved, Outreach Sent).

## Implementation Strategy

### 1. Fluid Drag-Physics
*   Inside `frontend/app/pages/candidate/jobs.vue`, wrap the current Discovery card with `@vueuse/core` `usePointerSwipe` or a custom touch-start/touch-move event listener.
*   Track `x` and `y` offsets, applying a `transform: translate3d(X, Y, 0) rotate(Zdeg)` to the active card style.
*   Once `X` passes a threshold (e.g. +/- 100px), trigger `handlePass` or `handleLike` and transition the card off-screen.

### 2. Passwordless Magic Links
*   Modify `frontend/app/pages/candidate/login.vue`.
*   Add a tab: "Password" vs. "Magic Link".
*   In "Magic Link" mode, only accept Email. Upon submit, show an SVG envelope animation with "Check your email!". Clicking a mock "Log in via Email" link drops them directly into the dashboard.

### 3. Copilot NLP Filter Bar
*   Modify `frontend/app/pages/employer/applications/index.vue`. Add an input field at the top: `<UInput icon="i-heroicons-sparkles" placeholder="Ask AI to filter candidates (e.g. 'Show matched candidates')..." />`.
*   Implement a local mock-parser (regex based) to catch keywords: "matched", "passed", "interview", "senior", ">80%", "> 80", and apply them to the page's reactive data filters.

### 4. Dynamic Outreach Templates
*   Inside `frontend/app/components/employer/BulkOutreachEditorModal.vue`.
*   Add a dropdown: "Select Template".
*   Define templates with `{name}`, `{job}`, `{skills}`. 
*   When selected, the composer auto-replaces tags with candidate data.

### 5. SVG Micro-Animations
*   Create a reusable component `frontend/app/components/common/AnimatedSuccessSvg.vue`.
*   Use standard animated stroke-dashoffset paths for a tick/checkmark or confetti pop.
*   Show this when completing bulk outreach or onboarding.

## Verification
*   Verify drag physics doesn't interfere with vertical page scrolling on mobile (handle passive touch listeners correctly).
*   Test NLP parser against various phrasing structures.
*   Run `vitest` and `nuxt typecheck`.