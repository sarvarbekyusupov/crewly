export interface LinkedInSearchResponse {
  success: boolean;
  message?: string;
  data: LinkedInProfile[];
  total_results?: number;
}

export interface LinkedInProfile {
  linkedin_url?: string;
  profile_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  headline?: string;
  location?: string;
  city?: string;
  country?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experiences?: LinkedInExperience[];
  educations?: LinkedInEducation[];
  summary?: string;
}

export interface LinkedInExperience {
  title?: string;
  company?: string;
  location?: string;
  starts_at?: { day?: number; month?: number; year?: number };
  ends_at?: { day?: number; month?: number; year?: number } | null;
  description?: string;
}

export interface LinkedInEducation {
  school?: string;
  degree_name?: string;
  field_of_study?: string;
  starts_at?: { year?: number };
  ends_at?: { year?: number };
}

export interface LinkedInSearchParams {
  keywords?: string;
  location?: string;
  page?: number;
}
