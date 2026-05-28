/* shared.jsx — reusable atoms and icons */

const Icon = ({ name, size = 16, stroke = 1.6 }) => {
  const props = {
    width: size, height: size,
    viewBox: '0 0 24 24',
    fill: 'none', stroke: 'currentColor',
    strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round'
  };
  const P = {
    home: <path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z"/>,
    briefcase: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><circle cx="17" cy="9" r="2.5"/><path d="M2 20c0-3.3 3-6 7-6s7 2.7 7 6M22 20c0-2.5-2-4.5-5-4.5"/></>,
    inbox: <><path d="M3 13l3-8h12l3 8v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 13h5l1 3h6l1-3h5"/></>,
    chart: <path d="M3 20h18M6 16V9M11 16V5M16 16v-7M20 16v-4"/>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></>,
    bell: <><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/></>,
    spark: <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M5.6 18.4l2-2M16.4 7.6l2-2"/>,
    arrow: <path d="M5 12h14M13 6l6 6-6 6"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    filter: <path d="M3 5h18l-7 9v6l-4-2v-4z"/>,
    chev: <path d="M9 6l6 6-6 6"/>,
    chevDown: <path d="M6 9l6 6 6-6"/>,
    sliders: <path d="M4 6h10M18 6h2M4 12h2M10 12h10M4 18h14M20 18h0M14 4v4M8 10v4M18 16v4"/>,
    bookmark: <path d="M6 4h12v18l-6-4-6 4z"/>,
    send: <path d="M3 12l18-9-7 18-3-8z"/>,
    check: <path d="M5 12l5 5L20 7"/>,
    x: <path d="M6 6l12 12M18 6L6 18"/>,
    star: <path d="M12 3l2.7 6 6.3.6-4.8 4.3 1.4 6.5L12 17l-5.6 3.4 1.4-6.5L3 9.6 9.3 9z"/>,
    map: <><path d="M9 3l-6 3v15l6-3 6 3 6-3V3l-6 3z"/><path d="M9 3v15M15 6v15"/></>,
    bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z"/>,
    msg: <path d="M21 12a8 8 0 0 1-12 7l-6 2 2-6a8 8 0 1 1 16-3z"/>,
    sparkles: <><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/></>,
    link: <><path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></>,
    pin: <><path d="M12 2a6 6 0 0 1 6 6c0 4-6 13-6 13S6 12 6 8a6 6 0 0 1 6-6z"/><circle cx="12" cy="8" r="2"/></>,
    flag: <path d="M5 21V4h12l-2 4 2 4H5"/>,
    play: <path d="M6 4l14 8-14 8z"/>,
    pause: <><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></>,
    refresh: <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>,
    upload: <path d="M12 16V4M6 10l6-6 6 6M4 20h16"/>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>,
    book: <path d="M4 4h7a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H4zM20 4h-7a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h8z"/>,
    code: <path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
    dollar: <path d="M12 2v20M16 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    pulse: <path d="M2 12h4l3-8 4 16 3-8h6"/>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    workflow: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/><path d="M9 6h6a3 3 0 0 1 3 3v6"/></>,
  };
  return <svg {...props}>{P[name]}</svg>;
};

const Avatar = ({ name, size = 'md', tone, square = false, color }) => {
  const initials = (name || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
  const tones = {
    accent: { bg: 'var(--accent-soft)', fg: 'var(--accent)' },
    sage: { bg: 'rgba(47,107,63,0.10)', fg: 'var(--positive)' },
    sand: { bg: 'var(--bg-deep)', fg: 'var(--ink-muted)' },
    ink: { bg: 'var(--ink)', fg: 'var(--bg)' },
    sky: { bg: 'rgba(60, 100, 140, 0.10)', fg: '#3C6488' },
    plum: { bg: 'rgba(120, 60, 130, 0.10)', fg: '#783C82' },
  };
  // Hash name to pick consistent tone
  const auto = ['accent', 'sage', 'sand', 'sky', 'plum'];
  const t = tone || auto[(name?.charCodeAt(0) || 0) % auto.length];
  const sty = tones[t] || tones.accent;
  const cls = `avatar ${size === 'lg' ? 'lg' : size === 'xl' ? 'xl' : ''} ${square ? 'sq' : ''}`;
  return (
    <div className={cls.trim()} style={{ background: color || sty.bg, color: sty.fg }}>
      {initials}
    </div>
  );
};

const Tag = ({ children, tone, dot, ...rest }) => (
  <span className={`tag ${tone || ''}`} {...rest}>
    {dot && <span className="dot" />}
    {children}
  </span>
);

const Btn = ({ children, variant = 'ghost', size, icon, iconRight, onClick, ...rest }) => (
  <button className={`btn btn-${variant} ${size === 'lg' ? 'lg' : ''}`} onClick={onClick} {...rest}>
    {icon && <Icon name={icon} size={14} />}
    {children}
    {iconRight && <Icon name={iconRight} size={14} />}
  </button>
);

const ScoreRing = ({ value, color }) => (
  <div className="score-ring" style={{ '--p': value, '--c': color || 'var(--accent)' }}>
    <span>{value}</span>
  </div>
);

const Sparkline = ({ data, color = 'var(--accent)', height = 28 }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * w},${height - ((d - min) / range) * height}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
};

const GridHero = ({ children, style }) => (
  <div className="grid-hero" style={style}>{children}</div>
);

// Logo glyph
const Logo = ({ size = 26 }) => (
  <div className="brand-mark" style={{ width: size, height: size, fontSize: size * 0.62 }}>m</div>
);

Object.assign(window, { Icon, Avatar, Tag, Btn, ScoreRing, Sparkline, GridHero, Logo });
