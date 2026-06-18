# LinkedIn Integration

Two modes: candidate OAuth (profile sync) + employer RapidAPI scraping (sourcing).

---

## Candidate OAuth

Candidates link LinkedIn to sync their work history and skills.

### Setup

```env
GOOGLE_CLIENT_ID=...       # reused for LinkedIn? No — separate:
LINKEDIN_RAPIDAPI_KEY=...
LINKEDIN_RAPIDAPI_HOST=...
```

### Flow

```
1. GET /candidate-portal/linkedin/oauth-url
   → Redirect URL to LinkedIn OAuth

2. Candidate authorizes on LinkedIn

3. LinkedIn redirects to /auth/linkedin/callback (frontend page)

4. Frontend extracts code + state from URL params

5. POST /webhooks/linkedin/exchange { code, state }
   → Exchange code for access_token
   → Update Candidate.linkedinOauthToken

6. POST /candidate-portal/linkedin/sync
   → Fetch LinkedIn profile: name, positions, education, skills
   → Merge into Candidate fields
   → Return updated profile
```

### Sync Behavior

`sync` merges LinkedIn data into Crewly profile:
- Adds positions not already in `parsedResume.experience`
- Merges skills (union, not replace)
- Sets `linkedinUrl` if not already set
- Does NOT overwrite manually entered data

---

## Employer Sourcing (RapidAPI)

Staff uses LinkedIn scraping to find candidates.

```env
LINKEDIN_RAPIDAPI_KEY=<key>
LINKEDIN_RAPIDAPI_HOST=<host>    # e.g. linkedin-api8.p.rapidapi.com
```

### API Call

```typescript
// GET /sourcing/linkedin?q=backend+engineer+tashkent
const results = await linkedinClient.searchPeople({
  keywords: 'backend engineer tashkent',
  locationId: 'uz',
  limit: 25,
})
```

### Ingestion

```
POST /sourcing/linkedin/ingest { profileUrl }
  → LinkedInClientService.getProfile(profileUrl)
  → SourcingAgent.parseCandidate(rawProfileText)
  → Create/update Candidate
  → Enqueue embed-candidate
```

### Rate Limits

RapidAPI plans vary. Default free plan: 500 req/month. Responses cached 24h.

---

## Services

| Service | Purpose |
|---------|---------|
| `LinkedInClientService` | Base HTTP client for RapidAPI |
| `LinkedInJobsAdapter` | Normalize LinkedIn job → `DiscoveredJob` schema |
| `LinkedInOAuthService` | Token exchange + storage |
| `LinkedInApplyService` | Auto-apply to LinkedIn jobs (for `auto-apply` worker) |

---

## LinkedIn Job Discovery

`DiscoverJobsProcessor` can also scrape LinkedIn jobs:

```
POST /staff/job-discovery-runs { source: 'linkedin', location: 'tashkent' }
  → LinkedInJobsAdapter.search('tashkent software', limit=50)
  → normalize each listing → upsert DiscoveredJob
```

LinkedIn job discovery used as supplement to HH.uz, not primary source.
