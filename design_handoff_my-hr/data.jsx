/* data.jsx — mock data for my-hr */

const COMPANIES = [
  { id: 'acme', name: 'Acme Robotics', industry: 'Robotics', size: '120', city: 'Tashkent', logo: 'A' },
  { id: 'ledger', name: 'Ledger', industry: 'Fintech', size: '340', city: 'Berlin', logo: 'L' },
  { id: 'orchard', name: 'Orchard Health', industry: 'Healthtech', size: '60', city: 'Remote', logo: 'O' },
  { id: 'pinedrop', name: 'Pinedrop', industry: 'Climate', size: '24', city: 'Lisbon', logo: 'P' },
  { id: 'nimbus', name: 'Nimbus Studio', industry: 'Design', size: '12', city: 'Brooklyn', logo: 'N' },
];

const JOBS = [
  {
    id: 'j1', title: 'Senior Backend Engineer', company: 'acme',
    salary: '$140k–$180k', location: 'Tashkent · Hybrid', type: 'Full-time',
    posted: '4d', stage: 'sourcing', applicants: 87, shortlisted: 9, interviews: 3,
    tags: ['Go', 'Postgres', 'gRPC', 'K8s'],
    summary: 'Own the platform services that run our robot fleet. We deploy 40+ services on a single-tenant control plane. You will write the boring, durable code that keeps a 100-robot floor humming.',
    must: ['5+ yrs production Go or Rust', 'Designed event-driven systems at scale', 'Comfortable on-call'],
    nice: ['Robotics or industrial background', 'ROS exposure', 'Tashkent-region timezone'],
  },
  {
    id: 'j2', title: 'Lead Product Designer, Payments', company: 'ledger',
    salary: '€110k–€140k', location: 'Berlin · On-site', type: 'Full-time',
    posted: '2d', stage: 'screening', applicants: 154, shortlisted: 14, interviews: 5,
    tags: ['Product', 'Fintech', 'Systems', 'Mgmt'],
    summary: 'Lead end-to-end design for our SMB payment rails — onboarding, KYB, dispute flows. You will partner directly with the CPO and own a team of three.',
    must: ['7+ yrs product design, 2+ leading', 'Shipped a regulated/financial product', 'Strong systems thinking'],
    nice: ['EU regulatory familiarity', 'Built a design system 0→1'],
  },
  {
    id: 'j3', title: 'Clinical AI Researcher', company: 'orchard',
    salary: '$160k–$210k', location: 'Remote (US/EU)', type: 'Full-time',
    posted: '1w', stage: 'interviewing', applicants: 42, shortlisted: 6, interviews: 4,
    tags: ['ML', 'NLP', 'Healthcare'],
    summary: 'Build the models behind our ambient scribe — turning clinician–patient conversations into structured notes that pass HIPAA review.',
    must: ['PhD or equivalent in ML/NLP', 'Worked with healthcare or regulated data', 'Strong publication record'],
    nice: ['Speech / ASR background', 'Clinician collaborator network'],
  },
  {
    id: 'j4', title: 'Founding Growth Lead', company: 'pinedrop',
    salary: '€90k + 1–2%', location: 'Lisbon or Remote', type: 'Full-time',
    posted: '3d', stage: 'sourcing', applicants: 31, shortlisted: 5, interviews: 1,
    tags: ['Growth', 'B2B', 'Climate', 'Founding'],
    summary: 'Be employee #6 at a Series A climate startup. Run the playbook end-to-end: positioning, channels, pipeline, and a small team within 12 months.',
    must: ['Took a B2B product 0→$1M ARR', 'Loves writing', 'Comfortable being scrappy'],
    nice: ['Climate, energy, or supply-chain domain'],
  },
  {
    id: 'j5', title: 'Design Engineer', company: 'nimbus',
    salary: '$130k', location: 'Brooklyn or Remote', type: 'Contract → Full-time',
    posted: '6d', stage: 'sourcing', applicants: 64, shortlisted: 7, interviews: 2,
    tags: ['React', 'CSS', 'Motion', 'WebGL'],
    summary: 'Sit between design and engineering for our agency clients. Translate Figma into elegant, animated React the engineering team can extend.',
    must: ['Production React + TypeScript', 'Strong CSS / motion craft', 'Portfolio of polished work'],
    nice: ['WebGL/three.js', 'Worked at an agency'],
  },
];

