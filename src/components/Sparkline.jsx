import { useState } from 'react'

const ACCENT = '#2D7AFF'

// ── Sparkline minimalista (sin ejes, hover compacto) ──────────────────────
export function Sparkline({ data, dataKey, color = ACCENT, prefix = '' }) {
  const [hovered, setHovered] = useState(null)
  const filtered = (data || []).filter(x => x[dataKey] > 0 || x[dataKey] === 0)
  if (filtered.length < 2) {
    return <div style={{ fontSize: 10, color: 'rgba(26,31,54,0.3)', fontStyle: 'italic', textAlign: 'center' }}>sin evolución</div>
  }
  const W = 300, H = 60, pt = 6, pb = 14, pl = 4, pr = 4
  const iW = W - pl - pr, iH = H - pt - pb
  const vals = filtered.map(x => x[dataKey])
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = max - min || max || 1

  const pts = filtered.map((x, i) => ({
    x: pl + (i / (filtered.length - 1)) * iW,
    y: pt + iH - ((x[dataKey] - min) / range) * iH,
    val: x[dataKey],
    label: x.label,
  }))
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${pt + iH} L${pts[0].x.toFixed(1)},${pt + iH} Z`
  const gradId = `sp-${dataKey}-${color.replace(/[^a-z0-9]/gi, '')}`

  function fmtVal(v) {
    if (prefix === '$') return `$${Math.round(v).toLocaleString('en-US')}`
    return v >= 100 ? `${Math.round(v)}` : `${v.toFixed(1)}`
  }

  const hp = hovered !== null ? pts[hovered] : null
  const firstLabel = filtered[0]?.label
  const lastLabel = filtered[filtered.length - 1]?.label

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"
        style={{ width: '100%', height: 60, display: 'block' }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#${gradId})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hp && (
          <line x1={hp.x} y1={pt} x2={hp.x} y2={pt + iH}
            stroke="rgba(0,0,0,0.2)" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
        )}
        {pts.map((p, i) => (
          <rect key={i}
            x={p.x - iW / Math.max(pts.length - 1, 1) / 2} y={pt}
            width={iW / Math.max(pts.length - 1, 1)} height={iH}
            fill="transparent" style={{ cursor: 'crosshair' }}
            onMouseEnter={() => setHovered(i)} />
        ))}
        {hp && (
          <circle cx={hp.x} cy={hp.y} r="3" fill={color} stroke="#fff" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, fontSize: 10, color: 'rgba(26,31,54,0.4)', fontWeight: 600 }}>
        <span>{firstLabel}</span>
        <span>{lastLabel}</span>
      </div>
      {hp && (
        <div style={{
          position: 'absolute', top: -6, left: `${(hp.x / W) * 100}%`,
          transform: hp.x > W * 0.7 ? 'translate(-100%, -100%)' : 'translate(8px, -100%)',
          background: '#1a1f36', color: '#fff', borderRadius: 6,
          padding: '4px 8px', pointerEvents: 'none', zIndex: 10, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontSize: 9, opacity: 0.6, fontWeight: 600 }}>{hp.label}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color }}>{fmtVal(hp.val)}</div>
        </div>
      )}
    </div>
  )
}

// ── KPI con sparkline inline (horizontal) ────────────────────────────────────
export function KPIWithChart({ label, value, sub, delta, chartData, dataKey, color, prefix }) {
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16,
      padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 32,
    }}>
      <div style={{ flex: '0 0 auto', minWidth: 160 }}>
        <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: 700, color: 'rgba(26,31,54,0.42)', display: 'block', marginBottom: 6 }}>{label}</span>
        <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: color || '#1a1f36' }}>{value}</span>
        {sub && <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', fontWeight: 600, display: 'block', marginTop: 6 }}>{sub}</span>}
        {delta && <div style={{ marginTop: 4 }}>{delta}</div>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Sparkline data={chartData} dataKey={dataKey} color={color || ACCENT} prefix={prefix} />
      </div>
    </div>
  )
}
