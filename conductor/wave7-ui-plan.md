# Advanced Video and Localization (Wave 7)

## Background & Motivation
Wave 6 established an elite standard of gamification and proactive sourcing copilot workflows. Wave 7 focuses on next-generation features that directly address global recruitment friction points: AI-driven job specification optimization to attract better candidates, interactive video screening to humanize automated interviews, and instant resume localization to break down language barriers.

## Scope
1.  **AI Job Spec Optimizer (Employer)**: An inline tool inside the job creation/edit flow that grades a job description (0-100) on readability, gender neutrality, and SEO density, while offering 1-click text replacements.
2.  **Live Video Screening Simulator (Candidate)**: A "Video Mode" toggle in the screening chat (`/candidate/chat/[id].vue`) that splits the screen: Candidate webcam on the left, and an animated AI Recruiter avatar on the right with synchronized subtitles.
3.  **Side-by-Side Resume Localizer (Employer)**: A language translation toggle inside the `EmployerApplicationSlideover.vue` that localizes the candidate's resume text side-by-side into English, Russian, or Uzbek.

## Implementation Strategy

### 1. AI Job Spec Optimizer
*   **Location**: `frontend/app/pages/employer/jobs/create.vue` (and edit forms).
*   **Design**: Add an "Optimize Spec with AI" button near the `UTextarea` for the job description.
*   **Mechanics**: When clicked, it simulates an AI scan. It presents a modal or an inline card with a "Spec Score" (e.g., 85/100).
*   **Features**: It will highlight terms like "rockstar" or "ninja" as warnings (suggesting "Senior Engineer"), show SEO keyword density for the title/skills, and provide an "Apply AI Fixes" button that rewrites the text in the textarea.

### 2. Live Video Screening Simulator
*   **Location**: `frontend/app/pages/candidate/chat/[id].vue`.
*   **Design**: Add a "Video Mode" button alongside the "Voice Mode".
*   **Mechanics**: 
    *   When activated, the UI transitions to a split-pane grid.
    *   **Left Pane**: Uses `navigator.mediaDevices.getUserMedia({ video: true })` to display the candidate's local webcam feed in a `<video>` element. (Handled securely and entirely client-side).
    *   **Right Pane**: Displays a pulsing "AI Avatar" or a stylized glowing orb that visualizes audio playback when the AI recruiter "speaks". Subtitles of the current message appear at the bottom.

### 3. Side-by-Side Resume Localizer
*   **Location**: `frontend/app/components/employer/EmployerApplicationSlideover.vue`.
*   **Design**: In the "AI Dossier" or "Transcript" tab area, add a "Localizer" tab or an "AI Translate" button.
*   **Mechanics**:
    *   When a candidate's profile is loaded, the employer can select a target language (EN, RU, UZ).
    *   The UI displays the original extracted skills/summary next to the simulated translated text. (e.g., "Full-Stack Developer" -> "Full-Stack Разработчик").

## Verification
*   Test webcam permissions and ensure graceful fallbacks if denied or unavailable.
*   Ensure text highlighting in the Job Spec Optimizer works cleanly without breaking Vee-Validate state.
*   Run standard `vitest` and `nuxt typecheck` to guarantee structural type safety.