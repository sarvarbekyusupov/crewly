# HeadHunter (HH) API Integration Review & Plan

## 1. Objective
To audit the current HeadHunter (HH) API integration for correctness against the latest documentation, rectify deprecated or incorrect usages, and expand the integration to support missing capabilities crucial for a seamless hiring workflow.

## 2. Current State Assessment
We have reviewed the core integration services located in `backend/src/integrations/hh/`.

### 2.1. Correctly Integrated Capabilities
- **OAuth Authentication:** The candidate authorization flow (`HhOAuthService`) correctly implements the standard OAuth 2.0 pattern (`/oauth/authorize` and `/oauth/token`).
- **Profile Synchronization:** `HhProfileSyncService` successfully handles reading (`/resumes/mine`) and updating resumes.
- **Vacancy Management:** Basic CRUD operations (Create, Update, Publish, Archive) in `HhVacancyService` are broadly aligned with standard HH workflows.
- **Negotiation States:** `HhNegotiationsService` correctly fetches employer states and active negotiations.

### 2.2. Incorrect or Deprecated Implementations
- **CRITICAL: Deprecated Messaging API:** 
  - **Issue:** `HhNegotiationsService.getMessages` and `sendMessage` rely on the old `/negotiations/{id}/messages` endpoints.
  - **Context:** The HH documentation explicitly warns: *"методы для работы с сообщениями в рамках отклика/приглашения... устарели, и новые возможности чатов в них не будут поддерживаться."*
  - **Fix:** We must migrate messaging functionality to the new **HH Chats API** to ensure messages are delivered and received reliably.
- **Vacancy Deletion / Hiding:**
  - **Issue:** `HhVacancyService.deleteVacancy` currently executes `DELETE /vacancies/{hhVacancyId}`. 
  - **Fix:** The documentation refers to "Удаление вакансий" as moving them to hidden. We need to update this to hit the correct `add-vacancy-to-hidden` OpenAPI endpoint.
- **Candidate Invitations:**
  - **Issue:** `inviteCandidate` submits a generic `POST /negotiations`. 
  - **Fix:** HH uses specific action URLs (e.g., `/negotiations/interview`) with query parameters/body arguments. We need to dynamically fetch available actions for a negotiation and execute the specific action URL.

## 3. APIs to Connect & Add

To maximize the value of the HH integration, we need to implement the following new capabilities:

### 3.1. Webhook Integration
- **Why:** Currently, we rely on cron jobs (e.g., `sync-hh-status.processor.ts`) to poll for status changes. This is inefficient and delays notifications.
- **Action:** Implement the **HH Webhook API**.
  - Create an endpoint in our backend to receive HH webhooks.
  - Automatically subscribe our app to events (e.g., new applications, status changes, incoming chat messages).

### 3.2. Applicant Direct Apply
- **Why:** Candidates on our platform should be able to apply to HH vacancies seamlessly.
- **Action:** Implement the "Откликнуться на вакансию" (Applicant Apply) endpoint for authenticated candidates.

### 3.3. Paid Contact Reveal Logic (Payable Resumes)
- **Why:** HH has shifted to a model where viewing contact info deducts from a quota. Our current automated sync might inadvertently burn quota or fail with `403` errors if not handled carefully.
- **Action:** Ensure our backend gracefully handles `403 api_access_payment` errors. Implement a "Reveal Contacts" action that explicitly uses the `actions` links provided in the resume payload, allowing recruiters to intentionally spend quota.

### 3.4. HH Suggests (Autocomplete)
- **Why:** Free-text entry for cities, skills, and universities leads to poor matching.
- **Action:** Integrate HH Suggests endpoints (`/suggests/areas`, `/suggests/skill_set`, `/suggests/educational_institutions`) into our frontend UI to ensure standardized data entry aligned with HH dictionaries.

## 4. Implementation Steps

1. **Phase 1: Urgent Fixes**
   - Migrate `HhNegotiationsService` messaging to the new Chats API.
   - Refactor candidate invitation logic to respect dynamic action URLs.
   - Correct the vacancy deletion/hiding endpoint.
2. **Phase 2: Webhooks & Performance**
   - Create webhook receiving endpoints.
   - Register webhook subscriptions on application startup/auth.
   - Deprecate aggressive polling in favor of event-driven updates.
3. **Phase 3: New Features**
   - Add backend support and UI for "Direct Apply" as a candidate.
   - Implement strict handling for payable resume quotas.
   - Wire up frontend autocompletes to HH Suggests via our backend.

## 5. Verification
- Verify successful message exchange using a test employer and test candidate account without hitting the deprecated endpoints.
- Confirm webhooks are received and successfully update internal database states (e.g., application status changes).
- Validate that quota is not deducted automatically unless explicitly requested via the UI.