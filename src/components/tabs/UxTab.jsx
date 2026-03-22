import { KPI, Delta } from '../KPI.jsx'
const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'

export function UxTab({ data, prevData }) {
  if (!data) return <div style={{ color: 'rgba(26,31,54,0.3)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de UX.</div>
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPI label="Sesiones" value={data.sessions.toLocaleString()}
          delta={prevData ? <Delta current={data.sessions} previous={prevData.sessions} /> : null} />
        <KPI label="Bounce Rate" value={`${data.bounceRate}%`} accent={data.bounceRate < 40 ? ACCENT : undefined}
          delta={prevData ? <Delta current={data.bounceRate} previous={prevData.bounceRate} inverse /> : null} />
        <KPI label="Scroll Depth" value={`${data.scrollDepth}%`} accent={data.scrollDepth > 55 ? ACCENT : undefined}
          delta={prevData ? <Delta current={data.scrollDepth} previous={prevData.scrollDepth} /> : null} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <KPI label="Rage Clicks" value={data.rageClicks} accent={data.rageClicks > 15 ? DANGER : ACCENT}
          delta={prevData ? <Delta current={data.rageClicks} previous={prevData.rageClicks} inverse /> : null} />
        <KPI label="Conv. Formulario" value={data.convForm} accent={ACCENT}
          delta={prevData ? <Delta current={data.convForm} previous={prevData.convForm} /> : null} />
        <KPI label="Conv. WhatsApp" value={data.convWhatsapp} accent={ACCENT}
          delta={prevData ? <Delta current={data.convWhatsapp} previous={prevData.convWhatsapp} /> : null} />
      </div>
    </div>
  )
}
