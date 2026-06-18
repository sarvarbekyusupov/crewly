# Database Schema

PostgreSQL 16 + pgvector. ORM: Prisma 5.  
Schema file: `backend/prisma/schema.prisma`

29 models grouped by domain.

---

## HR / Tenancy

### `Company`
Multi-tenant root. All HR data scoped by `companyId`.

```prisma
model Company {
  id                     String    @id @default(uuid())
  name                   String
  legalName              String?
  taxId                  String?
  website                String?
  industry               String?
  size                   String?
  contactEmail           String?
  status                 CompanyStatus   @default(active)
  pricingTier            PricingTier     @default(standard)
  defaultFeePercentage   Decimal   @default(10)
  paymentTermsDays       Int       @default(30)
  guaranteePeriodDays    Int       @default(90)
  createdAt              DateTime  @default(now())
  updatedAt              DateTime  @updatedAt

  users                  User[]
  jobs                   Job[]
  applications           Application[]
  placements             Placement[]
  invoices               Invoice[]
  llmCalls               LlmCall[]
}
```

### `User`
HR staff member. Has a role and optional Telegram link.

```prisma
model User {
  id                String     @id @default(uuid())
  companyId         String
  email             String     @unique
  passwordHash      String
  fullName          String
  role              UserRole   @default(viewer)
  phone             String?
  telegramUsername  String?
  telegramChatId    String?    @unique
  locale            String     @default("en")
  emailVerifiedAt   DateTime?
  createdAt         DateTime   @default(now())
  updatedAt         DateTime   @updatedAt

  company           Company    @relation(fields: [companyId], references: [id])
  sessions          Session[]
  authTokens        AuthToken[]
}
```

Roles: `owner | admin | hiring_manager | viewer`

### `Session`
Short-lived login session for HR users.

```prisma
model Session {
  id         String    @id @default(uuid())
  userId     String
  tokenHash  String    @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id])
}
```

### `AuthToken`
Email verification and password reset tokens.

```prisma
model AuthToken {
  id        String          @id @default(uuid())
  userId    String
  type      AuthTokenType   // email_verification | password_reset
  token     String          @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime        @default(now())
  user      User            @relation(fields: [userId], references: [id])
}
```

### `Staff` / `StaffSession`
Internal admin accounts. Session-based (no JWT).

---

## Jobs & Applications

### `Job`
Job posting.

```prisma
model Job {
  id                  String       @id @default(uuid())
  companyId           String
  createdById         String
  title               String
  description         String
  status              JobStatus    @default(draft)
  priority            Int          @default(0)
  employmentType      String?
  workMode            String?
  officeLocation      String?
  requiredSkills      String[]
  niceToHaveSkills    String[]
  salaryMinUzs        BigInt?
  salaryMaxUzs        BigInt?
  feePercentage       Decimal?
  feeBasis            String?
  parsedRequirements  Json?        // LLM-extracted structured requirements
  embedding           Unsupported("vector(1536)")?  // pgvector
  hhVacancyId         String?      // HH.uz vacancy ID
  targetCandidatesCount Int?
  deletedAt           DateTime?    // soft delete
  createdAt           DateTime     @default(now())
  updatedAt           DateTime     @updatedAt

  company             Company      @relation(...)
  createdBy           User         @relation(...)
  applications        Application[]
  campaigns           OutreachCampaign[]
  placements          Placement[]
  llmCalls            LlmCall[]
}
```

Statuses: `draft | active | paused | filled | cancelled`

### `Application`
Links Candidate to Job. Core of the hiring pipeline.

```prisma
model Application {
  id                    String      @id @default(uuid())
  jobId                 String
  candidateId           String
  companyId             String
  status                AppStatus   @default(matched)
  matchScore            Float?      // 0-100 composite
  vectorSimilarity      Float?      // cosine similarity from pgvector
  rerankScore           Float?      // LLM rerank score
  matchRecommendation   String?     // strong_match | maybe | pass
  matchReasons          Json?       // { strengths: [], gaps: [] }
  hiringManagerDecision String?
  hiringManagerNotes    String?
  rejectionReason       String?
  interviewScheduledAt  DateTime?
  googleMeetLink        String?
  dossierUrl            String?     // S3 URL of PDF dossier
  hhNegotiationId       String?     // HH.uz negotiation ID
  shadowAnalysis        Json?       // additional AI analysis
  createdAt             DateTime    @default(now())
  updatedAt             DateTime    @updatedAt

  job                   Job         @relation(...)
  candidate             Candidate   @relation(...)
  company               Company     @relation(...)
  conversations         Conversation[]
  screenings            Screening[]
  outreachAttempts      OutreachAttempt[]
  placement             Placement?
}
```

