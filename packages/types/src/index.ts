// Shared API contract types — source of truth for both frontend and backend.
// Dates are always ISO strings (JSON serialisation of Prisma Date/DateTime).
// BigInt fields (salaries, fees) are serialised as strings by the API.

export interface ApiError {
  code: string
  message: string
  details?: Array<{ field: string; message: string }>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page?: number
  limit?: number
  [key: string]: unknown
}

export interface Company {
  id: string
  name: string
  legalName?: string
  taxId?: string
  website?: string
  industry?: string
  size?: string
  contactEmail: string
  contactPhone?: string
  address?: string
  status: string
  pricingTier: string
  defaultFeePercentage: string
  paymentTermsDays: number
  guaranteePeriodDays: number
  createdAt: string
  updatedAt: string
  _count?: { users?: number; jobs?: number }
}

export interface User {
  id: string
  companyId: string
  email: string
  emailVerified: boolean
  fullName: string
  role: 'owner' | 'admin' | 'hiring_manager' | 'viewer'
  phone?: string
  telegramUsername?: string
  locale: string
  lastLoginAt?: string
  createdAt: string
  company?: Company
}

export type JobStatus = 'draft' | 'active' | 'paused' | 'filled' | 'cancelled'
export type JobPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Job {
  id: string
  companyId: string
  createdByUserId: string
  title: string
  description: string
  status: JobStatus
  priority?: JobPriority
  requiredSkills: string[]
  niceToHaveSkills: string[]
  minExperienceYears?: number
  maxExperienceYears?: number
  salaryMinUzs?: string
  salaryMaxUzs?: string
  salaryCurrency?: string
  employmentType?: string
  workMode?: string
  officeLocation?: string
  feePercentage: string
  feeBasis: string
  targetCandidatesCount: number
  openedAt?: string
  closedAt?: string
  createdAt: string
  updatedAt: string
  hhVacancyId?: string | null
  parsedRequirements?: {
    seniority?: string
    tech_stack?: string[]
    key_responsibilities?: string[]
    soft_skills?: string[]
  } | null
  sourcingStrategy?: {
    approach_summary?: string
    target_companies?: string[]
    niche_sources?: string[]
    [key: string]: unknown
  } | null
}

export interface Candidate {
  id: string
  fullName?: string
  currentPosition?: string
  currentCompany?: string
  yearsExperience?: string
  skills: string[]
  city?: string
  email?: string
  phone?: string
  telegramUsername?: string
  linkedinUrl?: string
  githubUrl?: string
  country?: string
  willingToRelocate?: boolean
  preferredWorkMode?: string
  expectedSalaryUzs?: string
  resumeFileUrl?: string
  socialProof?: {
    github_url?: string
    linkedin_url?: string
    portfolio_url?: string
    tech_talks?: Array<{ title: string; url: string }>
    social_proof_summary?: string
  }
  consentStatus?: string
  doNotContact?: boolean
  applicationId?: string
  status?: string
  matchScore?: string | number | null
  sourceId?: string | null
  lastActiveAt?: string | null
}

export type AppStatus =
  | 'matched'
  | 'queued_outreach'
  | 'outreach_sent'
  | 'responded'
  | 'screening'
  | 'screened_pass'
  | 'screened_fail'
  | 'delivered'
  | 'interview_scheduled'
  | 'interviewed'
  | 'offered'
  | 'hired'
  | 'rejected_by_client'
  | 'withdrew'
  | 'no_response'