const CANDIDATES = [
  {
    id: 'c1', name: 'Dilshod Karimov', avatar: 'sand',
    headline: 'Staff Engineer, ex-Lyft Maps',
    location: 'Tashkent', open: true,
    score: 94, fit: { skills: 96, experience: 95, signal: 90, retention: 92 },
    salary: '$160k', notice: '6 weeks', languages: ['en', 'ru', 'uz'],
    skills: ['Go', 'Rust', 'gRPC', 'K8s', 'Postgres', 'Kafka'],
    summary: '8 years building infra for high-throughput logistics platforms. Led the team that rewrote Lyft\'s dispatch routing in Go (handling 4M trips/day). Came home to Tashkent in 2024 and is looking for a builder-tier role with real ownership.',
    citations: ['LinkedIn', 'GitHub', 'Conf talk', 'Email reply'],
    experience: [
      { when: '2021 — 2024', role: 'Staff Engineer', co: 'Lyft', loc: 'San Francisco', note: 'Tech lead for dispatch routing. Rewrote core matcher in Go; cut p99 latency 4× and saved $11M/yr in compute.' },
      { when: '2018 — 2021', role: 'Senior Engineer', co: 'Doordash', loc: 'San Francisco', note: 'Built the merchant inventory sync platform. Sharded Postgres to 14B rows.' },
      { when: '2016 — 2018', role: 'Software Engineer', co: 'Yandex Maps', loc: 'Moscow', note: 'Routing team. Shipped pedestrian routing across 60 cities.' },
    ],
    matchedJob: 'j1',
    stage: 'shortlisted',
  },
  {
    id: 'c2', name: 'Maya Hartwell', avatar: 'accent',
    headline: 'Lead Designer, Wise → fintech advisor',
    location: 'Berlin', open: true,
    score: 91, fit: { skills: 92, experience: 95, signal: 88, retention: 86 },
    salary: '€135k', notice: '8 weeks', languages: ['en', 'de'],
    skills: ['Product Design', 'Design Systems', 'Payments', 'Research', 'Leadership'],
    summary: 'Led design for Wise\'s business product (€2.4B in 2023 volume). Now advising 3 EU fintechs. Wants to come back in-house to one team. Already passed our values screen with a 8/10.',
    citations: ['Read.cv', 'Folio site', 'Phone screen', 'Internal ref: G. Müller'],
    experience: [
      { when: '2024 — now', role: 'Design Advisor', co: 'Independent', loc: 'Berlin', note: 'Three retained engagements with Series B EU fintechs.' },
      { when: '2020 — 2024', role: 'Lead Designer, Business', co: 'Wise', loc: 'London/Berlin', note: 'Took the business product from 100k to 500k+ active accounts.' },
      { when: '2016 — 2020', role: 'Senior Product Designer', co: 'N26', loc: 'Berlin', note: 'Onboarding + KYC redesign.' },
    ],
    matchedJob: 'j2',
    stage: 'interviewing',
  },
  {
    id: 'c3', name: 'Jordan Lin', avatar: 'sage',
    headline: 'ML Researcher, ex-Hugging Face, Stanford PhD',
    location: 'Remote', open: true,
    score: 89, fit: { skills: 94, experience: 88, signal: 92, retention: 80 },
    salary: '$190k', notice: '4 weeks', languages: ['en', 'zh'],
    skills: ['Speech', 'NLP', 'PyTorch', 'Healthcare ML', 'Papers ×14'],
    summary: 'PhD on low-resource ASR. Now at Hugging Face working on Whisper variants. Open to clinical AI for the right team — but wants research independence.',
    citations: ['arXiv', 'Twitter/X', 'Outreach reply'],
    experience: [],
    matchedJob: 'j3',
    stage: 'interviewing',
  },
  {
    id: 'c4', name: 'Sara Volkov', avatar: 'sky',
    headline: 'Growth, Series A → C playbook',
    location: 'Lisbon', open: true,
    score: 87, fit: { skills: 88, experience: 92, signal: 84, retention: 84 },
    salary: '€95k + 2%', notice: '4 weeks', languages: ['en', 'pt', 'ru'],
    skills: ['B2B Growth', 'Content', 'Sales-led', 'Climate'],
    summary: 'Took Workato\'s EU pipeline from $0 to $8M in 2 years. Wants founding role. Climate is her thesis.',
    citations: ['LinkedIn', 'Blog', 'Recommend: M. Hartwell'],
    experience: [],
    matchedJob: 'j4',
    stage: 'shortlisted',
  },
  {
    id: 'c5', name: 'Tomás Reyes', avatar: 'plum',
    headline: 'Design Engineer, agency veteran',
    location: 'Brooklyn', open: true,
    score: 85, fit: { skills: 90, experience: 84, signal: 80, retention: 88 },
    salary: '$135k', notice: '2 weeks', languages: ['en', 'es'],
    skills: ['React', 'CSS', 'Framer Motion', 'three.js', 'TypeScript'],
    summary: 'Six years at Active Theory and Studio Lumio. Insane motion craft. Looking for a smaller team with creative remit.',
    citations: ['Portfolio', 'CodePen', 'Recommend: S. Yu'],
    experience: [],
    matchedJob: 'j5',
    stage: 'sourcing',
  },
  {
    id: 'c6', name: 'Aigerim Beksultan', avatar: 'sand',
    headline: 'Backend Engineer, ex-Booking.com',
    location: 'Almaty', open: false,
    score: 82, fit: { skills: 88, experience: 82, signal: 78, retention: 80 },
    salary: '$120k', notice: '12 weeks', languages: ['en', 'ru', 'kk'],
    skills: ['Java', 'Kafka', 'Postgres', 'Reliability'],
    summary: 'Strong fundamentals, currently happy in role. Worth a longer outreach cycle.',
    citations: ['LinkedIn', 'Stackoverflow'],
    experience: [],
    matchedJob: 'j1',
    stage: 'sourcing',
  },
  {
    id: 'c7', name: 'Felix Brandt', avatar: 'sage',
    headline: 'Senior Product Designer, Klarna',
    location: 'Stockholm', open: true,
    score: 79, fit: { skills: 84, experience: 78, signal: 76, retention: 78 },
    salary: '€115k', notice: '8 weeks', languages: ['en', 'sv', 'de'],
    skills: ['Product Design', 'Payments', 'Research'],
    summary: 'Solid IC. Not yet at lead level but learning fast. Possibly stretched by this role.',
    citations: ['Folio', 'LinkedIn'],
    experience: [],
    matchedJob: 'j2',
    stage: 'shortlisted',
  },
  {
    id: 'c8', name: 'Priya Anand', avatar: 'accent',
    headline: 'Founding Engineer, two exits',
    location: 'Remote (London)', open: true,
    score: 88, fit: { skills: 86, experience: 92, signal: 90, retention: 78 },
    salary: '$170k + equity', notice: '2 weeks', languages: ['en', 'hi'],
    skills: ['Full-stack', 'Go', 'Postgres', 'Founding'],
    summary: 'Founding eng twice (Lattice, Compound). Strong builder. Will only join if she likes the founders.',
    citations: ['LinkedIn', 'Email thread', 'Recommend: D. Karimov'],
    experience: [],
    matchedJob: 'j1',
    stage: 'sourcing',
  },
];

