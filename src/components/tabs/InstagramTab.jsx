import { KPI, Delta } from '../KPI.jsx'
const ACCENT = '#2D7AFF'

export function InstagramTab({ data, prevData }) {
  if (!data) return <div style={{ color: 'rgba(26,31,54,0.3)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Instagram.</div>
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPI label="Seguidores netos" value={data.segNetos >= 0 ? `+${data.segNetos}` : String(data.segNetos)} accent={data.segNetos > 0 ? ACCENT : undefined}
          delta={prevData ? <Delta current={data.segNetos} previous={prevData.segNetos} /> : null} />
        <KPI label="Alcance orgánico" value={data.alcance > 0 ? data.alcance.toLocaleString() : '—'}
          delta={prevData && prevData.alcance > 0 ? <Delta current={data.alcance} previous={prevData.alcance} /> : null} />
        <KPI label="Interacciones" value={data.interacciones.toLocaleString()} accent={ACCENT}
          delta={prevData ? <Delta current={data.interacciones} previous={prevData.interacciones} /> : null} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {data.lastFollowers && <KPI label="Total seguidores" value={data.lastFollowers.toLocaleString()} />}
        {data.gastoIg > 0 && <KPI label="Gasto campaña IG" value={`$${data.gastoIg.toFixed(2)}`} />}
      </div>
    </div>
  )
}