**AppStatus** (15 values):
```
matched → queued_outreach → outreach_sent → responded → screening →
screened_pass → screened_fail → delivered → interview_scheduled →
interviewed → offered → hired → rejected_by_client → withdrew → no_response
```

---

## Candidates

### `Candidate`
Job seeker profile. Global (not company-scoped).

```prisma
model Candidate {
  id                  String    @id @default(uuid())
  sourceId            String?   // FK → CandidateSource
  fullName            String?
  currentPosition     String?
  currentCompany      String?
  yearsExperience     Int?
  skills              String[]
  city                String?
  country             String?
  email               String?   @unique
  phone               String?
  telegramUserId      String?   @unique
  telegramChatId      String?   @unique
  linkedinUrl         String?
  githubUrl           String?
  resumeFileUrl       String?   // S3 URL
  parsedResume        Json?     // LLM-structured resume
  embedding           Unsupported("vector(1536)")?  // pgvector
  qualityScore        Float?    // 0-100
  willingToRelocate   Boolean   @default(false)
  preferredWorkMode   String?
  expectedSalaryUzs   BigInt?
  hhOauthToken        String?
  hhRefreshToken      String?
  hhTokenExpiresAt    DateTime?
  linkedinOauthToken  String?
  minMatchScore       Float?    // null = not subscribed to notifications
  doNotContact        Boolean   @default(false)
  consentSource       String?   // telegram_cv | telegram_setup | telegram_referral:<chatId>
  lastActiveAt        DateTime? // updated on every bot interaction
  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  source              CandidateSource?
  rawPayloads         CandidateRawPayload[]
  applications        Application[]
  conversations       Conversation[]
  consentRecords      ConsentRecord[]
  placements          Placement[]
  sessions            CandidateSession[]
  seekerJobMatches    SeekerJobMatch[]
  seekerApplications  SeekerApplication[]
}
```

### `CandidateSource`
Reference table: `hh.ru`, `linkedin`, `telegram`, `manual`, `google`.

### `CandidateRawPayload`
Raw JSON responses from HH.uz/LinkedIn, kept for reprocessing.

---

## Messaging & Screening

### `Conversation`
Chat thread between candidate and system.

```prisma
model Conversation {
  applicationId  String?
  candidateId    String
  channel        String   // telegram | web | email
  state          String?  // screening state machine
  language       String?  // uz | en | ru
  messages       Message[]
  screenings     Screening[]
}
```

### `Message`
Single message in a conversation.

```prisma
model Message {
  conversationId    String
  direction         String    // inbound | outbound
  sender            String    // candidate | ai | recruiter
  content           String
  channelMessageId  String?   // Telegram message_id for updates
  llmCallId         String?   // linked LlmCall if AI-generated
}
```

### `Screening`
AI screening interview session.

```prisma
model Screening {
  applicationId          String
  conversationId         String?
  status                 ScreeningStatus  @default(in_progress)
  questionsAsked         Int              @default(0)
  promptVersion          String?
  language               String?
  aiAssessment           Json?   // scores + recommendation + summary
  fullTranscript         Json?   // complete Q&A log
  telegramStatusMessageId String? // for updating live status message
}
```

ScreeningStatus: `in_progress | completed | abandoned | escalated | failed`

---

## Placements & Billing

### `Placement`
Created when HR hires a candidate.

```prisma
model Placement {
  applicationId         String    @unique
  jobId                 String
  candidateId           String
  companyId             String
  agreedSalaryUzs       BigInt?
  feePercentage         Decimal
  guaranteePeriodDays   Int
  candidateStillEmployed Boolean  @default(true)
  separationDate        DateTime?
  separationReason      String?
  invoices              Invoice[]
}
```

### `Invoice`
Fee invoice auto-generated on placement.

```prisma
model Invoice {
  id            String        @id @default(uuid())
  companyId     String
  placementId   String
  amountUzs     BigInt
  status        InvoiceStatus @default(issued)
  dueDate       DateTime?
  paidAt        DateTime?
  notes         String?
  transactions  PaymeTransaction[]
}
```

Statuses: `issued | paid | overdue | cancelled`

### `PaymeTransaction`
Individual Payme payment attempt.

```prisma
model PaymeTransaction {
  invoiceId           String
  paymeTransactionId  String   @unique
  amount              BigInt
  state               Int      // 1=created, 2=performed, -1/-2=cancelled
  createTime          DateTime?
  performTime         DateTime?
  cancelTime          DateTime?
  reason              Int?     // Payme cancellation reason code
}
```

---

## Seeker Pipeline

### `DiscoveredJob`
Job found from HH.uz or Telegram channels.

