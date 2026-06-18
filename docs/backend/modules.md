# Backend Modules

NestJS 11. 25 feature modules. Source: `backend/src/`.

---

## Module Map

```
src/
├── app.module.ts          # Root — imports all 25 modules
├── config/
│   ├── config.module.ts   # ConfigModule (Zod env validation)
│   └── env.validation.ts  # All 53 env vars with types + defaults
├── prisma/
│   ├── prisma.module.ts   # Global PrismaModule
│   └── prisma.service.ts  # PrismaClient singleton with lifecycle
├── common/
│   ├── common.module.ts
│   ├── cron.service.ts    # Registers all 7 recurring BullMQ jobs
│   ├── health.controller.ts  # GET /health
│   ├── guards/
│   │   ├── auth.guard.ts           # HR JWT cookie guard
│   │   ├── staff.guard.ts          # Staff session guard
│   │   ├── company-role.guard.ts   # Role hierarchy enforcement
│   │   └── user-throttler.guard.ts # Per-user rate limiting
│   ├── interceptors/
│   │   ├── audit.interceptor.ts    # Log all mutations to AuditLog
│   │   ├── bigint.interceptor.ts   # Serialize BigInt → string in JSON
│   │   └── tenant.interceptor.ts   # Extract companyId from JWT
│   ├── filters/
│   │   └── global-exception.filter.ts  # Standardize error responses
│   ├── pipes/
│   │   └── zod-validation.pipe.ts  # Validate DTOs with Zod schemas
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── current-candidate.decorator.ts
│   │   ├── public.decorator.ts      # @Public() — skip AuthGuard
│   │   ├── roles.decorator.ts       # @RequireRole('hiring_manager')
│   │   └── staff-only.decorator.ts  # @StaffOnly()
│   └── services/
│       └── idempotency.service.ts   # Webhook deduplication
├── modules/               # Feature modules (20)
├── integrations/          # External services (10)
└── workers/               # BullMQ processors (14)
```

---

## Feature Modules

### `modules/auth`
HR email/password auth, JWT cookies, email verification, password reset.  
Controller: `AuthController`  
Services: `AuthService`, `EmailVerificationService`, `PasswordResetService`

### `modules/staff-auth`
Internal admin auth (session-based, not JWT).  
Controller: `StaffAuthController`  
Service: `StaffService`

### `modules/candidate-auth`
Candidate auth: email/password + Google OAuth.  
Controller: `CandidateAuthController`  
Service: `CandidateAuthService`  
Strategy: `GoogleStrategy` (Passport.js)

### `modules/jobs`
Job posting CRUD + HH.uz publishing.  
Controller: `JobsController`  
Service: `JobsService`  
On create/update: enqueues `parse-job` worker

### `modules/applications`
Application lifecycle: approve → screen → interview → hire.  
Controller: `ApplicationsController`  
Service: `ApplicationsService`  
On hire: creates `Placement` + triggers `generate-dossier`

### `modules/candidates`
Read-only candidate database view for HR.  
Controller: `CandidatesController`  
Service: `CandidatesService`

### `modules/candidate-portal`
Candidate self-service: profile, CV, job discovery, HH/LinkedIn integrations.  
Controller: `CandidatePortalController` (large — all candidate-portal endpoints)  
Service: `CandidatePortalService`  
Also includes: `HhCandidatePortalService`, `LinkedInPortalService`

### `modules/companies`
Company profile management + team members.  
Controller: `CompaniesController`  
Service: `CompaniesService`

### `modules/screenings`
AI screening interview sessions.  
Controller: `ScreeningsController`  
Service: `ScreeningsService`  
On create: enqueues `advance-screening` worker

### `modules/conversations`
Recruiter-candidate messaging threads.  
Controller: `ConversationsController`  
Service: `ConversationsService`

### `modules/placements`
Hire records and separation tracking.  
Controller: `PlacementsController`  
Service: `PlacementsService`  
On create: generates invoice