export interface Application {
  id: string
  jobId: string
  candidateId: string
  companyId: string
  matchScore?: string
  vectorSimilarity?: string
  rerankScore?: string
  matchRecommendation?: string
  matchReasons?: {
    strengths?: string[]
    gaps?: string[]
    notes?: string
  }
  status: AppStatus | string
  hiringManagerDecision?: string
  hiringManagerNotes?: string
  rejectionReason?: string
  matchedAt?: string
  outreachSentAt?: string
  respondedAt?: string
  screenedAt?: string
  deliveredAt?: string
  interviewedAt?: string
  hiredAt?: string
  rejectedAt?: string
  createdAt: string
  updatedAt: string
  candidate?: Candidate
  job?: { id: string; title: string; requiredSkills?: string[] }
  screenings?: Screening[]
  googleMeetLink?: string
  shadowAnalysis?: {
    overall_score?: number
    score?: number
    sentiment?: string
    summary?: string
    confirmations?: string[]
    discrepancies?: string[]
    red_flags?: string[]
    recruiter_advice?: string
    dimensions?: {
      technical_depth?: number
      communication?: number
      cultural_fit?: number
      experience_relevance?: number
      enthusiasm?: number
    }
  } | null
}

export type OutreachAttemptStatus = 'sent' | 'opened' | 'replied' | 'failed' | 'rejected'

export interface OutreachAttempt {
  id: string
  applicationId: string
  channel: string
  attemptNumber: number
  status: OutreachAttemptStatus | string
  resendEmailId?: string
  errorCode?: string
  errorMessage?: string
  sentAt: string
  openedAt?: string
  repliedAt?: string
  jobId?: string
  jobTitle?: string
}

export type ScreeningStatus = 'in_progress' | 'completed' | 'abandoned' | 'escalated' | 'failed'

export interface Screening {
  id: string
  applicationId: string
  conversationId?: string
  promptVersion: string
  language: string
  status: ScreeningStatus
  questionsAsked: number
  aiAssessment?: {
    technical_score?: number
    experience_depth_score?: number
    communication_score?: number
    availability_score?: number
    salary_fit_score?: number
    overall_score?: number
    strengths?: string[]
    concerns?: string[]
    recommendation?: 'advance' | 'reject' | 'maybe'
    summary?: string
    dossierUrl?: string
  }
  startedAt: string
  completedAt?: string
  escalatedAt?: string
  escalationReason?: string
  conversation?: Conversation
}

export interface Conversation {
  id: string
  applicationId: string
  candidateId: string
  channel: string
  channelThreadId?: string
  state: string
  language: string
  startedAt: string
  lastMessageAt?: string
  completedAt?: string
  createdAt: string
  messages?: Message[]
  candidate?: { id: string; fullName?: string }
}

export interface Message {
  id: string
  conversationId: string
  direction: 'inbound' | 'outbound'
  sender: string
  content: string
  createdAt: string
}

export interface Placement {
  id: string
  applicationId: string
  jobId: string
  candidateId: string
  companyId: string
  agreedSalaryUzs: string
  feePercentage: string
  feeBasis: string
  totalFeeUzs: string
  startDate: string
  guaranteePeriodDays: number
  guaranteeExpiresAt?: string
  candidateStillEmployed: boolean
  separationDate?: string
  replacementRequired: boolean
  createdAt: string
  updatedAt: string
  candidate?: { id: string; fullName?: string }
  job?: { id: string; title: string }
  invoices?: Invoice[]
}

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  invoiceNumber: string
  companyId: string
  placementId?: string
  amountUzs: string
  vatUzs: string
  totalUzs: string
  currency: string
  issuedDate: string
  dueDate: string
  status: InvoiceStatus
  paidAt?: string
  paymentReference?: string
  pdfUrl?: string
  notes?: string
  createdAt: string
  updatedAt: string
  placement?: {
    id: string
    startDate?: string
    guaranteeExpiresAt?: string
    candidate?: { id: string; fullName?: string; currentPosition?: string }
    job?: { id: string; title: string }
  }
  company?: { id: string; name: string }
}

export interface DiscoveredJob {
  id: string
  source: string
  sourceUrl: string
  externalId?: string
  title: string
  company: string
  location?: string
  skills: string[]
  salaryMinUzs?: string
  salaryMaxUzs?: string
  employmentType?: string
  workMode?: string
  description?: string | null
  postedAt?: string
  discoveredAt: string
  // Scoring fields (present when returned from /discovered-jobs)
  aiScore?: number | null
  skillMatch?: number | null
  displayScore?: number | null
  matchExplanation?: string | null
  matchStrengths?: string[]
  matchGaps?: string[]
  application?: { id: string; status: string } | null
}

