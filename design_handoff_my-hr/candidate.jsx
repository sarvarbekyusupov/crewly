/* candidate.jsx — candidate-side screens: feed, job detail, inbox */

const CandidateFeed = ({ go }) => {
  const jobs = JOBS;
  return (
    <div className="page">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Updated 4 min ago · 14 new this week</div>
          <h1 className="page-title">Roles tailored for <em>you, Dilshod.</em></h1>
          <p className="page-sub">
            Your agent scans 200+ companies daily. These are the 14 worth your time this week — ranked by how well your work, not your résumé, fits the role.
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="ghost" icon="sliders">Preferences</Btn>
          <Btn variant="primary" icon="refresh">Re-run match</Btn>
        </div>
      </div>

      {/* Preferences strip */}
      <div className="card flat" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14, marginBottom: 20 }}>
        <Icon name="target" size={16} />
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <Tag>Senior · Staff IC</Tag>
          <Tag>$140k–$220k</Tag>
          <Tag>Tashkent · Remote (CET ± 4h)</Tag>
          <Tag>Go · Rust · Infra</Tag>
          <Tag>≤ 200 people</Tag>
        </div>
        <Btn variant="ghost">Edit</Btn>
      </div>

      <div className="feed">
        {jobs.slice(0, 4).map((j, i) => {
          const co = COMPANIES.find(c => c.id === j.company);
          const match = [94, 91, 88, 84][i];
          return (
            <div key={j.id} className="job-card" onClick={() => go('cjob', j.id)}>
              <div className="top">
                <div className="company-row">
                  <Avatar name={co.logo} tone="sand" square size="lg" />
                  <div className="col" style={{ lineHeight: 1.2 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{co.name}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>{co.industry} · {co.size} people</span>
                  </div>
                </div>
                <div className="col" style={{ alignItems: 'flex-end', lineHeight: 1.1 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)' }}>MATCH</span>
                  <span className="serif" style={{ fontSize: 26, color: 'var(--accent)', fontStyle: 'italic' }}>{match}</span>
                </div>
              </div>

              <h3>{j.title}</h3>

              <div className="row" style={{ gap: 10, fontSize: 12, color: 'var(--ink-muted)' }}>
                <span className="row" style={{ gap: 4 }}><Icon name="map" size={12} />{j.location}</span>
                <span>·</span>
                <span className="row" style={{ gap: 4 }}><Icon name="dollar" size={12} />{j.salary}</span>
              </div>

              <div className="why">
                <b>Why this matches you:</b> {' '}
                {[
                  'Your dispatch matcher rewrite mirrors what Acme is rebuilding around their control plane. Same primitives (Go, gRPC, event-driven), bigger ownership.',
                  'Your Wise → Berlin trajectory and 7yr leadership tenure put you exactly at this team\'s missing layer.',
                  'Three of your ASR papers cite Whisper benchmarks — Orchard wants a researcher who can lead that direction in clinic.',
                  'You took Workato\'s EU pipeline to $8M in 24 months. Pinedrop wants the same playbook for climate enterprise.',
                ][i]}
              </div>

              <div className="foot">
                <div className="tags">
                  {j.tags.slice(0, 4).map(t => <Tag key={t}>{t}</Tag>)}
                </div>
                <Btn variant="ghost" iconRight="arrow">View role</Btn>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stretch / longer-term */}
      <div style={{ marginTop: 36, marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Watching — not active yet</span>
        <h2 className="serif" style={{ fontSize: 26, marginTop: 6 }}>Three companies your agent is keeping warm</h2>
      </div>
      <div className="col" style={{ gap: 10 }}>
        {COMPANIES.slice(0, 3).map((c, i) => (
          <div key={c.id} className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={c.logo} tone="sand" square size="lg" />
            <div className="col grow" style={{ gap: 2 }}>
              <span style={{ fontSize: 14.5, fontWeight: 500 }}>{c.name}</span>
              <span className="mono muted" style={{ fontSize: 11 }}>
                {['Likely to open a Staff Infra role in Q3 — signal from 3 recent hires.',
                  'Series C announced last week. Senior Design roles typically open 4–6 weeks after.',
                  'Posted a research engineer brief on internal Slack last month. Public role expected.'][i]}
              </span>
            </div>
            <Btn variant="soft" icon="bell">Notify me</Btn>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ============ Candidate job detail ============ */
const CandidateJob = ({ jobId, go }) => {
  const job = JOBS.find(j => j.id === jobId) || JOBS[0];
  const co = COMPANIES.find(c => c.id === job.company);

  return (
    <div className="page">
      <button className="mono" onClick={() => go('feed')} style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 18 }}>← For you</button>

      <GridHero style={{ padding: '40px 36px 36px', marginBottom: 28 }}>
        <div className="row" style={{ gap: 16, marginBottom: 22 }}>
          <Avatar name={co.logo} tone="sand" square size="lg" />
          <div className="col">
            <span className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)', letterSpacing: '0.08em' }}>{co.name.toUpperCase()} · {co.industry.toUpperCase()} · {co.city.toUpperCase()}</span>
            <h1 className="lead" style={{ fontSize: 52, marginTop: 6 }}>{job.title}</h1>
          </div>
        </div>

        <div className="row" style={{ gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
          <Tag dot tone="accent">94 match</Tag>
          <Tag><Icon name="map" size={11} /> {job.location}</Tag>
          <Tag><Icon name="dollar" size={11} /> {job.salary}</Tag>
          <Tag><Icon name="clock" size={11} /> {job.type}</Tag>
          <Tag><Icon name="calendar" size={11} /> posted {job.posted}</Tag>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Btn variant="primary" size="lg" icon="bolt">Apply with one click</Btn>
          <Btn variant="ghost" size="lg" icon="msg">Ask agent first</Btn>
          <Btn variant="ghost" size="lg" icon="bookmark">Save</Btn>
        </div>
      </GridHero>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 28 }}>
        <div className="col" style={{ gap: 24 }}>
          {/* Personalized why */}
          <div className="ai-summary">
            <p style={{ fontSize: 15 }}>
              Acme is rebuilding their robot control plane on the same primitives you used at Lyft — Go services, gRPC,
              event-driven. The hiring manager, Aziz Y., asked specifically for engineers who have written the boring,
              durable code that runs day 365. Your <b>2023 dispatch matcher rewrite</b> is the strongest single sample in
              their pipeline this month.
            </p>
            <div className="citations">
              <span>Pulled from your GitHub</span>
              <span>KubeCon talk</span>
              <span>Lyft eng blog</span>
              <span>2 mutuals at Acme</span>
            </div>
          </div>

          {/* About */}
          <div className="card">
            <h3 className="serif" style={{ fontSize: 22, marginBottom: 10 }}>About the role</h3>
            <p style={{ fontSize: 14.5, color: 'var(--ink)', lineHeight: 1.65 }}>{job.summary}</p>

            <div style={{ marginTop: 22 }}>
              <h4 className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-subtle)', marginBottom: 10 }}>What you would own</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'The dispatch + scheduling services for the robot fleet — currently 12 Go services on a single-tenant control plane.',
                  'The on-call rotation for the platform team (4 engineers).',
                  'Mentoring two mid-level engineers; opportunity to grow into a tech-lead role within 12 months.',
                  'Setting the next-quarter roadmap with the CTO.',
                ].map((it, i) => (
                  <li key={i} className="row" style={{ gap: 10, fontSize: 14, alignItems: 'flex-start' }}>
                    <Icon name="arrow" size={14} stroke={2} />
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ marginTop: 22 }}>
              <h4 className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-subtle)', marginBottom: 10 }}>What they're looking for</h4>
              <div className="col" style={{ gap: 6 }}>
                {job.must.map((m, i) => (
                  <div key={i} className="row" style={{ gap: 10, fontSize: 14 }}>
                    <Icon name="check" size={14} stroke={2} />
                    <span>{m}</span>
                    {i < 2 && <Tag tone="positive" style={{ marginLeft: 'auto' }}>You match</Tag>}
                  </div>
                ))}
                {job.nice.map((m, i) => (
                  <div key={i} className="row" style={{ gap: 10, fontSize: 14, color: 'var(--ink-muted)' }}>
                    <Icon name="plus" size={12} />
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Process */}
          <div className="card">
            <h3 className="serif" style={{ fontSize: 22, marginBottom: 14 }}>What the process looks like</h3>
            <div className="col" style={{ gap: 0 }}>
              {[
                ['1', '30-min intro with hiring manager', '— first week'],
                ['2', 'Take-home: 4 hours, paid (you keep the IP)', '— at your pace'],
                ['3', 'On-site or remote panel (3 conversations)', '— second week'],
                ['4', 'Reference + offer', '— third week'],
              ].map(([n, t, w], i) => (
                <div key={i} className="row" style={{ padding: '14px 0', borderTop: i ? '1px solid var(--line-soft)' : 0, gap: 14 }}>
                  <span className="serif" style={{ fontSize: 26, color: 'var(--accent)', fontStyle: 'italic', width: 28 }}>{n}</span>
                  <div className="col grow" style={{ lineHeight: 1.25 }}>
                    <span style={{ fontSize: 14 }}>{t}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>{w}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Side */}
        <div className="col" style={{ gap: 16, position: 'sticky', top: 76, alignSelf: 'start' }}>
          <div className="card">
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>About {co.name}</span>
            <p style={{ fontSize: 13, marginTop: 10, color: 'var(--ink)' }}>
              Robotics for warehouse floors. Series B last year, 120 people, profitable on a per-floor basis.
              CTO is Aziz Yusupov (ex-Boston Dynamics).
            </p>
            <div className="col" style={{ gap: 8, marginTop: 14 }}>
              {[['Funding', 'Series B · $54M'], ['Founded', '2019'], ['Team', '120 people'], ['Glassdoor', '4.6 ★']].map(([k, v]) => (
                <div key={k} className="row spread" style={{ fontSize: 12.5 }}>
                  <span className="muted">{k}</span><span className="mono">{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Your match breakdown</span>
            <div className="col" style={{ marginTop: 12, gap: 10 }}>
              {[['Skills overlap', 96], ['Seniority + scope', 95], ['Domain (infra)', 90], ['Location + comp', 92], ['Culture signal', 86]].map(([k, v]) => (
                <div key={k}>
                  <div className="row spread mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)' }}>
                    <span>{k}</span><span>{v}</span>
                  </div>
                  <div className="bar"><i style={{ width: v + '%' }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="card flat">
            <div className="row" style={{ gap: 8, marginBottom: 6 }}>
              <Icon name="sparkles" size={14} />
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-muted)', letterSpacing: '0.08em' }}>AGENT TIP</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--ink)' }}>
              I noticed your last reply pace is &lt; 4h. Acme replies faster than 80% of peers — apply today if you want to land
              in this week's panel cycle.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============ Inbox ============ */
const Inbox = ({ go }) => {
  const [open, setOpen] = React.useState(INBOX[0].id);
  const active = INBOX.find(i => i.id === open);
  return (
    <div className="page wide">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">2 unread · agent active</div>
          <h1 className="page-title">Inbox</h1>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'flex-start' }}>
        {/* List */}
        <div className="col" style={{ gap: 8 }}>
          {INBOX.map(m => (
            <div
              key={m.id}
              onClick={() => setOpen(m.id)}
              className="card"
              style={{
                padding: 14,
                cursor: 'pointer',
                borderColor: open === m.id ? 'var(--ink)' : 'var(--line)',
                background: open === m.id ? 'var(--bg-elevated)' : 'var(--paper)',
              }}
            >
              <div className="row spread" style={{ marginBottom: 6 }}>
                <div className="row" style={{ gap: 8 }}>
                  <Avatar name={m.name} tone={m.from === 'agency' ? 'accent' : 'ink'} />
                  <span style={{ fontSize: 13, fontWeight: m.unread ? 500 : 400 }}>{m.name}</span>
                </div>
                <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)' }}>{m.at}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: m.unread ? 500 : 400 }}>{m.subject}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{m.body}</div>
              {m.match && (
                <div className="row" style={{ gap: 6, marginTop: 8 }}>
                  <Tag tone="accent" dot>{m.match} match</Tag>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="card" style={{ padding: 28 }}>
          <div className="spread" style={{ marginBottom: 22 }}>
            <div className="row" style={{ gap: 12 }}>
              <Avatar name={active.name} tone={active.from === 'agency' ? 'accent' : 'ink'} size="lg" />
              <div className="col">
                <span className="serif" style={{ fontSize: 22 }}>{active.subject}</span>
                <span className="mono muted" style={{ fontSize: 11, marginTop: 4 }}>from {active.name} · {active.at}</span>
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <Btn variant="ghost" icon="bookmark" />
              <Btn variant="ghost" icon="x" />
            </div>
          </div>

          <p style={{ fontSize: 15, lineHeight: 1.7 }}>{active.body}</p>

          {active.jobId && (
            <div className="card flat" style={{ padding: 14, marginTop: 22 }}>
              <div className="row spread">
                <div className="col" style={{ gap: 2 }}>
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-subtle)' }}>ATTACHED ROLE</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Senior Backend Engineer · Ledger</span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}>Berlin · €140–170k · 92 match</span>
                </div>
                <Btn variant="ghost" iconRight="arrow" onClick={() => go('cjob', 'j1')}>Open role</Btn>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 8, marginTop: 24 }}>
            <Btn variant="primary" icon="check">Yes, intro me</Btn>
            <Btn variant="ghost" icon="calendar">Ask for later</Btn>
            <Btn variant="ghost" icon="x">Not interested</Btn>
            <div style={{ flex: 1 }} />
            <Btn variant="soft" icon="sparkles" onClick={() => go('chat')}>Reply with agent</Btn>
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CandidateFeed, CandidateJob, Inbox });
