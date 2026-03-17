const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'
const GREEN = '#34D399'

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

export function KPI({ label, value, subtitle, accent, delta, highlight, ring }) {
  return (
    <div style={{
      background: highlight ? 'rgba(45,122,255,0.06)' : 'rgba(255,255,255,0.025)',
      border: highlight ? '1px solid rgba(45,122,255,0.2)' : ring ? '1px solid rgba(45,122,255,0.15)' : '1px solid rgba(255,255,255,0.06)',
      borderRadius: 14, padding: highlight ? '22px 24px' : '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 3,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{label}</span>
        {delta}
      </div>
      <span style={{ fontSize: highlight ? 32 : ring ? 26 : 22, fontWeight: 800, color: accent || '#fff', letterSpacing: -0.5 }}>{value}</span>
      {subtitle && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{subtitle}</span>}
    </div>
  )
}
