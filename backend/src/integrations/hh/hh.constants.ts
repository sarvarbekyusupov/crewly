export const HH_BASE_URL = 'https://api.hh.uz';
export const HH_AUTH_URL = 'https://hh.uz/oauth/authorize';
export const HH_UZBEKISTAN_AREA_ID = '97';

export const HH_EMPLOYER_STATE_MAP: Record<string, string> = {
  consideration: 'outreach_sent',
  invitation: 'screening_passed',
  interview: 'interviewed',
  offer: 'offer_made',
  hired: 'hired',
  discard: 'rejected',
};

export const HH_CANDIDATE_STATE_MAP: Record<string, string> = {
  phone_interview: 'phone_interview',
  interview: 'interview',
  offer: 'offer_made',
  hired: 'hired',
  discard: 'rejected',
};

export const HH_SEEKER_STATE_MAP: Record<string, string> = {
  response: 'applied',
  invitation: 'interview',
  discard: 'rejected',
  discard_after_interview: 'rejected',
  offer: 'offer',
};
