import { KPI, Delta } from '../KPI.jsx'
const ACCENT = '#2D7AFF'
const GREEN = '#16A34A'
const DANGER = '#E03E3E'

function TipoBadge({ tipo }) {
  const styles = {
    REEL:        { bg: 'rgba(168,85,247,0.1)', text: '#A855F7' },
    VIDEO:       { bg: 'rgba(168,85,247,0.1)', text: '#A855F7' },
    IMAGE:       { bg: 'rgba(45,122,255,0.1)', text: ACCENT },
    CAROUSEL_ALBUM: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B' },
    STORY:       { bg: 'rgba(0,0,0,0.05)', text: 'rgba(26,31,54,0.55)' },
  }
  const t = tipo?.toUpperCase() || ''
  const s = styles[t] || { bg: 'rgba(0,0,0,0.05)', text: 'rgba(26,31,54,0.55)' }
  const label = t === 'CAROUSEL_ALBUM' ? 'CARRUSEL' : t
  return <span style={{ fontSize: 9, padding: '3px 8px', borderRadius: 5, background: s.bg, color: s.text, fontWeight: 700, letterSpacing: 0.5 }}>{label}</span>
}

function Thumbnail({ src, index }) {
  if (src) {
    return (
      <div style={{ width: 56, height: 56, borderRadius: 10, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(0,0,0,0.08)' }}>
        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
      </div>
    )
  }
  return (
    <div style={{ width: 56, height: 56, borderRadius: 10, background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(26,31,54,0.25)', fontSize: 15, fontWeight: 700 }}>
      {index + 1}
    </div>
  )
}

function fmtDate(s) {
  if (!s) return ''
  const [y, m, d] = s.split('-')
  return `${d}/${m}`
}

export function InstagramTab({ data, content = [], prevData }) {
  if (!data) return <div style={{ color: 'rgba(26,31,54,0.3)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Social Media.</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        <KPI label="Total seguidores" value={data.lastFollowers ? data.lastFollowers.toLocaleString() : '—'} accent={ACCENT} />
        <KPI label="Seguidores netos" value={data.segNetos >= 0 ? `+${data.segNetos}` : String(data.segNetos)}
          accent={data.segNetos > 0 ? GREEN : data.segNetos < 0 ? DANGER : undefined}
          delta={prevData ? <Delta current={data.segNetos} previous={prevData.segNetos} /> : null} />
        <KPI label="Nuevos seguidores" value={data.nuevos.toLocaleString()} accent={GREEN}
          delta={prevData ? <Delta current={data.nuevos} previous={prevData.nuevos} /> : null} />
        <KPI label="Perdidos" value={data.perdidos.toLocaleString()} accent={data.perdidos > 0 ? DANGER : undefined}
          delta={prevData ? <Delta current={data.perdidos} previous={prevData.perdidos} inverse /> : null} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <KPI label="Alcance orgánico" value={data.alcance > 0 ? data.alcance.toLocaleString() : '—'}
          delta={prevData && prevData.alcance > 0 ? <Delta current={data.alcance} previous={prevData.alcance} /> : null} />
        <KPI label="Vistas" value={data.views > 0 ? data.views.toLocaleString() : '—'}
          delta={prevData && prevData.views > 0 ? <Delta current={data.views} previous={prevData.views} /> : null} />
        <KPI label="Interacciones" value={data.interacciones.toLocaleString()} accent={ACCENT}
          delta={prevData ? <Delta current={data.interacciones} previous={prevData.interacciones} /> : null} />
      </div>

      {content.length > 0 && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 24 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.3)', fontWeight: 700, marginBottom: 20, display: 'block' }}>
            Contenido publicado — por interacciones ({content.length})
          </span>
          {content.map((c, i) => (
            <div key={c.mediaId || i} style={{ display: 'flex', gap: 16, padding: '14px 0', borderBottom: i < content.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', alignItems: 'center' }}>
              <Thumbnail src={c.thumbnail} index={i} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.4)', fontWeight: 600 }}>{fmtDate(c.fecha)}</span>
                  <TipoBadge tipo={c.tipo} />
                  {c.permalink ? (
                    <a href={c.permalink} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'rgba(26,31,54,0.8)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'none', flex: 1 }}>
                      {c.caption || '(sin caption)'}
                    </a>
                  ) : (
                    <span style={{ fontSize: 12, color: 'rgba(26,31,54,0.8)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{c.caption || '(sin caption)'}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'rgba(26,31,54,0.45)', fontWeight: 500, flexWrap: 'wrap' }}>
                  {c.engagementRate > 0 && <span>ER <span style={{ color: c.engagementRate > 5 ? ACCENT : 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{c.engagementRate}%</span></span>}
                  {c.saveRate > 0 && <span>Save <span style={{ color: c.saveRate > 3 ? GREEN : 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{c.saveRate}%</span></span>}
                  {c.shareRate > 0 && <span>Share <span style={{ color: c.shareRate > 2 ? GREEN : 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{c.shareRate}%</span></span>}
                  {c.likes > 0 && <span style={{ color: 'rgba(26,31,54,0.35)' }}>♥ {c.likes.toLocaleString()}</span>}
                  {c.comments > 0 && <span style={{ color: 'rgba(26,31,54,0.35)' }}>💬 {c.comments}</span>}
                  {c.shares > 0 && <span style={{ color: 'rgba(26,31,54,0.35)' }}>↗ {c.shares}</span>}
                  {c.saved > 0 && <span style={{ color: 'rgba(26,31,54,0.35)' }}>🔖 {c.saved}</span>}
                  {c.avgWatchTime > 0 && <span>Avg <span style={{ color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{c.avgWatchTime}s</span></span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(26,31,54,0.28)', fontWeight: 600, display: 'block' }}>Alcance</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(26,31,54,0.7)' }}>{c.reach.toLocaleString()}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(26,31,54,0.28)', fontWeight: 600, display: 'block' }}>Vistas</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'rgba(26,31,54,0.7)' }}>{c.views.toLocaleString()}</span>
                </div>
                <div style={{ textAlign: 'center', minWidth: 60 }}>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(26,31,54,0.28)', fontWeight: 600, display: 'block' }}>Interac.</span>
                  <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>{c.interactions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
