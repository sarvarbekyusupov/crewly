# AI-Native Micro-Interactions & Productivity Plan (Wave 3)

## Background & Motivation
Having achieved an excellent UI baseline with Slideovers, Match Radar Charts, and Real-Time SSE streams, the final milestone is introducing deep AI interactivity and sensory engagement. Wave 3 will transform the app from a visual dashboard into an interactive, multimodal agentic experience.

## Scope
1.  **Sensory Polish & Audio Interactions (Global)**: Implement UI haptics and sounds using `useSound` or native HTML5 Audio for a tactile experience.
2.  **Spring-Physics Swipe Animations (Candidate)**: Add Vue transition classes (or VueUse useSwipe) to the job discovery cards for a true Tinder-like interaction.
3.  **Voice Mode in Screening Chat (Candidate)**: Implement `SpeechRecognition` (Web Speech API) and `SpeechSynthesis` to allow voice-to-text dictation and text-to-voice agent responses in `/candidate/chat/[id].vue`.
4.  **AI Salary Coach (Candidate)**: A responsive calculator/modal inside the Dashboard/Jobs view that estimates compensation alignment based on skills and market norms.
5.  **1-Click Bulk Outreach Personalizer (Employer)**: A modal triggered from the applications board when multiple candidates are selected, allowing the recruiter to prompt the AI to generate personalized emails, preview them, edit, and send in bulk.
6.  **Interactive Screening Rubric Customizer (Employer)**: Allow recruiters to configure specific custom screening criteria (e.g., "Must know Vue.js 3", "Test cultural fit for remote autonomy") inside a modal or slideover, persisting it to the job/application state.

## Implementation Strategy

### 1. Global Sensory Polish
*   Create a `useHaptics` or `useAudio` composable inside `frontend/app/composables/useAudio.ts`.
*   Hook up a subtle 'pop' sound to the swipe/like/pass buttons and a 'swoosh' to message sending.
*   *Note: Provide base64 audio data URI constants to avoid adding static asset files, keeping the implementation lightweight.*

### 2. Candidate Job Swiping Animations
*   Leverage Vue's `<Transition>` with custom `@leave` JS hooks or `@vueuse/core` `useSwipe` inside `frontend/app/pages/candidate/jobs.vue`.
*   Apply CSS transform translations based on X-axis drag, snapping left (red overlay) or right (green overlay) to dismiss/like.

### 3. Candidate Chat Voice Mode
*   Inside `chat/[id].vue`, add a "Voice Mode" toggle button.
*   Integrate `@vueuse/core` `useSpeechRecognition` for real-time dictation input.
*   Integrate `@vueuse/core` `useSpeechSynthesis` for playing back incoming agent messages.
*   Style an active "listening" mic pulse when dictation is on.

### 4. Candidate AI Salary Coach
*   Create `frontend/app/components/candidate/SalaryCoachModal.vue`.
*   Render a slider and dynamic visual charts mapping expected vs. offered ranges, highlighting negotiation talking points (e.g., "Ask for +10% because you have Next.js experience").

### 5. Employer Bulk Outreach Personalizer
*   Modify `frontend/app/pages/employer/applications/index.vue`. Add an action to the `CommonBulkActionBar` -> "Personalize Outreach".
*   Open a new `BulkOutreachEditorModal.vue` containing a sidebar of selected candidates and a main `UTextarea` editor for the drafted email. Include an "AI Rewrite" button.

### 6. Employer Screening Rubric Customizer
*   Add a new `<UButton>` inside `EmployerApplicationSlideover.vue` or the Job details page: "Customize Screening Rubric".
*   Open a `<UModal>` that lets recruiters define 3-5 boolean criteria (e.g., [x] Tech Stack, [x] Communication, [x] Problem Solving) which acts as configuration payload for the screening trigger.

## Verification
*   Test browser compatibility for `useSpeechRecognition` (primarily works best in Chrome/Edge). Ensure fallback to text input.
*   Ensure audio requires user interaction to unlock browser autoplay policies.
*   Run full `nuxt typecheck` and `vitest` pass on completion.