export type SeekerApplicationStatus = 'queued' | 'applied' | 'viewed' | 'interview' | 'rejected' | 'offer' | 'failed'

export interface SeekerApplication {
  id: string
  candidateId: string
  discoveredJobId: string
  status: SeekerApplicationStatus | string
  source: string
  coverLetter?: string
  hhNegotiationId?: string
  error?: string
  appliedAt?: string
  createdAt: string
  updatedAt: string
  discoveredJob?: {
    id: string
    title: string
    company: string
    location?: string
    sourceUrl: string
    workMode?: string
    employmentType?: string
  }
}

export interface CandidatePreferences {
  minMatchScore?: number | null
  blacklistedCompanies: string[]
  maxApplicationsPerDay: number
  preferredWorkMode?: string | null
  expectedSalaryUzs?: string | null
  hhResumeId?: string | null
  hhOauthTokenSet: boolean
  linkedinOauthTokenSet: boolean
  resumeFileUrl?: string | null
}

export interface HhResumeViewItem {
  resume: { id: string; title?: string }
  employer: { id: string; name: string }
  viewed_at: string
}

export interface LlmCall {
  id: string
  purpose: string
  promptName: string
  promptVersion: string
  model: string
  provider: string
  companyId?: string
  jobId?: string
  relatedEntityType?: string
  relatedEntityId?: string
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  costUsd?: string
  latencyMs?: number
  finishReason?: string
  error?: string
  createdAt: string
}

export interface LlmCallSummaryRow {
  purpose?: string
  model?: string
  _count: number
  _sum?: { costUsd?: string }
}

export interface LlmCallSummary {
  totalCostUsd: string
  byPurpose: LlmCallSummaryRow[]
  byModel: LlmCallSummaryRow[]
}

export interface IngestionRun {
  id: string
  sourceId: string
  trigger: string
  status: string
  candidatesFetched: number
  candidatesNew: number
  candidatesUpdated: number
  candidatesFailed: number
  error?: string
  startedAt: string
  completedAt?: string
  source?: { name: string }
}

export interface StaffDashboard {
  totalCompanies: number;
  totalCandidates: number;
  activeJobs: number;
  activeApplications: number;
  llmCostTodayUsd: string;
}

export interface AgentStats {
  agent: string;
  count: number;
  totalCost: number;
}

export interface AgentRecentCall {
  id: string;
  agent: string;
  purpose: string;
  cost: number;
  at: string;
  entityType?: string;
  entityId?: string;
}

export interface AgentActivityResponse {
  stats: AgentStats[];
  recent: AgentRecentCall[];
}

export interface LinkedInExperience {
  company?: string;
  title?: string;
  location?: string;
  date_range?: string;
  duration?: string;
  description?: string;
}

export interface LinkedInEducation {
  school?: string;
  degree?: string;
  field_of_study?: string;
  date_range?: string;
}

export interface LinkedInProfile {
  linkedin_url?: string;
  profile_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  headline?: string;
  location?: string;
  summary?: string;
  profile_pic_url?: string;
  email?: string;
  phone_numbers?: string[];
  experiences?: LinkedInExperience[];
  educations?: LinkedInEducation[];
}

export interface LinkedInSearchResponse {
  data: LinkedInProfile[];
}

export interface AuditLog {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  companyId: string | null;
  metadata: any | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface PaginatedAuditLogs {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export interface StaffUser {
  id: string
  email: string
  role: string
}

export interface ConsentRecord {
  id: string;
  candidateId: string;
  action: string;
  basis: string;
  scope: any | null;
  evidenceUrl: string | null;
  ipAddress: string | null;
  recordedAt: string;
  candidate?: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
}

export interface PaginatedConsentRecords {
  data: ConsentRecord[];
  total: number;
  page: number;
  limit: number;
}
