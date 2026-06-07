# Advanced UI/UX Overhaul Plan (Phase 2)

## Background & Motivation
Following the successful implementation of the first UI/UX overhaul (Employer Slideovers, Candidate Discovery Feed, Mobile Nav), we are moving to the next level of premium UX features. These upgrades aim to make the platform feel like a top-tier SaaS product by introducing rich data visualizations, interactive onboarding, and real-time responsiveness.

## Scope
1.  **AI Onboarding Wizard (Candidate)**: First-time login experience.
2.  **Job Match Breakdown Visualizer (Candidate)**: Radar charts for skill alignment.
3.  **Real-Time Message Push (Candidate)**: Instant chat using SSE.
4.  **Notification Hub (Employer)**: Real-time popover alerts.
5.  **Resume Highlight Mode (Employer)**: Enhancing the split-PDF view with extracted skill highlights.
6.  **Outreach Analytics Dashboard (Employer)**: Data visualizations for conversion rates.

## Implementation Strategy

### 1. Candidate Portal Enhancements
*   **AI Onboarding Wizard (`<UStepper>`)**: 
    *   Create a new route `/candidate/onboarding`.
    *   If a candidate logs in and their profile is empty, redirect here.
    *   Steps: 1. Welcome & Upload CV, 2. AI Parsing (Simulated delay + real backend call), 3. Confirm Extracted Data & Preferences.
*   **Job Match Breakdown Visualizer (Radar Chart)**:
    *   Leverage our existing `chart.js` and `vue-chartjs` dependencies.
    *   On the `/candidate/jobs` detail expansion, render a `Radar` chart plotting the candidate's skills vs. the job's required skills based on the `shadowAnalysis` dimensions.
*   **Real-Time SSE Chat (`/candidate/chat/[id].vue`)**:
    *   Replace `setInterval` polling with the existing `useCandidateEventStream` composable.
    *   Listen for `chat.message` events and push directly to the `messages` ref to achieve zero-latency conversational UI.

### 2. Employer Portal Enhancements
*   **Notification Hub (`<UPopover>`)**:
    *   In `layouts/default.vue`, replace the dummy notification bell toast with a `<UPopover>`.
    *   Inside the popover, render a list of recent system events (e.g., "New Match", "Interview Scheduled").
*   **Resume Highlight Mode**:
    *   In `EmployerApplicationSlideover.vue`, add a toggle above the PDF iframe: "Show Extracted Match Data".
    *   When active, render a panel showing exactly which required skills were found in the resume (Green) and which are missing (Yellow).
*   **Outreach Analytics**:
    *   In `/employer/analytics.vue`, add new `Bar` or `Line` charts specifically tracking "Outreach Conversion" (Delivered -> Interview -> Offer) using dummy or existing aggregated API data.

## Verification & Testing
*   Ensure all new charts render correctly without breaking the Vite dev server.
*   Verify SSE streams don't cause memory leaks on route navigation.
*   Run `vitest` and `nuxt typecheck`.