```prisma
model DiscoveredJob {
  id            String    @id @default(uuid())
  source        String    // hh.ru | telegram_channel | linkedin
  externalId    String?   // HH vacancy ID
  sourceUrl     String    @unique
  title         String
  company       String?
  description   String?
  skills        String[]
  salaryMinUzs  BigInt?
  salaryMaxUzs  BigInt?
  location      String?
  rawPayload    Json
  expiresAt     DateTime?
  createdAt     DateTime  @default(now())

  seekerJobMatches    SeekerJobMatch[]
  seekerApplications  SeekerApplication[]
}
```

### `SeekerJobMatch`
Scored match between candidate and discovered job.

```prisma
model SeekerJobMatch {
  id               String     @id @default(uuid())
  candidateId      String
  discoveredJobId  String
  score            Float      // 0-100
  explanation      String?
  strengths        String[]
  gaps             String[]
  scoredAt         DateTime   @default(now())

  @@unique([candidateId, discoveredJobId])
}
```

### `SeekerApplication`
Candidate-initiated application to a discovered job.

```prisma
model SeekerApplication {
  id               String    @id @default(uuid())
  candidateId      String
  discoveredJobId  String
  status           String    @default("pending")
  source           String    // telegram | web | tma
  coverLetter      String?
  hhNegotiationId  String?
  appliedAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
}
```

---

## Telegram State

### `TelegramPendingJob`
One row per chatId. Tracks current bot interaction state.

```prisma
model TelegramPendingJob {
  chatId  String  @id
  state   String  // onboard:waiting | ref:<chatId> | discovered:<jobId> | ...
}
```

### `TelegramChannel`
Registered channels for job post monitoring.

```prisma
model TelegramChannel {
  id           Int      @id @default(autoincrement())
  channelId    BigInt   @unique
  channelName  String
  isActive     Boolean  @default(true)
  addedAt      DateTime @default(now())
}
```

---

## System

### `LlmCall`
Every AI API call logged here.

```prisma
model LlmCall {
  id               String    @id @default(uuid())
  companyId        String?
  jobId            String?
  purpose          String    // parse_resume | score_jobs | generate_outreach | ...
  agentName        String?
  promptName       String?
  promptVersion    String?
  model            String    // claude-3-5-sonnet-20241022 | llama-3.3-70b | ...
  provider         String    // anthropic | groq | openai | bedrock
  promptTokens     Int
  completionTokens Int
  costUsd          Decimal
  latencyMs        Int
  error            String?
  createdAt        DateTime  @default(now())
}
```

### `AuditLog`
All system mutations.

```prisma
model AuditLog {
  id           String    @id @default(uuid())
  actorType    String    // user | candidate | staff | system
  actorId      String?
  action       String    // create | update | delete
  resourceType String    // Application | Job | Candidate | ...
  resourceId   String?
  metadata     Json?     // { before: {}, after: {} }
  ipAddress    String?
  createdAt    DateTime  @default(now())
}
```

### `IdempotencyKey`
Prevents duplicate webhook processing.

```prisma
model IdempotencyKey {
  key       String    @id   // e.g. "telegram:event123"
  response  Json?
  expiresAt DateTime
  createdAt DateTime  @default(now())
}
```

### `FeatureFlag`
Feature toggles with per-company overrides.

```prisma
model FeatureFlag {
  name              String   @id   // e.g. "ai_rewrite"
  enabled           Boolean  @default(false)
  rolloutPercentage Int      @default(0)
  companyOverrides  Json     @default("{}")  // { "companyId": true/false }
  updatedAt         DateTime @updatedAt
}
```

### `WaitlistEntry`
Pre-launch signups.

```prisma
model WaitlistEntry {
  id        String    @id @default(uuid())
  email     String    @unique
  role      String    // employer | candidate
  createdAt DateTime  @default(now())
}
```

---

## pgvector

Vector similarity search for candidate-job matching.

**Columns:**
- `Candidate.embedding` — `vector(1536)` — from parsedResume summary
- `Job.embedding` — `vector(1536)` — from parsedRequirements summary

**Index:**
```sql
CREATE INDEX candidate_embedding_idx ON candidates
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

**Query** (in MatchCandidatesProcessor):
```sql
SELECT id, 1 - (embedding <=> $1) AS similarity
FROM candidates
WHERE embedding IS NOT NULL
  AND do_not_contact = false
ORDER BY similarity DESC
LIMIT 50
```

`<=>` = cosine distance operator (pgvector).  
`1 - distance` = similarity (higher = more similar).

**Setup:**
```sql
-- Run once on fresh database:
CREATE EXTENSION IF NOT EXISTS vector;
```

Checked by `pnpm run db:check` before migrations.
