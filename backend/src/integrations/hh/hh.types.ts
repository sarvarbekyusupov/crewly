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
  first_name: string;
  last_name: string;
  middle_name?: string;
  age?: number;
  area?: { id: string; name: string };
  salary?: { amount: number; currency: string };
  total_experience?: { months: number };
  skill_set?: string[];
  updated_at: string;
}

export interface HhResumeDetail extends HhResumeSummary {
  contact?: Array<{ type: { id: string }; value: any; preferred?: boolean }>;
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

export interface HhVacancyStats {
  views: { value: number };
  responses: { value: number };
  invitations: { value: number };
  discard: { value: number };
}

export interface HhResumeUpdateBody {
  title?: string;
  skill_set?: string[];
  skills?: string;
  salary?: { amount: number; currency: string };
}