### `modules/invoices`
Billing: Payme payment links + manual payment tracking.  
Controller: `InvoicesController`  
Service: `InvoicesService`

### `modules/dashboard`
KPI aggregation for HR portal dashboard.  
Controller: `DashboardController`  
Service: `DashboardService`

### `modules/agents`
AI agent orchestration. No HTTP controllers — all called from workers.  
Services: `MatchmakerAgent`, `ScreeningAgent`, `OutreachAgent`, `SourcingAgent`, `DebriefAgent`, `SeekerAgent`, `PipelineCoordinator`, `TelegramPipelineHandler`

### `modules/tma`
Telegram Mini App endpoints.  
Controller: `TmaController`  
Service: `TmaService`

### `modules/hh-employer`
HH.uz employer-side API (vacancies, negotiations, webhooks).  
Controller: `HhEmployerController`  
Service: delegates to `integrations/hh/`

### `modules/sourcing`
LinkedIn profile ingestion for staff.  
Controller: `SourcingController`  
Service: `SourcingService`

### `modules/llm-calls`
LLM call audit and cost reporting for staff.  
Controller: `LlmCallsController`  
Service: `LlmCallsService`

### `modules/events`
SSE event streams.  
Controller: `EventsController` (HR), `StaffEventsController` (staff)  
Service: `EventsService` (EventEmitter bridge → SSE)

### `modules/analytics`
Candidate analytics dashboard.  
Controller: `AnalyticsController`

### `modules/scheduling`
Google Calendar interview scheduling.  
Service: `SchedulingService` (called by `ApplicationsService`)

### `modules/consent`
GDPR consent record management.  
Controller: `ConsentController`  
Service: `ConsentService`

### `modules/waitlist`
Pre-launch waitlist.  
Controller: `WaitlistController`  
Service: `WaitlistService`

### `modules/feature-flags`
Feature toggles with per-company overrides.  
Controller: `FeatureFlagsController`  
Service: `FeatureFlagsService`

### `webhooks`
Unified webhook receiver. Routes to integration services.  
Controller: `WebhooksController`  
Handles: Telegram, HH.uz, Resend, Payme, payment, LinkedIn OAuth

---

## Common Infrastructure

### Guards

| Guard | File | Reads | Verifies | Attaches |
|-------|------|-------|---------|---------|
| `AuthGuard` | `guards/auth.guard.ts` | `hr_access_token` cookie | JWT with `JWT_ACCESS_SECRET` | `req.user: { userId, companyId, role }` |
| `StaffGuard` | `guards/staff.guard.ts` | `staff_session` cookie | Token hash in DB | `req.staff: { staffId, email }` |
| `CompanyRoleGuard` | `guards/company-role.guard.ts` | `req.user.role` | `role >= required` | — |
| `CandidateAuthGuard` | `candidate-auth/guards/` | `c_access_token` cookie | JWT with `JWT_CANDIDATE_SECRET` | `req.candidate: { candidateId }` |
| `TmaAuthGuard` | `tma/guards/` | `Authorization` header | JWT with `JWT_ACCESS_SECRET` | `req.tmaUser: { id, role }` |

### Interceptors (Global)

| Interceptor | Effect |
|-------------|--------|
| `AuditInterceptor` | Logs all POST/PATCH/PUT/DELETE to `AuditLog` |
| `BigIntInterceptor` | Serializes BigInt values to strings in JSON responses |
| `TenantInterceptor` | Injects `companyId` from JWT into request for all HR endpoints |

### Global Exception Filter

`GlobalExceptionFilter` catches all unhandled exceptions and returns:
```json
{
  "statusCode": 500,
  "message": "Internal server error",
  "error": "InternalServerError",
  "timestamp": "2026-06-18T..."
}
```

Logs all 5xx errors to Sentry. Validation errors (400) include field-level details.

### Zod Validation Pipe

All DTOs defined as Zod schemas. `ZodValidationPipe` applied globally:
```typescript
app.useGlobalPipes(new ZodValidationPipe())
```

Returns `400 Bad Request` with per-field error messages on schema violation.
