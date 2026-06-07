# Multimodal Coaching & High-Density Intelligence (Wave 5)

## Background & Motivation
Wave 4 successfully implemented zero-friction magic links, drag physics, and NLP filtering. Wave 5 focuses on high-level consultative and strategic operations: preparing candidates for actual interviews via mock cockpits, giving employers deep comparison tools, optimizing campaign funnels with A/B testing, and streamlining complex workflows like calendar scheduling.

## Scope
1.  **Interview Prep Cockpit (Candidate)**: A dedicated mock interview sandbox for candidates to practice screening questions with simulated AI voice-to-text analysis (filler word counters, WPM estimation).
2.  **Interactive Journey Timeline (Candidate)**: A milestone-driven tracking view replacing/enhancing the simple kanban application tracker, providing actionable coaching tips for each phase.
3.  **Side-by-Side Candidate Compare (Employer)**: A matrix table allowing recruiters to juxtapose 2-4 candidates head-to-head based on Match Score, Skills, Experience, and AI Gaps/Strengths.
4.  **Outreach Campaign A/B Tester (Employer)**: A dedicated A/B testing panel in the employer dashboard to configure "Template A" vs. "Template B" and visualize funnel success rates.
5.  **Interactive Calendar Slot Grid (Employer)**: A visual, drag-to-select weekly time grid for scheduling Google Meets within the `EmployerApplicationSlideover.vue`, replacing raw datetime inputs.

## Implementation Strategy

### 1. Interview Prep Cockpit
*   Create `frontend/app/pages/candidate/prep.vue`.
*   Build a UI replicating a video/audio recording studio. 
*   Leverage existing `useSpeechRecognition` (or mock logic if unsupported) to capture candidate speech.
*   Process the transcript locally to count filler words ("um", "uh", "like") and estimate words-per-minute (WPM), giving the candidate a dynamic "Communication Score".

### 2. Interactive Journey Timeline
*   Enhance `frontend/app/pages/candidate/tracker.vue`.
*   When a candidate clicks a tracked application, show a `<UStepper>` or a custom vertical milestone timeline.
*   For the active milestone (e.g. "Interviewing"), inject AI coaching advice (e.g., "Research the company's Q3 goals before tomorrow").

### 3. Side-by-Side Candidate Compare
*   In `frontend/app/components/employer/ApplicationsTable.vue` and `applications/index.vue`, add a "Compare Selected" button to the `CommonBulkActionBar`.
*   Open a new `<UModal>` (`CandidateCompareModal.vue`) that renders a responsive grid displaying candidate data columns (AI Assessment, Score, Skills, Resume link) side-by-side.

### 4. Outreach Campaign A/B Tester
*   Inside `frontend/app/pages/employer/analytics.vue` or a new `/employer/campaigns.vue` route, build an A/B test card.
*   Display two columns configuring Template A vs Template B, alongside conversion bar charts showing delivery vs. response rates.

### 5. Interactive Calendar Slot Grid
*   Inside `EmployerApplicationSlideover.vue`, revamp the "Schedule Google Meet Interview" modal.
*   Build a mock weekly calendar grid (Monday-Friday, 9 AM - 5 PM). Let recruiters click cells to highlight blocks of time (e.g. "Wed 2:00 PM").
*   Translate selected blocks into the `scheduleForm.startTime` / `endTime` payload.

## Verification
*   Test cross-browser compatibility of the Speech Recognition API.
*   Ensure the candidate comparison matrix is responsive (horizontal scrolling on smaller viewports).
*   Run standard `vitest` and `nuxt typecheck` to ensure no TypeScript regressions.