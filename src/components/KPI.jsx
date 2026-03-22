const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'

export function Delta({ current, previous, inverse = false }) {
  if (current === null || previous === null || previous === 0) return null
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const good = inverse ? pct < 0 : pct > 0
  return (
    <span style={{ fontSize: 11, color: good ? GREEN : DANGER, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
      {pct > 0 ? '▲' : '▼'}{Math.abs(pct).toFixed(0)}%
    </span>
  )
}

export function KPI({ label, value, subtitle, accent, delta, highlight, ring, fontWeight, onClick }) {
  const fw = fontWeight || 700
  const clickable = !!onClick
  return (
    <div
      onClick={onClick}
      style={{
        background: highlight ? 'rgba(45,122,255,0.07)' : ring ? 'rgba(45,122,255,0.04)' : '#FFFFFF',
        border: highlight ? '1px solid rgba(45,122,255,0.25)' : ring ? '1px solid rgba(45,122,255,0.18)' : '1px solid rgba(0,0,0,0.08)',
        borderRadius: 14, padding: highlight ? '22px 24px' : '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 3,
        cursor: clickable ? 'pointer' : 'default',
        transition: clickable ? 'border-color 0.15s, background 0.15s' : undefined,
      }}
      onMouseEnter={clickable ? e => { e.currentTarget.style.borderColor = 'rgba(45,122,255,0.45)' } : undefined}
      onMouseLeave={clickable ? e => { e.currentTarget.style.borderColor = highlight ? 'rgba(45,122,255,0.25)' : ring ? 'rgba(45,122,255,0.18)' : 'rgba(0,0,0,0.08)' } : undefined}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(26,31,54,0.6)', fontWeight: 600 }}>{label}</span>
        {delta}
      </div>
      <span style={{ fontSize: highlight ? 32 : ring ? 26 : 22, fontWeight: fw, color: accent || '#1a1f36', letterSpacing: -0.5 }}>{value}</span>
      {subtitle && <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.55)', fontWeight: 500 }}>{subtitle}</span>}
    </div>
  )
}
