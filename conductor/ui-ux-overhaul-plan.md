





# Comprehensive UI/UX Overhaul Plan

## Background & Motivation
The **crewly** application operates across three user dimensions (Employer, Candidate, Staff). While functional, the current UX has several pain points: Employers face context-switching fatigue when navigating away from Kanban boards; Candidates lack mobile optimization and engaging discovery workflows (Tinder-style matching); and AI Chat interactions lack transparency during processing delays. 

## Scope & Impact
This overhaul touches both the Employer and Candidate portals in the Nuxt 3 frontend. It will significantly improve candidate engagement (Profile gamification, Tinder-style job discovery, Mobile Bottom Navigation) and employer productivity (Slideovers, Dashboard Filters, Command Palette).

## Proposed Solution (Phased Execution)

### Phase 1: Global Foundations & Navigation
1.  **Mobile Candidate Navigation**: Implement a mobile-first bottom navigation bar for the Candidate portal (visible `< md`, replaces sidebar).
2.  **Command Palette**: Introduce `UCommandPalette` bound to `Cmd+K`/`Ctrl+K` for global search and rapid route jumping across both portals.

### Phase 2: Employer Experience (Productivity)
1.  **Kanban Slideover (`USlideover`)**: Refactor `frontend/app/pages/employer/applications/index.vue` and `frontend/app/pages/employer/candidates/index.vue` to use Nuxt UI's `<USlideover>` instead of full route navigation, preventing context switching.
2.  **Split-Pane Detail View**: Enhance the Slideover/Detail view to support a split-pane layout for easier AI Dossier vs. Original PDF comparisons.
3.  **Live Brain Feed Filters**: Add quick-toggle `<UCheckbox>` or `<UTabs>` to the Dashboard's `LiveBrainFeed.vue` to filter agent events by type (e.g., Matchmaker, Outreach, System) and color-code severity.

### Phase 3: Candidate Experience (Engagement)
1.  **Profile Gamification**: Add a `<UProgress>` ring/bar to `frontend/app/pages/candidate/dashboard.vue` utilizing the `useProfileCompletion` composable, coupled with a dynamic "Next Best Action" prompt to drive profile completion.
2.  **Tinder-Style Job Discovery Feed**: Refactor `frontend/app/pages/candidate/jobs.vue` to use a card-based feed with prominent "Interested" and "Pass" buttons. Integrating an inline feedback chip upon "Pass" to train the AI.
3.  **AI Chat Typing Indicators**: Add an animated skeleton or typing pulse to `frontend/app/pages/candidate/chat/[id].vue` to indicate when the screening agent is processing responses.

## Verification & Testing
*   Verify responsive behavior (Mobile Bottom Nav vs. Desktop Sidebar).
*   Test keyboard bindings (`Cmd+K`).
*   Validate `USlideover` state management to ensure URL states (optional) or board states are maintained seamlessly.
*   Run full `vitest` suite to ensure no existing components break.
*   Run `nuxt typecheck`.

## Alternatives Considered
*   *Modals instead of Slideovers*: Modals obscure the Kanban board context entirely. Slideovers (`USlideover`) slide from the edge, maintaining a visual connection to the board.
*   *Full Page Job Discovery*: Requires excessive scrolling. Card-based discovery keeps the action centralized and feels more engaging on mobile.