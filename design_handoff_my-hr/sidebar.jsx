/* sidebar.jsx — left navigation + role switch */

const COMPANY_NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'home' },
  { id: 'jobs', label: 'Open roles', icon: 'briefcase', count: 12 },
  { id: 'candidates', label: 'Candidates', icon: 'users', count: 86 },
  { id: 'chat', label: 'Agent chat', icon: 'sparkles' },
  { id: 'analytics', label: 'Analytics', icon: 'chart' },
];

const CANDIDATE_NAV = [
  { id: 'feed', label: 'For you', icon: 'sparkles' },
  { id: 'saved', label: 'Saved', icon: 'bookmark', count: 4 },
  { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 2 },
  { id: 'profile', label: 'My profile', icon: 'users' },
];

const Sidebar = ({ role, setRole, view, setView, fixedRole }) => {
  const nav = role === 'company' ? COMPANY_NAV : CANDIDATE_NAV;
  return (
    <aside className="sidebar">
      <a href={fixedRole ? 'my-hr.html' : '#'} className="brand" style={{ cursor: 'pointer' }}>
        <Logo />
        <div className="brand-name">my<em>-hr</em></div>
      </a>

      {fixedRole ? (
        <div className="mono" style={{
          fontSize: 10, color: 'var(--ink-subtle)',
          letterSpacing: '0.12em', textTransform: 'uppercase',
          padding: '4px 6px',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="live-dot" />
          <span>{role} portal</span>
        </div>
      ) : (
        <div className="role-switch" role="tablist" aria-label="Switch portal">
          <button
            className={role === 'company' ? 'active' : ''}
            onClick={() => setRole('company')}
          >Company</button>
          <button
            className={role === 'candidate' ? 'active' : ''}
            onClick={() => setRole('candidate')}
          >Candidate</button>
        </div>
      )}

      <div className="nav-group">
        <div className="nav-label">{role === 'company' ? 'Workspace' : 'Your search'}</div>
        {nav.map(n => (
          <div
            key={n.id}
            className={`nav-item ${view === n.id ? 'active' : ''}`}
            onClick={() => setView(n.id)}
          >
            <span className="ico"><Icon name={n.icon} size={15} /></span>
            <span>{n.label}</span>
            {n.count !== undefined && <span className="count">{n.count}</span>}
          </div>
        ))}
      </div>

      {role === 'company' && (
        <div className="nav-group">
          <div className="nav-label">Pinned roles</div>
          {JOBS.slice(0, 3).map(j => {
            const co = COMPANIES.find(c => c.id === j.company);
            return (
              <div
                key={j.id}
                className="nav-item"
                onClick={() => setView('jobs')}
                style={{ fontSize: 12.5 }}
              >
                <span className="ico"><Icon name="pin" size={13} /></span>
                <div className="col" style={{ lineHeight: 1.2, minWidth: 0 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.title}</span>
                  <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-subtle)' }}>{co?.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="sidebar-foot">
        <div className="agent-card">
          <div className="row spread">
            <div className="row" style={{ gap: 6 }}>
              <span className="live-dot" />
              <span className="mono">Agent · live</span>
            </div>
            <span className="mono" style={{ color: 'var(--ink-subtle)' }}>v0.8</span>
          </div>
          <div className="label">
            {role === 'company'
              ? 'Sourcing 3 roles · 2 outreach in flight'
              : 'Watching 14 roles for you · 2 new matches'}
          </div>
          <div className="meter"><i style={{ width: '62%' }} /></div>
          <div className="row spread" style={{ marginTop: 2 }}>
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-subtle)' }}>This week</span>
            <span className="mono" style={{ fontSize: 9.5, color: 'var(--ink-muted)' }}>62% of plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

window.Sidebar = Sidebar;
