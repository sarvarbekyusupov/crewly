/* company.jsx — company-side screens: dashboard, jobs, candidate profile */

/* ============ Topbar ============ */
const Topbar = ({ crumbs, onAction }) => (
  <div className="topbar">
    <div className="crumbs">
      {crumbs.map((c, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="sep">/</span>}
          <span className={i === crumbs.length - 1 ? 'here' : ''}>{c}</span>
        </React.Fragment>
      ))}
    </div>
    <div className="search">
      <Icon name="search" size={14} />
      <input placeholder="Ask the agent or search anything…" />
      <span className="kbd">⌘ K</span>
    </div>
    <div className="topbar-actions">
      <button className="icon-btn" title="Notifications"><Icon name="bell" size={16} /></button>
      <button className="icon-btn" title="Help"><Icon name="book" size={16} /></button>
      <Avatar name="You" tone="ink" />
    </div>
  </div>
);

/* ============ Company Dashboard ============ */
const CompanyDashboard = ({ go }) => {
  const sparkData = [4, 6, 5, 8, 7, 10, 9, 12, 11, 14, 13, 16];
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Tuesday · May 20</div>
          <h1 className="page-title">Good morning, Aziz.<br /><em>Three things need you today.</em></h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="ghost" icon="filter">All teams</Btn>
          <Btn variant="primary" icon="plus" onClick={() => go('jobs')}>New role</Btn>
        </div>
      </div>

      {/* KPI strip */}
      <div className="kpis" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="label">Active roles</div>
          <div className="val">12</div>
          <div className="delta">+ 2 this week</div>
          <div className="spark"><Sparkline data={[4, 5, 5, 6, 7, 8, 8, 9, 10, 11, 12, 12]} /></div>
        </div>
        <div className="kpi">
          <div className="label">In pipeline</div>
          <div className="val">86</div>
          <div className="delta">+ 24 this week</div>
          <div className="spark"><Sparkline data={[12, 14, 18, 22, 30, 38, 44, 52, 60, 70, 78, 86]} color="var(--ink)" /></div>
        </div>
        <div className="kpi">
          <div className="label">Time-to-hire</div>
          <div className="val"><em>21</em>d</div>
          <div className="delta">– 9d vs market</div>
          <div className="spark"><Sparkline data={[44, 42, 40, 38, 36, 34, 31, 28, 26, 24, 23, 21]} color="var(--positive)" /></div>
        </div>
        <div className="kpi">
          <div className="label">Agent outreach</div>
          <div className="val">38<span className="muted serif" style={{ fontSize: 22, letterSpacing: '-0.025em' }}>%</span></div>
          <div className="delta">reply rate</div>
          <div className="spark"><Sparkline data={sparkData} /></div>
        </div>
      </div>

      {/* Three columns: needs-you / agent activity / pinned roles */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 20 }}>
        <div className="col" style={{ gap: 20 }}>
          {/* Needs you */}
          <div className="card">
            <div className="spread" style={{ marginBottom: 16 }}>
              <div className="col">
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Needs your call</span>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 4 }}>3 candidates ready for a decision</h3>
              </div>
              <Btn variant="ghost" iconRight="arrow">Review all</Btn>
            </div>

            <div className="col" style={{ gap: 0 }}>
              {CANDIDATES.slice(0, 3).map(c => {
                const job = JOBS.find(j => j.id === c.matchedJob);
                return (
                  <div key={c.id} className="pipe-row" onClick={() => go('candidate', c.id)} style={{ gridTemplateColumns: '44px 1.6fr 1fr 110px 130px 24px', borderTop: '1px solid var(--line-soft)' }}>
                    <Avatar name={c.name} tone={c.avatar} />
                    <div className="col">
                      <span className="name">{c.name}</span>
                      <span className="sub">{c.headline}</span>
                    </div>
                    <div className="col" style={{ fontSize: 12 }}>
                      <span className="muted mono" style={{ fontSize: 10.5 }}>for</span>
                      <span style={{ fontSize: 12.5 }}>{job?.title}</span>
                    </div>
                    <Tag tone="accent" dot>{c.stage === 'shortlisted' ? 'Awaiting your call' : 'Interview ready'}</Tag>
                    <div className="row" style={{ gap: 8 }}>
                      <ScoreRing value={c.score} />
                      <div className="col" style={{ lineHeight: 1.1 }}>
                        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)' }}>AI score</span>
                        <span style={{ fontSize: 12 }}>{c.score}/100</span>
                      </div>
                    </div>
                    <Icon name="chev" size={16} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline at a glance */}
          <div className="card">
            <div className="spread" style={{ marginBottom: 14 }}>
              <div className="col">
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Pipeline</span>
                <h3 className="serif" style={{ fontSize: 22, marginTop: 4 }}>Senior Backend · Acme Robotics</h3>
              </div>
              <Btn variant="soft" iconRight="arrow" onClick={() => go('jobs')}>Open role</Btn>
            </div>
            <Pipeline jobId="j1" go={go} compact />
          </div>
        </div>

        {/* Agent stream */}
        <div className="card">
          <div className="spread" style={{ marginBottom: 14 }}>
            <div className="row" style={{ gap: 8 }}>
              <span className="live-dot" />
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Agent activity</span>
            </div>
            <Btn variant="ghost" onClick={() => go('chat')}>Open chat</Btn>
          </div>

          <div className="stream">
            {AGENT_FEED.map(item => (
              <div key={item.id} className={`stream-item ${item.accent ? 'accent' : ''}`}>
                <div className="ico-circle"><Icon name={item.icon} size={14} /></div>
                <div className="col" style={{ gap: 4 }}>
                  <div style={{ fontSize: 13 }}>
                    {item.text}<strong style={{ fontWeight: 500 }}>{item.strong}</strong>
                  </div>
                  {item.extra && <div className="muted" style={{ fontSize: 12 }}>{item.extra}</div>}
                </div>
                <div className="tstamp">{item.at}</div>
              </div>
            ))}
          </div>

          <div className="divider" style={{ marginTop: 18, paddingTop: 14 }}>
            <div className="row spread">
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>Next scheduled run</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>in 47 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ Jobs list ============ */
const JobsList = ({ go }) => {
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">12 open · 4 paused · 86 candidates in motion</div>
          <h1 className="page-title">Open roles</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="ghost" icon="filter">Filter</Btn>
          <Btn variant="primary" icon="plus">New role with AI</Btn>
        </div>
      </div>

      <div className="col" style={{ gap: 12 }}>
        {JOBS.map(j => {
          const co = COMPANIES.find(c => c.id === j.company);
          return (
            <div key={j.id} className="card" style={{ padding: 18, cursor: 'pointer' }} onClick={() => go('job', j.id)}>
              <div className="row" style={{ gap: 16, alignItems: 'center' }}>
                <Avatar name={co.logo} tone="sand" square size="lg" />
                <div className="col grow" style={{ gap: 4 }}>
                  <div className="row" style={{ gap: 10 }}>
                    <span className="serif" style={{ fontSize: 22, letterSpacing: '-0.025em' }}>{j.title}</span>
                    <Tag tone={j.stage === 'interviewing' ? 'positive' : j.stage === 'sourcing' ? 'accent' : ''} dot>{j.stage}</Tag>
                  </div>
                  <div className="row mono" style={{ fontSize: 11, color: 'var(--ink-muted)', gap: 10 }}>
                    <span>{co.name}</span><span className="divider-dot">·</span>
                    <span>{j.location}</span><span className="divider-dot">·</span>
                    <span>{j.salary}</span><span className="divider-dot">·</span>
                    <span>posted {j.posted}</span>
                  </div>
                </div>
                <div className="row" style={{ gap: 28, alignItems: 'center' }}>
                  <Stat label="Applicants" value={j.applicants} />
                  <Stat label="Shortlist" value={j.shortlisted} />
                  <Stat label="Interviews" value={j.interviews} accent />
                  <Icon name="chev" size={16} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Stat = ({ label, value, accent }) => (
  <div className="col" style={{ alignItems: 'flex-end', lineHeight: 1.1 }}>
    <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
    <span className="serif" style={{ fontSize: 22, color: accent ? 'var(--accent)' : 'var(--ink)', fontStyle: accent ? 'italic' : 'normal' }}>{value}</span>
  </div>
);

/* ============ Job detail + pipeline ============ */
const JobDetail = ({ jobId, go }) => {
  const job = JOBS.find(j => j.id === jobId);
  const co = COMPANIES.find(c => c.id === job.company);
  const [tab, setTab] = React.useState('pipeline');
  return (
    <div className="page wide" style={{ paddingRight: 40 }}>
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div className="col" style={{ gap: 8 }}>
          <button className="mono" onClick={() => go('jobs')} style={{ fontSize: 11, color: 'var(--ink-muted)', textAlign: 'left' }}>← Open roles</button>
          <div className="row" style={{ gap: 14 }}>
            <Avatar name={co.logo} tone="sand" square size="lg" />
            <div className="col">
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-subtle)', letterSpacing: '0.08em' }}>{co.name.toUpperCase()} · {co.industry.toUpperCase()}</span>
              <h1 className="page-title" style={{ fontSize: 36, marginTop: 4 }}>{job.title}</h1>
              <div className="row mono" style={{ fontSize: 11, color: 'var(--ink-muted)', gap: 10, marginTop: 6 }}>
                <span>{job.location}</span><span>·</span><span>{job.salary}</span><span>·</span><span>{job.type}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="soft" icon="link">Share link</Btn>
          <Btn variant="ghost" icon="sliders">Settings</Btn>
          <Btn variant="primary" icon="sparkles">Tell agent</Btn>
        </div>
      </div>

      {/* Tabs */}
      <div className="row" style={{ gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
        {[
          ['pipeline', 'Pipeline', 86],
          ['brief', 'Job brief', null],
          ['outreach', 'Agent outreach', 24],
          ['activity', 'Activity', null],
        ].map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '10px 14px',
              fontSize: 13,
              borderBottom: tab === id ? '2px solid var(--ink)' : '2px solid transparent',
              color: tab === id ? 'var(--ink)' : 'var(--ink-muted)',
              marginBottom: '-1px',
              fontWeight: tab === id ? 500 : 400,
            }}
          >
            {label}{count !== null && <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', marginLeft: 6 }}>{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && <Pipeline jobId={jobId} go={go} />}
      {tab === 'brief' && <JobBrief job={job} />}
      {tab === 'outreach' && <Outreach jobId={jobId} />}
      {tab === 'activity' && <JobActivity />}
    </div>
  );
};

const Pipeline = ({ jobId, go, compact }) => {
  const cands = CANDIDATES.filter(c => c.matchedJob === jobId);
  // Distribute extras across stages
  const byStage = {};
  STAGES.forEach(s => byStage[s.id] = []);
  cands.forEach(c => byStage[c.stage]?.push(c));
  // Add some fake counts
  const fakeCounts = { sourcing: 42, screening: 18, shortlisted: 9, interviewing: 3, offer: 1 };

  return (
    <div className="stages" style={compact ? { gridTemplateColumns: 'repeat(5, 1fr)' } : {}}>
      {STAGES.map(stage => (
        <div key={stage.id} className="stage">
          <div className="stage-head">
            <span className="stage-name">{stage.label}</span>
            <span className="stage-count">{fakeCounts[stage.id]}</span>
          </div>
          {byStage[stage.id].slice(0, compact ? 1 : 4).map(c => (
            <div key={c.id} className="cand-mini" onClick={() => go('candidate', c.id)}>
              <div className="row">
                <Avatar name={c.name} tone={c.avatar} />
                <div className="col grow" style={{ gap: 2, lineHeight: 1.2, minWidth: 0 }}>
                  <span className="name" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
                  <span className="meta" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.location}</span>
                </div>
              </div>
              <div className="row spread">
                <Tag tone="accent">{c.score}</Tag>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)' }}>{c.notice}</span>
              </div>
            </div>
          ))}
          {/* Phantom adds for sourcing */}
          {stage.id === 'sourcing' && !compact && (
            <div className="cand-mini" style={{ borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minHeight: 64, color: 'var(--ink-subtle)' }}>
              <div className="row" style={{ gap: 6, fontSize: 12 }}>
                <Icon name="sparkles" size={14} />
                <span>Agent sourcing 30 more…</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const JobBrief = ({ job }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
    <div className="card">
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>About the role</span>
      <p className="serif" style={{ fontSize: 24, marginTop: 8, lineHeight: 1.35, letterSpacing: '-0.02em' }}>{job.summary}</p>

      <div style={{ marginTop: 24 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Must-haves</span>
        <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {job.must.map((m, i) => (
            <li key={i} className="row" style={{ gap: 10, fontSize: 14 }}>
              <Icon name="check" size={14} stroke={2} />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </div>
      <div style={{ marginTop: 20 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Nice-to-haves</span>
        <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {job.nice.map((m, i) => (
            <li key={i} className="row" style={{ gap: 10, fontSize: 14, color: 'var(--ink-muted)' }}>
              <Icon name="plus" size={12} />
              <span>{m}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="col" style={{ gap: 14 }}>
      <div className="ai-summary">
        <p>
          The agent narrowed search to senior Go/Rust engineers in the Tashkent timezone with event-driven systems experience.
          It is currently scanning <b>23 sources</b> daily and tightening filters from your feedback on <b>Felix Brandt</b> and
          <b> Aigerim B</b>.
        </p>
        <div className="citations">
          <span>GitHub</span><span>LinkedIn</span><span>HN Who's Hiring</span><span>Polywork</span><span>Read.cv</span><span>+18</span>
        </div>
      </div>

      <div className="card">
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Hiring team</span>
        <div className="col" style={{ marginTop: 12, gap: 10 }}>
          {[
            ['Aziz Yusupov', 'CTO · Hiring manager'],
            ['Nilufar K.', 'Engineering lead · Interviewer'],
            ['You', 'Recruiter · my-hr'],
          ].map(([n, role]) => (
            <div key={n} className="row">
              <Avatar name={n} />
              <div className="col" style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: 13 }}>{n}</span>
                <span className="muted mono" style={{ fontSize: 10.5 }}>{role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Comp benchmark</span>
        <div className="col" style={{ marginTop: 12, gap: 6 }}>
          <div className="spread"><span style={{ fontSize: 13 }}>Your offer</span><span className="serif" style={{ fontSize: 18 }}>{job.salary}</span></div>
          <div className="bar"><i style={{ width: '68%' }} /></div>
          <div className="row spread mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>
            <span>Market p50: $128k</span><span>p90: $190k</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Outreach = ({ jobId }) => {
  const messages = [
    { to: 'Dilshod Karimov', co: 'Lyft → ?', state: 'replied · positive', when: '2h', preview: 'Hi Dilshod — your dispatch matcher writeup is exactly the kind of work Acme is rebuilding around. The role is Senior Backend, $140-180k, in Tashkent…' },
    { to: 'Priya Anand', co: 'Compound', state: 'opened', when: '6h', preview: 'Hi Priya — building twice as founding engineer takes a certain shape, and Acme\'s control plane needs that shape badly…' },
    { to: 'Aigerim Beksultan', co: 'Booking.com', state: 'sent', when: '1d', preview: 'Hi Aigerim — I know you are happy at Booking. I am only writing because the work Acme is doing on a 100-robot floor lines up with…' },
    { to: 'Marko Petrov', co: 'Toptal', state: 'declined · friendly', when: '2d', preview: 'Hi Marko — Thanks for the quick reply. Understood that timing is wrong. May I check in again in Q3?' },
  ];

  return (
    <div className="col" style={{ gap: 10 }}>
      <div className="card flat" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Icon name="sparkles" size={18} />
        <div className="col grow">
          <span style={{ fontSize: 13.5 }}>Agent drafted 6 new messages overnight. Review and approve in bulk?</span>
          <span className="muted mono" style={{ fontSize: 11 }}>Tone: warm, technical · Calibrated to your previous approvals (28).</span>
        </div>
        <Btn variant="ghost">Review draft</Btn>
        <Btn variant="primary">Send all</Btn>
      </div>
      {messages.map((m, i) => (
        <div key={i} className="card" style={{ padding: 16 }}>
          <div className="row spread" style={{ marginBottom: 8 }}>
            <div className="row">
              <Avatar name={m.to} />
              <div className="col" style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: 13.5, fontWeight: 500 }}>{m.to}</span>
                <span className="muted mono" style={{ fontSize: 10.5 }}>{m.co}</span>
              </div>
            </div>
            <div className="row" style={{ gap: 12 }}>
              <Tag tone={m.state.startsWith('replied') ? 'positive' : m.state.startsWith('declined') ? 'warn' : ''}>{m.state}</Tag>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-subtle)' }}>{m.when}</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.55 }}>{m.preview}</p>
        </div>
      ))}
    </div>
  );
};

const JobActivity = () => (
  <div className="card">
    <div className="stream">
      {AGENT_FEED.concat(AGENT_FEED).map((item, i) => (
        <div key={i} className={`stream-item ${item.accent ? 'accent' : ''}`}>
          <div className="ico-circle"><Icon name={item.icon} size={14} /></div>
          <div className="col" style={{ gap: 4 }}>
            <div style={{ fontSize: 13 }}>
              {item.text}<strong style={{ fontWeight: 500 }}>{item.strong}</strong>
            </div>
            {item.extra && <div className="muted" style={{ fontSize: 12 }}>{item.extra}</div>}
          </div>
          <div className="tstamp">{item.at}</div>
        </div>
      ))}
    </div>
  </div>
);

/* ============ Candidate profile (company view) ============ */
const CandidateProfile = ({ candidateId, go }) => {
  const c = CANDIDATES.find(x => x.id === candidateId) || CANDIDATES[0];
  const job = JOBS.find(j => j.id === c.matchedJob);
  const co = COMPANIES.find(co => co.id === job?.company);
  return (
    <div className="page wide">
      <button className="mono" onClick={() => go('jobs')} style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 18 }}>← Back to {job?.title}</button>

      <div className="profile-grid">
        {/* Side */}
        <div className="profile-side">
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
              <Avatar name={c.name} tone={c.avatar} size="xl" />
            </div>
            <h2 className="serif" style={{ fontSize: 26, letterSpacing: '-0.025em' }}>{c.name}</h2>
            <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>{c.headline}</p>
            <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 12, flexWrap: 'wrap' }}>
              {c.open && <Tag tone="positive" dot>Open to offers</Tag>}
              <Tag>{c.location}</Tag>
              <Tag>{c.notice}</Tag>
            </div>
            <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <Btn variant="primary" icon="msg">Message</Btn>
              <Btn variant="ghost" icon="calendar">Schedule</Btn>
            </div>
          </div>

          {/* Match breakdown */}
          <div className="card">
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Match score</span>
            <div className="row" style={{ gap: 14, marginTop: 12, alignItems: 'center' }}>
              <ScoreRing value={c.score} />
              <div className="col">
                <span className="serif" style={{ fontSize: 28 }}>{c.score}<span className="muted" style={{ fontSize: 14 }}>/100</span></span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>for {job?.title}</span>
              </div>
            </div>
            <div className="col" style={{ gap: 10, marginTop: 14 }}>
              {Object.entries(c.fit).map(([k, v]) => (
                <div key={k}>
                  <div className="row spread mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
                    <span>{k}</span><span>{v}</span>
                  </div>
                  <div className="bar"><i style={{ width: v + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* Pull data */}
          <div className="card">
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Source signals</span>
            <div className="col" style={{ marginTop: 12, gap: 8 }}>
              {[
                ['GitHub', '47 repos · 1.2k stars'],
                ['LinkedIn', '3 mutual connections'],
                ['Talk', 'KubeCon EU 2023'],
                ['Email', 'Reply within 3h'],
              ].map(([k, v]) => (
                <div key={k} className="row spread" style={{ fontSize: 12.5 }}>
                  <span className="row" style={{ gap: 8 }}><Icon name="link" size={12} /><span>{k}</span></span>
                  <span className="muted mono" style={{ fontSize: 10.5 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="col" style={{ gap: 20 }}>
          {/* AI summary */}
          <div className="ai-summary">
            <p>{c.summary}</p>
            <div className="citations">
              {c.citations.map(x => <span key={x}>{x}</span>)}
            </div>
          </div>

          {/* Skills */}
          <div className="card">
            <div className="spread">
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Skills · agent verified</span>
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>{c.skills.length} found</span>
            </div>
            <div className="row" style={{ marginTop: 12, gap: 6, flexWrap: 'wrap' }}>
              {c.skills.map(s => <Tag key={s} tone="">{s}</Tag>)}
            </div>
          </div>

          {/* Experience timeline */}
          <div className="card">
            <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Experience</span>
            <div className="timeline" style={{ marginTop: 16 }}>
              {c.experience.map((e, i) => (
                <div key={i} className="tl-item">
                  <span className="when">{e.when}</span>
                  <div>
                    <h4>{e.role}</h4>
                    <div className="where mono">{e.co} · {e.loc}</div>
                    <p>{e.note}</p>
                  </div>
                </div>
              ))}
              {c.experience.length === 0 && (
                <div className="muted" style={{ fontSize: 13 }}>Agent pulled summary only — request full résumé?</div>
              )}
            </div>
          </div>

          {/* Conversation thread preview */}
          <div className="card">
            <div className="spread">
              <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Conversation</span>
              <Btn variant="ghost" iconRight="arrow" onClick={() => go('chat')}>Open thread</Btn>
            </div>
            <div className="col" style={{ marginTop: 14, gap: 14 }}>
              <div className="msg agent">
                <Avatar name="my-hr Agent" tone="accent" />
                <div className="col" style={{ gap: 4, minWidth: 0 }}>
                  <div className="meta">Agent · 3d ago</div>
                  <div className="msg-bubble">Hi {c.name.split(' ')[0]} — your work on the dispatch matcher (the routing change in 2023) is exactly the kind of writing Acme is hiring around…</div>
                </div>
              </div>
              <div className="msg agent">
                <Avatar name={c.name} tone={c.avatar} />
                <div className="col" style={{ gap: 4, minWidth: 0 }}>
                  <div className="meta">{c.name.split(' ')[0]} · 2d ago</div>
                  <div className="msg-bubble">Happy to chat. Tashkent timezone works. What does the team look like today, and what would the first 90 days be?</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { Topbar, CompanyDashboard, JobsList, JobDetail, CandidateProfile, Pipeline });
