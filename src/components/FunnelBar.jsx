import { Delta } from './KPI.jsx'
const ACCENT = '#2D7AFF'

export function FunnelBar({ label, value, total, color, prevValue, prevTotal }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const prevPct = prevTotal > 0 && prevValue !== undefined ? (prevValue / prevTotal) * 100 : null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
      <span style={{ width: 140, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right', fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 30, background: 'rgba(255,255,255,0.03)', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
          {value} ({pct.toFixed(0)}%)
          {prevPct !== null && <Delta current={pct} previous={prevPct} />}
        </span>
      </div>
    </div>
  )
}
