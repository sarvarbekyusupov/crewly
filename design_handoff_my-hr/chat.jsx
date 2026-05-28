/* chat.jsx — shared AI agent chat + analytics + saved + profile */

const AgentChat = ({ role, go }) => {
  const seed = role === 'company'
    ? [
        { who: 'agent', name: 'Agent', body: 'Morning. Three things: 1) Dilshod K. replied positively — wants a 30 min intro Tue/Wed. 2) I drafted 6 outreach messages for the Lead Designer role. 3) Felix Brandt was too junior — I tightened the seniority filter one band.', at: '08:14' },
        { who: 'me', name: 'You', body: 'Book the Dilshod intro for Wednesday 4pm Tashkent. And send the 6 drafts — just check them first.', at: '08:16' },
        { who: 'agent', name: 'Agent', body: 'Booked: Wed May 22, 16:00 Tashkent / 13:00 Berlin. Sending. Two of the six I rewrote — one mentioned a stale role title, one was a duplicate from last month. Want to see?', at: '08:16', actions: ['Show the two edits', 'Just send all six'] },
        { who: 'me', name: 'You', body: 'Show the two edits', at: '08:17' },
        { who: 'agent', name: 'Agent', body: 'Here are the changes side-by-side. The first is the role title fix for Maya. The second swaps a stale sentence about "the New York opening" — we closed that last month.', at: '08:17', diff: true },
      ]
    : [
        { who: 'agent', name: 'Agent', body: 'Good morning Dilshod. Two updates: Ledger replied — Anna wants a 30 min intro Tue or Wed. And I found 2 new roles in Berlin that match you above 88. Want to see?', at: '09:02', actions: ['Show me Ledger', 'Show the 2 new roles'] },
        { who: 'me', name: 'You', body: 'Show me Ledger first.', at: '09:03' },
        { who: 'agent', name: 'Agent', body: 'Ledger is a 340-person fintech, Series C, building SMB payment rails. The role is Senior Backend (Go), €140-170k. Anna Brandt is the hiring manager — ex-Stripe. Match: 92.', at: '09:03', card: { kind: 'job' } },
        { who: 'me', name: 'You', body: 'I\'m interested. Book the intro for Wednesday afternoon CET. And tell her I\'m looking for builder roles, not management.', at: '09:05' },
        { who: 'agent', name: 'Agent', body: 'Done. Booking request sent for Wednesday 15:00 CET. I added one line to your reply: "Looking for IC builder roles right now — happy to mentor but not manage." Want me to use this framing in future outreach?', at: '09:05', actions: ['Yes, use this framing', 'Just this once'] },
      ];

  const [thread, setThread] = React.useState(seed);
  const [draft, setDraft] = React.useState('');
  const bodyRef = React.useRef(null);

  const send = (text) => {
    if (!text.trim()) return;
    const t = [...thread, { who: 'me', name: 'You', body: text, at: 'now' }];
    setThread(t);
    setDraft('');
    setTimeout(() => {
      setThread(p => [...p, { who: 'agent', name: 'Agent', body: 'On it. I\'ll come back with options in a moment.', at: 'now', typing: true }]);
    }, 600);
  };

  React.useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [thread]);

  const suggestions = role === 'company'
    ? ['Find me 5 more like Dilshod', 'Pause sourcing on the Design role', 'Draft a reply to Maya', 'What\'s the comp benchmark for Tashkent Go?']
    : ['What companies are watching me?', 'Decline the Pinedrop intro politely', 'Rewrite my profile bio', 'Find me one warm intro at Ledger'];

  return (
    <div className="page" style={{ maxWidth: 980 }}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Agent · v0.8 · context up to date</div>
          <h1 className="page-title">Agent <em>chat</em></h1>
          <p className="page-sub">{role === 'company' ? 'Tell the agent what to do, or ask it to explain why it did something. It remembers every decision you made.' : 'Your agent works while you sleep. Steer it like you would a junior recruiter.'}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Btn variant="ghost" icon="clock">History</Btn>
          <Btn variant="ghost" icon="sliders">Tone & rules</Btn>
        </div>
      </div>

      <div className="chat">
        <div className="chat-body" ref={bodyRef}>
          {thread.map((m, i) => (
            <Msg key={i} {...m} go={go} onAction={(a) => send(a)} />
          ))}
        </div>

        {/* Suggestions */}
        <div style={{ padding: '10px 14px 0', display: 'flex', gap: 6, flexWrap: 'wrap', background: 'var(--bg-elevated)', borderTop: '1px solid var(--line)' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} className="mono" style={{
              padding: '5px 10px', fontSize: 11, border: '1px solid var(--line)',
              borderRadius: 999, background: 'var(--paper)', color: 'var(--ink-muted)',
            }}>{s}</button>
          ))}
        </div>

        <form className="chat-foot" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
          <Avatar name="You" tone="ink" />
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={role === 'company' ? 'Tell the agent what to do…' : 'Ask the agent anything about your search…'} />
          <Btn variant="ghost" icon="link" />
          <Btn variant="primary" icon="send" onClick={() => send(draft)}>Send</Btn>
        </form>
      </div>
    </div>
  );
};

