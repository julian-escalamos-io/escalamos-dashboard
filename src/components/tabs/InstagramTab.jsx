import { KPI, Delta } from '../KPI.jsx'
const ACCENT = '#2D7AFF'
const GREEN = '#16A34A'
const DANGER = '#E03E3E'

export function InstagramTab({ data, prevData }) {
  if (!data) return <div style={{ color: 'rgba(26,31,54,0.3)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Social Media.</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPI
          label="Total seguidores"
          value={data.lastFollowers ? data.lastFollowers.toLocaleString() : '—'}
          accent={ACCENT}
        />
        <KPI
          label="Seguidores netos"
          value={data.segNetos >= 0 ? `+${data.segNetos}` : String(data.segNetos)}
          accent={data.segNetos > 0 ? GREEN : data.segNetos < 0 ? DANGER : undefined}
          delta={prevData ? <Delta current={data.segNetos} previous={prevData.segNetos} /> : null}
        />
        <KPI
          label="Nuevos seguidores"
          value={data.nuevos.toLocaleString()}
          accent={GREEN}
          delta={prevData ? <Delta current={data.nuevos} previous={prevData.nuevos} /> : null}
        />
        <KPI
          label="Perdidos"
          value={data.perdidos.toLocaleString()}
          accent={data.perdidos > 0 ? DANGER : undefined}
          delta={prevData ? <Delta current={data.perdidos} previous={prevData.perdidos} inverse /> : null}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        <KPI
          label="Alcance orgánico"
          value={data.alcance > 0 ? data.alcance.toLocaleString() : '—'}
          delta={prevData && prevData.alcance > 0 ? <Delta current={data.alcance} previous={prevData.alcance} /> : null}
        />
        <KPI
          label="Vistas"
          value={data.views > 0 ? data.views.toLocaleString() : '—'}
          delta={prevData && prevData.views > 0 ? <Delta current={data.views} previous={prevData.views} /> : null}
        />
        <KPI
          label="Interacciones"
          value={data.interacciones.toLocaleString()}
          accent={ACCENT}
          delta={prevData ? <Delta current={data.interacciones} previous={prevData.interacciones} /> : null}
        />
      </div>
    </div>
  )
}
