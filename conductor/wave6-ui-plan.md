# Elite AI Sourcing & Gamification Plan (Wave 6)

## Background & Motivation
Wave 5 delivered outstanding analytics, side-by-side matrices, and mock interview capabilities. Wave 6 focuses on the peak of modern product design: deeply engaging gamification for candidates (career roadmaps and badges), incredibly fast sourcing tools for recruiters (clipboard parsing), and joyful micro-interactions (confetti and drag-and-drop).

## Scope
1.  **AI Career Path Navigator (Candidate)**: Interactive step-by-step skill roadmap on the candidate profile.
2.  **Skill Badge Certifications (Candidate)**: Glowing, premium 3D-styled skill badges to showcase verified competencies.
3.  **Sourcing Clipboard Copilot (Employer)**: A raw-text parser modal allowing recruiters to paste LinkedIn bios and instantly generate candidate profiles via simulated AI extraction.
4.  **Match Score Breakdown Inspector (Employer)**: An interactive popover/radar gauge attached to Match Score badges across the application, revealing exactly why points were awarded/deducted.
5.  **Confetti-Pop Milestones (Global)**: A lightweight, dependency-free confetti animation composable triggered upon completing significant actions (e.g. successful sourcing, onboarding).
6.  **Spring-Physics Drag Columns (Employer)**: Interactive HTML5 Drag-and-Drop column reordering on the Kanban board to allow recruiters to customize pipeline flow.

## Implementation Strategy

### 1. Interactive Career Pathing & Badges
*   **Location**: `frontend/app/pages/candidate/profile.vue`.
*   **Design**: Add a new section for "Career Path Navigator". Candidates select a "Target Role" (e.g. Senior Frontend Engineer). A vertical stepper maps out current skills vs. missing skills needed to reach the goal.
*   **Badges**: Apply premium CSS styles (drop-shadows, gradients, subtle animations) to a new `VerifiedSkillBadge` component to render verified skills.

### 2. Recruiter Sourcing Clipboard Copilot
*   **Location**: Add a "Quick Source" button in `frontend/app/pages/employer/applications/index.vue` triggering a new `SourcingClipboardModal.vue`.
*   **Design**: The modal features a large `<UTextarea>` to paste raw profile data. A "Parse with AI" button simulates extraction, outputting a structured, editable form (Name, Email, Skills, Current Company) before confirming the addition to the pipeline.

### 3. Match Score Inspector Popover
*   **Location**: `frontend/app/components/employer/ApplicationsTable.vue` and Kanban cards.
*   **Design**: Wrap the Match Score `<UBadge>` in a `<UPopover>`. On hover/click, display a mini radar chart and a breakdown of the 5 scoring sub-dimensions (Technical, Communication, Culture, Experience, Autonomy).

### 4. Confetti Micro-Interactions
*   **Location**: `frontend/app/composables/useConfetti.ts`.
*   **Design**: Create a lightweight utility that dynamically injects animated DOM elements (colored squares/circles) that burst from the center/bottom of the screen using CSS keyframes, auto-cleaning themselves up after 3 seconds. Wire this into the "Save" action of the Sourcing Copilot and the Onboarding Wizard.

### 5. Drag-and-Drop Kanban Columns
*   **Location**: `frontend/app/components/ApplicationKanban.vue`.
*   **Design**: Apply `draggable="true"` to the column headers. Implement `dragstart`, `dragover`, and `drop` event listeners to reorder the underlying `columns` array reactively, allowing custom pipeline layouts.

## Verification
*   Test Kanban drag-and-drop on desktop (HTML5 DnD).
*   Verify `useConfetti` does not leave orphaned DOM nodes (memory leak check).
*   Run standard `vitest` and `nuxt typecheck` to guarantee structural type safety.