// Stages for kanban
const STAGES = [
  { id: 'sourcing', label: 'Sourcing' },
  { id: 'screening', label: 'Screening' },
  { id: 'shortlisted', label: 'Shortlist' },
  { id: 'interviewing', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
];

// Agent activity feed
const AGENT_FEED = [
  { id: 1, type: 'sourced', at: '12 min', accent: true, icon: 'sparkles', text: 'Found 12 new candidates matching ', strong: 'Senior Backend Engineer · Acme', extra: 'Top candidate: Dilshod K. (94)' },
  { id: 2, type: 'reply', at: '38 min', accent: false, icon: 'msg', text: 'Maya Hartwell replied to your outreach. ', strong: 'Wants a 30-min intro this week.' },
  { id: 3, type: 'scored', at: '1h', accent: false, icon: 'target', text: 'Re-scored 14 candidates after you marked ', strong: 'Felix Brandt as "too junior".', extra: 'Tightened the seniority filter by 1 band.' },
  { id: 4, type: 'sent', at: '2h', accent: false, icon: 'send', text: 'Sent 8 personalized outreach messages for ', strong: 'Lead Product Designer, Payments.' },
  { id: 5, type: 'note', at: '4h', accent: false, icon: 'pulse', text: 'Re-ran weekly market scan: ', strong: 'Go engineer comp in Tashkent +6% QoQ.' },
];

// Candidate inbox messages
const INBOX = [
  {
    id: 'i1', from: 'agency', name: 'My-HR Agent',
    subject: 'A lead role at Ledger that fits you',
    body: 'Hi Dilshod — Ledger (Berlin, Fintech) is hiring a Senior Backend Engineer for their payment rails team. The role matches 92% of your profile and offers €140-170k. The hiring manager is Anna B., ex-Stripe — happy to make an intro this week?',
    at: '2h ago', unread: true, jobId: 'j1', match: 92,
  },
  {
    id: 'i2', from: 'company', name: 'Anna Brandt · Ledger',
    subject: 'Re: Intro from My-HR',
    body: 'Loved the work on the dispatch matcher. Could we book 30 min next Tuesday or Wednesday afternoon CET?',
    at: '1d ago', unread: false,
  },
  {
    id: 'i3', from: 'agency', name: 'My-HR Agent',
    subject: 'Weekly market read · Backend engineers',
    body: 'Compensation for senior Go engineers in your region moved +6% QoQ. Three new roles match your filters. Want me to write you a tailored letter for any?',
    at: '3d ago', unread: false,
  },
];

Object.assign(window, { COMPANIES, JOBS, CANDIDATES, STAGES, AGENT_FEED, INBOX });
