import { KPI, Delta } from '../KPI.jsx'
const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'

export function SeoTab({ data, prevData }) {
  if (!data) return <div style={{ color: 'rgba(255,255,255,0.2)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Search Console.</div>
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Clicks orgánicos" value={data.clicks.toLocaleString()} accent={ACCENT}
          delta={prevData ? <Delta current={data.clicks} previous={prevData.clicks} /> : null} />
        <KPI label="Impresiones" value={data.impressions.toLocaleString()}
          delta={prevData ? <Delta current={data.impressions} previous={prevData.impressions} /> : null} />
        <KPI label="CTR" value={`${data.ctr}%`} accent={data.ctr > 3 ? ACCENT : undefined}
          delta={prevData ? <Delta current={data.ctr} previous={prevData.ctr} /> : null} />
        <KPI label="Posición promedio" value={data.position} accent={data.position > 0 && data.position < 10 ? ACCENT : DANGER}
          delta={prevData && prevData.position > 0 ? <Delta current={data.position} previous={prevData.position} inverse /> : null} />
      </div>
      {data.topQueries.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.2)', fontWeight: 700, marginBottom: 12, display: 'block' }}>Top queries</span>
          {data.topQueries.map((q, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500, flex: 1 }}>{q.query}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{q.clicks} clicks</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>{q.impressions.toLocaleString()} impr.</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
