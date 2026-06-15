export interface HhResumeListResponse {
  items: HhResumeSummary[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
}

export interface HhResumeSummary {
  id: string;
  title: string;
  url: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  age?: number;
  area?: { id: string; name: string };
  salary?: { amount: number; currency: string };
  total_experience?: { months: number };
  skill_set?: string[];
  updated_at: string;
}

export interface HhContactPhone {
  formatted?: string;
  country?: string;
  city?: string;
  number?: string;
}

export interface HhResumeDetail extends HhResumeSummary {
  can_publish_or_update?: boolean;
  contact?: Array<{
    type: { id: string };
    value: string | HhContactPhone;
    preferred?: boolean;
  }>;
  experience?: Array<{
    company: string;
    position: string;
    start: string;
    end?: string;
    description?: string;
  }>;
  education?: {
    primary?: Array<{
      name: string;
      organization?: string;
      result?: string;
      year?: number;
    }>;
  };
  language?: Array<{
    id: string;
    name: string;
    level: { id: string; name: string };
  }>;
  skills?: string;
}

export interface HhVacancyDetail {
  id: string;
  name: string;
  description: string;
  key_skills: { name: string }[];
  alternate_url: string;
  published_at: string;
  type: { id: string; name: string };
  response_letter_required: boolean;
  employer: { id: string; name: string; logo_urls?: { original?: string } };
  area?: { id: string; name: string };
  salary?: { from?: number; to?: number; currency?: string; gross?: boolean };
  employment?: { id: string; name: string };
  schedule?: { id: string; name: string };
  experience?: { id: string; name: string };
}

export interface HhSearchParams {
  text?: string;
  area?: string;
  specialization?: string;
  experience?: 'noExperience' | 'between1And3' | 'between3And6' | 'moreThan6';
  salary?: number;
  currency?: string;
  order_by?: 'relevance' | 'publication_time' | 'salary_asc' | 'salary_desc';
  page?: number;
  per_page?: number;
}

export interface HhArea {
  id: string;
  name: string;
  areas?: HhArea[];
}

export interface HhMeResponse {
  id: string;
  auth_type: 'applicant' | 'employer' | 'application';
  is_employer: boolean;
  is_applicant: boolean;
  email?: string;
  first_name?: string;
  last_name?: string;
  employer?: { id: string; name: string };
}

export interface HhResumeViewItem {
  resume: { id: string; title?: string };
  employer: { id: string; name: string };
  viewed_at: string;
}

/** Resume summary of a job seeker who viewed a vacancy (GET /vacancies/{id}/visitors). */
export interface HhVacancyVisitorItem {
  id: string;
  title?: string;
  url: string;
  first_name?: string;
  last_name?: string;
  area?: { id: string; name: string };
  salary?: { amount: number; currency: string };
  total_experience?: { months: number };
  skill_set?: string[];
  updated_at?: string;
}

export interface HhDictionaries {
  employment: Array<{ id: string; name: string }>;
  schedule: Array<{ id: string; name: string }>;
  experience: Array<{ id: string; name: string }>;
  [key: string]: unknown;
}

export interface HhVacancyItem {
  id: string;
  name: string;
  alternate_url: string;
  employer: { name: string; alternate_url?: string };
  area?: { name: string };
  salary?: { from?: number; to?: number; currency?: string };
  snippet?: { requirement?: string; responsibility?: string };
  key_skills?: { name: string }[];
  experience?: { name: string };
  employment?: { name: string };
  schedule?: { name: string };
  published_at?: string;
}

export interface HhVacancyListResponse {
  items: HhVacancyItem[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
}

export interface HhApplicantNegotiation {
  id: string;
  state: { id: string; name: string };
  vacancy: {
    id: string;
    name: string;
    alternate_url: string;
    employer: { name: string };
    area?: { id: string; name: string };
  };
  created_at: string;
  updated_at: string;
}

export interface HhResumeStatus {
  id: string; // 'published' | 'hidden' | 'blocked'
  name: string;
}

export interface HhNegotiationsResponse {
  items: HhApplicantNegotiation[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
}

export interface HhNegotiationMessage {
  id: string;
  author: { participant_type: 'applicant' | 'employer'; name: string };
  text: string;
  created_at: string;
}

export interface HhNegotiationMessagesResponse {
  items: HhNegotiationMessage[];
  found: number;
}

export interface HhVacancyStatItem {
  date: string;
  views: number | null;
  responses: number | null;
}

export interface HhVacancyStats {
  items: HhVacancyStatItem[];
}

export interface HhResumeUpdateBody {
  title?: string;
  skill_set?: string[];
  skills?: string;
  salary?: { amount: number; currency: string };
}

// ── Chat API ──────────────────────────────────────────────────────────────────

export interface HhChatMessage {
  id: string;
  text?: string;
  created_at: string;
  author: { participant_type: 'applicant' | 'employer'; name: string };
}

export interface HhChatParticipant {
  id: string;
  participant_type: 'applicant' | 'employer';
  name: string;
}

export interface HhChat {
  id: string;
  vacancy?: { id: string; name: string };
  resume?: { id: string; title: string };
  negotiation?: { id: string };
  last_message?: HhChatMessage;
  unread_count: number;
}

export interface HhChatsResponse {
  items: HhChat[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
}

export interface HhChatMessagesResponse {
  items: HhChatMessage[];
  limit: number;
}

// ── Applicant comments ────────────────────────────────────────────────────────

export interface HhApplicantComment {
  id: string;
  text: string;
  author: { id: string; name: string };
  created_at: string;
  access_type: { id: string; name: string };
  is_mine: boolean;
}

export interface HhApplicantCommentsResponse {
  items: HhApplicantComment[];
  found: number;
  pages: number;
  page: number;
  per_page: number;
}

// ── Vacancy prolongation & hidden list ────────────────────────────────────────

export interface HhProlongationInfo {
  id: string;
  expires_at: string;
  actions: Array<{ id: string }>;
}

export interface HhHiddenVacancy {
  id: string;
  name: string;
  alternate_url: string;
  area?: { name: string };
  archived_at?: string;
}

// ── Mail templates ────────────────────────────────────────────────────────────

export interface HhMailTemplate {
  id: string;
  text: string;
  name?: string;
}

// ── Negotiation history ───────────────────────────────────────────────────────

export interface HhNegotiationHistoryVacancy {
  id: string;
  name: string;
  items: Array<{
    employer_state: { id: string; name: string };
    created_at: string;
  }>;
}

// ── Salary statistics ─────────────────────────────────────────────────────────

export interface HhSalaryMarket {
  percentile25: number;
  median: number;
  percentile75: number;
  currency: string;
}

export interface HhSalaryEstimate {
  market_salary: {
    gross: HhSalaryMarket;
    net: HhSalaryMarket;
  };
  resulting_parameters: {
    area?: { id: string; name: string };
    professional_area?: { id: string; name: string };
    specialisation?: { id: string; name: string };
    employee_level?: { id: string; name: string };
  };
}
