import useSWR from 'swr'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'

const fetcher = url => fetch(url).then(r => r.json())

function StageBadge({ stage }) {
  const styles = {
    TOF: { bg: 'rgba(45,122,255,0.1)', text: ACCENT },
    MOF: { bg: 'rgba(0,0,0,0.05)', text: 'rgba(26,31,54,0.55)' },
    BOF: { bg: 'rgba(224,62,62,0.08)', text: DANGER },
  }
  const s = styles[stage] || styles.MOF
  return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: s.bg, color: s.text, fontWeight: 700, letterSpacing: 0.5 }}>{stage}</span>
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

export function AdsTab({ ads }) {
  const adIds = ads.map(a => a.adId).join(',')
  const { data: thumbs } = useSWR(
    ads.length ? `/api/thumbnails?ids=${adIds}` : null,
    fetcher,
    { revalidateOnFocus: false }
  )

  if (!ads || ads.length === 0) {
    return <div style={{ color: 'rgba(26,31,54,0.3)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Meta Ads en el período.</div>
  }

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 14, padding: 24 }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.3)', fontWeight: 700, marginBottom: 20, display: 'block' }}>
        Meta Ads — por gasto ({ads.length} ads)
      </span>
      {ads.map((ad, i) => (
        <div key={ad.adId || i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(0,0,0,0.05)', alignItems: 'center' }}>
          <Thumbnail src={thumbs?.[ad.adId]} index={i} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(26,31,54,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.adName}</span>
              <StageBadge stage={ad.stage} />
            </div>
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'rgba(26,31,54,0.45)', fontWeight: 500, flexWrap: 'wrap' }}>
              {ad.hookRate > 0
                ? <span>Hook <span style={{ color: ad.hookRate > 20 ? ACCENT : 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{ad.hookRate}%</span></span>
                : <span style={{ color: 'rgba(26,31,54,0.25)', fontStyle: 'italic' }}>imagen</span>
              }
              {ad.holdRate > 0 && <span>Hold <span style={{ color: ad.holdRate > 7 ? ACCENT : 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{ad.holdRate}%</span></span>}
              <span>CTR <span style={{ color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{ad.uniqueCtr}%</span></span>
              <span>Freq <span style={{ color: ad.frequency > 3 ? DANGER : 'rgba(26,31,54,0.6)', fontWeight: 700 }}>{ad.frequency}</span></span>
              <span>CPM <span style={{ color: 'rgba(26,31,54,0.6)', fontWeight: 700 }}>${ad.cpm}</span></span>
              {ad.impressions > 0 && <span style={{ color: 'rgba(26,31,54,0.25)' }}>{ad.impressions.toLocaleString()} impr.</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(26,31,54,0.28)', fontWeight: 600, display: 'block' }}>Regs</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: ad.registrations > 0 ? ACCENT : 'rgba(26,31,54,0.15)' }}>{ad.registrations}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(26,31,54,0.28)', fontWeight: 600, display: 'block' }}>Convos</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: ad.convos > 0 ? GREEN : 'rgba(26,31,54,0.15)' }}>{ad.convos}</span>
            </div>
            <div style={{ textAlign: 'center', minWidth: 55 }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(26,31,54,0.28)', fontWeight: 600, display: 'block' }}>Gasto</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#1a1f36' }}>${ad.spend.toFixed(0)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
