import { KPI } from '../KPI.jsx'
const ACCENT = '#2D7AFF'
const GREEN = '#16A34A'

export function GoogleAdsTab({ data }) {
  if (!data || data.spend === 0) {
    return <div style={{ color: 'rgba(26,31,54,0.3)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Google Ads en este período.</div>
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Inversión" value={`$${data.spend.toLocaleString('es-AR')}`} accent={ACCENT} />
        <KPI label="Conversiones" value={data.conversions} accent={data.conversions > 0 ? GREEN : undefined} />
        <KPI label="CPA" value={data.cpa > 0 ? `$${data.cpa.toLocaleString('es-AR')}` : '—'} />
        <KPI label="Clicks" value={data.clicks.toLocaleString()} />
        <KPI label="CPC" value={data.cpc > 0 ? `$${data.cpc}` : '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Impresiones" value={data.impressions.toLocaleString()} />
        <KPI label="CTR" value={`${data.ctr}%`} accent={data.ctr > 3 ? ACCENT : undefined} />
        <KPI label="Impression Share" value={data.impressionShare > 0 ? `${data.impressionShare}%` : '—'} accent={data.impressionShare > 70 ? GREEN : undefined} />
      </div>

      {data.campaigns.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: '16px 20px' }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.28)', fontWeight: 700, marginBottom: 12, display: 'block' }}>Campañas</span>
          {data.campaigns.map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < data.campaigns.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <span style={{ fontSize: 12, color: 'rgba(26,31,54,0.7)', fontWeight: 600, flex: 1 }}>{c.name}</span>
              <div style={{ display: 'flex', gap: 18 }}>
                <span style={{ fontSize: 12, color: 'rgba(26,31,54,0.5)' }}>{c.clicks.toLocaleString()} clicks</span>
                <span style={{ fontSize: 12, color: c.conversions > 0 ? GREEN : 'rgba(26,31,54,0.3)', fontWeight: 700 }}>{c.conversions} conv.</span>
                <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700, minWidth: 70, textAlign: 'right' }}>${c.spend.toLocaleString('es-AR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