const Msg = ({ who, name, body, at, actions, diff, card, typing, go, onAction }) => (
  <div className={`msg ${who}`}>
    <Avatar name={name} tone={who === 'me' ? 'ink' : 'accent'} />
    <div className="col" style={{ gap: 6, minWidth: 0 }}>
      <div className="meta">{name} · {at}</div>
      <div className="msg-bubble">
        {typing ? <TypingDots /> : body}
      </div>
      {actions && (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
          {actions.map(a => (
            <button key={a} onClick={() => onAction(a)} className="mono" style={{
              padding: '5px 11px', fontSize: 11, border: '1px solid var(--line)',
              borderRadius: 999, background: 'var(--paper)', color: 'var(--ink)',
            }}>{a}</button>
          ))}
        </div>
      )}
      {diff && (
        <div className="card flat" style={{ padding: 14, marginTop: 6, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>
          <div style={{ color: 'var(--ink-subtle)', marginBottom: 8 }}>edit · maya.txt</div>
          <div style={{ color: '#a14a4a' }}>- Senior Designer at Ledger…</div>
          <div style={{ color: 'var(--positive)' }}>+ Lead Product Designer, Payments at Ledger…</div>
          <div style={{ color: 'var(--ink-subtle)', marginTop: 10, marginBottom: 8 }}>edit · priya.txt</div>
          <div style={{ color: '#a14a4a' }}>- …especially with our New York opening this quarter.</div>
          <div style={{ color: 'var(--positive)' }}>+ …especially with our control plane work in Tashkent.</div>
        </div>
      )}
      {card?.kind === 'job' && (
        <div className="card" style={{ padding: 14, marginTop: 6, maxWidth: 360 }}>
          <div className="row" style={{ gap: 10 }}>
            <Avatar name="L" tone="sand" square size="lg" />
            <div className="col">
              <span style={{ fontSize: 14, fontWeight: 500 }}>Senior Backend Engineer</span>
              <span className="muted mono" style={{ fontSize: 10.5 }}>Ledger · Berlin · €140–170k</span>
            </div>
          </div>
          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <Tag tone="accent">92 match</Tag>
            <Tag>Go</Tag><Tag>Fintech</Tag>
          </div>
          <Btn variant="ghost" iconRight="arrow" onClick={() => go && go('cjob', 'j1')} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>Open role</Btn>
        </div>
      )}
    </div>
  </div>
);

const TypingDots = () => (
  <span className="row" style={{ gap: 4 }}>
    {[0, 1, 2].map(i => (
      <span key={i} style={{
        width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-muted)',
        animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
      }} />
    ))}
  </span>
);

/* ============ Analytics ============ */
const Analytics = () => (
  <div className="page">
    <div className="page-head">
      <div>
        <div className="page-eyebrow">Last 90 days · all roles</div>
        <h1 className="page-title">Analytics</h1>
      </div>
      <div className="row" style={{ gap: 8 }}>
        <Btn variant="ghost" icon="calendar">Last 90 days</Btn>
        <Btn variant="soft" icon="upload">Export</Btn>
      </div>
    </div>

    <div className="kpis" style={{ marginBottom: 20 }}>
      <div className="kpi">
        <div className="label">Hires this quarter</div>
        <div className="val"><em>14</em></div>
        <div className="delta">vs. plan: 12</div>
        <div className="spark"><Sparkline data={[1, 2, 2, 3, 4, 5, 7, 8, 10, 11, 13, 14]} /></div>
      </div>
      <div className="kpi">
        <div className="label">Time to hire</div>
        <div className="val">21<span className="muted serif" style={{ fontSize: 22 }}>d</span></div>
        <div className="delta">– 14d vs. last Q</div>
        <div className="spark"><Sparkline data={[35, 34, 32, 30, 29, 28, 26, 25, 24, 23, 22, 21]} color="var(--positive)" /></div>
      </div>
      <div className="kpi">
        <div className="label">Outreach → reply</div>
        <div className="val">38%</div>
        <div className="delta">+ 9pp QoQ</div>
        <div className="spark"><Sparkline data={[18, 19, 22, 24, 27, 29, 30, 32, 34, 36, 37, 38]} /></div>
      </div>
      <div className="kpi">
        <div className="label">Cost per hire</div>
        <div className="val">$2.1k</div>
        <div className="delta">– 71% vs. external</div>
        <div className="spark"><Sparkline data={[7.4, 7.0, 6.4, 5.8, 5.0, 4.4, 3.8, 3.4, 3.0, 2.6, 2.3, 2.1]} color="var(--positive)" /></div>
      </div>
    </div>

    {/* Funnel */}
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="spread" style={{ marginBottom: 18 }}>
        <h3 className="serif" style={{ fontSize: 22 }}>Funnel · all roles</h3>
        <span className="mono muted" style={{ fontSize: 11 }}>2,847 sourced → 14 hired</span>
      </div>
      <div className="col" style={{ gap: 10 }}>
        {[
          ['Sourced', 2847, '100%'],
          ['Outreach sent', 1240, '44%'],
          ['Replied', 472, '17%'],
          ['Screened', 186, '7%'],
          ['Interviewed', 64, '2%'],
          ['Offer extended', 18, '0.6%'],
          ['Hired', 14, '0.5%'],
        ].map(([label, n, pct], i) => (
          <div key={label}>
            <div className="row spread mono" style={{ fontSize: 11, color: 'var(--ink-muted)', marginBottom: 4 }}>
              <span>{label}</span>
              <span>{n.toLocaleString()} <span style={{ color: 'var(--ink-subtle)' }}>· {pct}</span></span>
            </div>
            <div style={{ height: 22, background: 'var(--bg-elevated)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--line-soft)' }}>
              <div style={{ width: `${parseFloat(pct)}%`, height: '100%', background: i === 6 ? 'var(--accent)' : `oklch(${0.95 - i * 0.04} 0.04 50)` }} />
            </div>
          </div>
        ))}
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div className="card">
        <h3 className="serif" style={{ fontSize: 20, marginBottom: 14 }}>Top sources</h3>
        <div className="col" style={{ gap: 10 }}>
          {[['GitHub + agent crawl', 38], ['Outbound (agent-written)', 26], ['LinkedIn signal', 14], ['Referral (network graph)', 12], ['Direct apply', 10]].map(([s, p]) => (
            <div key={s}>
              <div className="row spread mono" style={{ fontSize: 11, color: 'var(--ink-muted)' }}><span>{s}</span><span>{p}%</span></div>
              <div className="bar"><i style={{ width: p * 2.5 + '%' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 className="serif" style={{ fontSize: 20, marginBottom: 14 }}>Agent vs. human work</h3>
        <p className="muted" style={{ fontSize: 13, marginBottom: 14 }}>Share of recruiter-equivalent work performed by your agent in the last 90 days.</p>
        <div className="row" style={{ gap: 16, alignItems: 'center', marginBottom: 14 }}>
          <ScoreRing value={78} color="var(--ink)" />
          <div className="col">
            <span className="serif" style={{ fontSize: 30 }}>78<span className="muted" style={{ fontSize: 14 }}>%</span></span>
            <span className="mono muted" style={{ fontSize: 11 }}>of recruiter-hours saved</span>
          </div>
        </div>
        <div className="col" style={{ gap: 6 }}>
          {[['Sourcing', 92], ['Outreach', 88], ['Screening', 64], ['Scheduling', 96], ['Reference checks', 42]].map(([s, p]) => (
            <div key={s} className="row spread" style={{ fontSize: 12 }}>
              <span>{s}</span>
              <span className="mono muted">{p}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* ============ Saved (candidate) ============ */
const Saved = ({ go }) => (
  <div className="page">
    <div className="page-head">
      <div>
        <div className="page-eyebrow">4 saved · agent is tracking</div>
        <h1 className="page-title">Saved roles</h1>
      </div>
    </div>
    <div className="feed">
      {JOBS.slice(0, 4).map((j, i) => {
        const co = COMPANIES.find(c => c.id === j.company);
        return (
          <div key={j.id} className="job-card" onClick={() => go('cjob', j.id)}>
            <div className="top">
              <div className="company-row">
                <Avatar name={co.logo} tone="sand" square size="lg" />
                <div className="col" style={{ lineHeight: 1.2 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{co.name}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)' }}>saved 3d ago</span>
                </div>
              </div>
              <Icon name="bookmark" size={18} />
            </div>
            <h3>{j.title}</h3>
            <div className="row mono" style={{ gap: 8, fontSize: 11, color: 'var(--ink-muted)' }}>
              <span>{j.location}</span><span>·</span><span>{j.salary}</span>
            </div>
            <div className="card flat" style={{ padding: 10, fontSize: 12 }}>
              <span className="muted">Update: </span>{['hiring manager visited your profile 2d ago', 'role still open · 14 applicants', 'compensation updated +€10k yesterday', 'new mutual connection · M. Hartwell'][i]}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

/* ============ Profile (candidate) ============ */
const MyProfile = () => (
  <div className="page narrow">
    <div className="page-head">
      <div>
        <div className="page-eyebrow">Last updated 2 weeks ago · 92% complete</div>
        <h1 className="page-title">My <em>profile</em></h1>
        <p className="page-sub">Your agent builds this from your work, not your résumé. Edit anything; it learns your voice.</p>
      </div>
      <Btn variant="primary" icon="sparkles">Re-scan my work</Btn>
    </div>

    <div className="card" style={{ padding: 28, marginBottom: 18 }}>
      <div className="row" style={{ gap: 18 }}>
        <Avatar name="Dilshod Karimov" tone="sand" size="xl" />
        <div className="col grow">
          <h2 className="serif" style={{ fontSize: 28 }}>Dilshod Karimov</h2>
          <p className="muted" style={{ fontSize: 14 }}>Staff Engineer, ex-Lyft Maps · Tashkent</p>
          <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Tag tone="positive" dot>Open to offers</Tag>
            <Tag>Builder · IC only</Tag>
            <Tag>$160k+</Tag>
            <Tag>6w notice</Tag>
          </div>
        </div>
      </div>
    </div>

    <div className="ai-summary" style={{ marginBottom: 18 }}>
      <p>Eight years building infra for high-throughput logistics platforms. Led the team that rewrote Lyft's dispatch routing in Go (handling 4M trips/day). Came home to Tashkent in 2024 and is looking for a builder-tier role with real ownership — strong preference for staying IC.</p>
      <div className="citations">
        <span>auto-written from your work</span><span>your last edit: "no management"</span>
      </div>
    </div>

    <div className="card" style={{ padding: 22, marginBottom: 18 }}>
      <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>What you want next</span>
      <div className="col" style={{ marginTop: 14, gap: 14 }}>
        {[
          ['Role type', 'Staff / Principal IC. No management.'],
          ['Comp', '$160k–$220k base · willing to flex on equity'],
          ['Location', 'Tashkent or Remote (CET ± 4h)'],
          ['Domain', 'Infra, distributed systems. Not pure ML, not consumer.'],
          ['Company stage', 'Series A → C · 30–300 people'],
          ['Avoid', 'Crypto · gambling · ad-tech'],
        ].map(([k, v]) => (
          <div key={k} className="row" style={{ gap: 18, fontSize: 13.5, paddingBottom: 12, borderBottom: '1px solid var(--line-soft)' }}>
            <span className="mono muted" style={{ width: 130, flex: 'none', fontSize: 11 }}>{k.toUpperCase()}</span>
            <span className="grow">{v}</span>
            <button className="mono hover-link" style={{ fontSize: 11 }}>edit</button>
          </div>
        ))}
      </div>
    </div>

    <div className="card" style={{ padding: 22 }}>
      <div className="spread" style={{ marginBottom: 14 }}>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Connected sources</span>
        <Btn variant="soft" icon="plus">Add source</Btn>
      </div>
      <div className="col" style={{ gap: 10 }}>
        {[['GitHub', 'github.com/dilshod', 'last sync 4h ago'], ['LinkedIn', 'linkedin.com/in/dkarimov', 'last sync 1d ago'], ['Personal site', 'dilshod.dev', 'last sync 3d ago'], ['Conference talks', '3 talks indexed', 'manually added']].map(([n, h, when]) => (
          <div key={n} className="row spread" style={{ padding: '10px 0', borderBottom: '1px solid var(--line-soft)' }}>
            <div className="row">
              <Icon name="link" size={14} />
              <div className="col" style={{ lineHeight: 1.2 }}>
                <span style={{ fontSize: 13 }}>{n}</span>
                <span className="mono muted" style={{ fontSize: 10.5 }}>{h}</span>
              </div>
            </div>
            <span className="mono muted" style={{ fontSize: 10.5 }}>{when}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

Object.assign(window, { AgentChat, Analytics, Saved, MyProfile });
