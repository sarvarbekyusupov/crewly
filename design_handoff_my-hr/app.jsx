/* app.jsx — main app, routing, tweaks */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#C84A1F",
  "density": "comfortable",
  "theme": "warm",
  "showGrid": true
}/*EDITMODE-END*/;

const ACCENTS = [
  ['#C84A1F', 'Ember'],
  ['#2A5D8C', 'Indigo'],
  ['#2F6B3F', 'Sage'],
  ['#7A3F8C', 'Plum'],
];

const App = ({ fixedRole }) => {
  const [role, setRole] = React.useState(fixedRole || 'company');
  const [view, setView] = React.useState(role === 'company' ? 'dashboard' : 'feed');
  const [params, setParams] = React.useState({});
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply accent + theme to root
  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    // also derive soft (very low alpha)
    const c = tweaks.accent;
    document.documentElement.style.setProperty('--accent-soft', hexToSoft(c));
  }, [tweaks.accent]);

  // Reset view when role flips (only when not fixed)
  React.useEffect(() => {
    if (fixedRole) return;
    setView(role === 'company' ? 'dashboard' : 'feed');
    setParams({});
  }, [role, fixedRole]);

  const go = (newView, id) => {
    setView(newView);
    setParams(id ? { id } : {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const screenLabel = `${role}-${view}`;

  // Crumbs
  const crumbs = (() => {
    const root = role === 'company' ? 'Workspace' : 'Your search';
    const map = {
      dashboard: ['Dashboard'],
      jobs: ['Open roles'],
      job: ['Open roles', JOBS.find(j => j.id === params.id)?.title || 'Role'],
      candidate: ['Candidates', CANDIDATES.find(c => c.id === params.id)?.name || 'Candidate'],
      candidates: ['All candidates'],
      chat: ['Agent chat'],
      analytics: ['Analytics'],
      feed: ['For you'],
      saved: ['Saved roles'],
      inbox: ['Inbox'],
      profile: ['My profile'],
      cjob: ['For you', JOBS.find(j => j.id === params.id)?.title || 'Role'],
    };
    return [role === 'company' ? 'Acme Workspace' : 'You', ...(map[view] || [view])];
  })();

  return (
    <div className={`app ${tweaks.density === 'compact' ? 'compact' : ''} ${tweaks.theme === 'dark' ? 'dark' : ''}`} data-screen-label={screenLabel}>
      <Sidebar role={role} setRole={setRole} view={view} setView={setView} fixedRole={fixedRole} />
      <div className="main">
        <Topbar crumbs={crumbs} />
        {role === 'company' && view === 'dashboard' && <CompanyDashboard go={go} />}
        {role === 'company' && view === 'jobs' && <JobsList go={(v, id) => go(v === 'job' ? 'job' : v, id)} />}
        {role === 'company' && view === 'job' && <JobDetail jobId={params.id} go={go} />}
        {role === 'company' && view === 'candidates' && <AllCandidates go={go} />}
        {role === 'company' && view === 'candidate' && <CandidateProfile candidateId={params.id} go={go} />}
        {role === 'company' && view === 'chat' && <AgentChat role="company" go={go} />}
        {role === 'company' && view === 'analytics' && <Analytics />}

        {role === 'candidate' && view === 'feed' && <CandidateFeed go={go} />}
        {role === 'candidate' && view === 'cjob' && <CandidateJob jobId={params.id} go={go} />}
        {role === 'candidate' && view === 'saved' && <Saved go={go} />}
        {role === 'candidate' && view === 'inbox' && <Inbox go={go} />}
        {role === 'candidate' && view === 'profile' && <MyProfile />}
        {role === 'candidate' && view === 'chat' && <AgentChat role="candidate" go={go} />}
      </div>

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Brand">
          <TweakColor
            label="Accent"
            value={tweaks.accent}
            options={ACCENTS.map(([c]) => c)}
            onChange={v => setTweak('accent', v)}
          />
        </TweakSection>
        <TweakSection label="Layout">
          <TweakRadio
            label="Density"
            value={tweaks.density}
            options={[{ value: 'comfortable', label: 'Comfy' }, { value: 'compact', label: 'Compact' }]}
            onChange={v => setTweak('density', v)}
          />
          <TweakRadio
            label="Theme"
            value={tweaks.theme}
            options={[{ value: 'warm', label: 'Paper' }, { value: 'dark', label: 'Dark' }]}
            onChange={v => setTweak('theme', v)}
          />
        </TweakSection>
        <TweakSection label="Try the other portal">
          {fixedRole ? (
            <p style={{ fontSize: 11, color: 'var(--ink-subtle)', margin: '4px 0 8px', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
              You're in the <strong style={{ color: 'var(--ink)' }}>{role}</strong> portal.<br />
              <a href="my-hr.html" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>← back to my-hr home</a>
            </p>
          ) : (
            <TweakRadio
              label="Portal"
              value={role}
              options={[{ value: 'company', label: 'Company' }, { value: 'candidate', label: 'Candidate' }]}
              onChange={v => setRole(v)}
            />
          )}
        </TweakSection>
      </TweaksPanel>
    </div>
  );
};

/* All candidates list (company) */
const AllCandidates = ({ go }) => (
  <div className="page wide">
    <div className="page-head">
      <div>
        <div className="page-eyebrow">86 in motion · 12 added this week</div>
        <h1 className="page-title">All candidates</h1>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Btn variant="ghost" icon="filter">Filters</Btn>
        <Btn variant="soft" icon="upload">Export</Btn>
        <Btn variant="primary" icon="plus">Add candidate</Btn>
      </div>
    </div>

    <div className="card bare" style={{ overflow: 'hidden' }}>
      <div className="pipe-row head">
        <span></span>
        <span>Name</span>
        <span>For role</span>
        <span>Stage</span>
        <span>Notice</span>
        <span>Score · Salary</span>
        <span></span>
      </div>
      {CANDIDATES.map(c => {
        const job = JOBS.find(j => j.id === c.matchedJob);
        return (
          <div key={c.id} className="pipe-row" onClick={() => go('candidate', c.id)}>
            <Avatar name={c.name} tone={c.avatar} />
            <div className="col">
              <span className="name">{c.name}</span>
              <span className="sub">{c.headline}</span>
            </div>
            <div className="col" style={{ fontSize: 12.5, lineHeight: 1.3 }}>
              <span>{job?.title}</span>
              <span className="mono muted" style={{ fontSize: 10.5 }}>{COMPANIES.find(co => co.id === job?.company)?.name}</span>
            </div>
            <Tag tone={c.stage === 'interviewing' ? 'positive' : c.stage === 'shortlisted' ? 'accent' : ''} dot>{c.stage}</Tag>
            <span className="mono" style={{ fontSize: 11 }}>{c.notice}</span>
            <div className="row" style={{ gap: 10 }}>
              <ScoreRing value={c.score} />
              <div className="col" style={{ lineHeight: 1.15 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)' }}>{c.score}/100</span>
                <span className="mono" style={{ fontSize: 10.5 }}>{c.salary}</span>
              </div>
            </div>
            <Icon name="chev" size={14} />
          </div>
        );
      })}
    </div>
  </div>
);

// Helpers
function hexToSoft(hex) {
  if (!hex || !hex.startsWith('#')) return 'rgba(0,0,0,0.08)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // mix toward paper
  const mix = (c) => Math.round(c * 0.18 + 250 * 0.82);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

window.App = App;

const rootEl = document.getElementById('root');
const fixedRole = rootEl.getAttribute('data-role');
ReactDOM.createRoot(rootEl).render(<App fixedRole={fixedRole} />);
