const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'
const GREEN = '#34D399'

function StageBadge({ stage }) {
  const styles = {
    TOF: { bg: 'rgba(45,122,255,0.12)', text: ACCENT },
    MOF: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)' },
    BOF: { bg: 'rgba(255,107,107,0.1)', text: DANGER },
  }
  const s = styles[stage] || styles.MOF
  return <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 5, background: s.bg, color: s.text, fontWeight: 700, letterSpacing: 0.5 }}>{stage}</span>
}

export function AdsTab({ ads }) {
  if (!ads || ads.length === 0) {
    return <div style={{ color: 'rgba(255,255,255,0.2)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos de Meta Ads en el período.</div>
  }
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.2)', fontWeight: 700, marginBottom: 20, display: 'block' }}>
        Meta Ads — por gasto ({ads.length} ads)
      </span>
      {ads.map((ad, i) => (
        <div key={ad.adId || i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', alignItems: 'center' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: 'rgba(255,255,255,0.3)', fontWeight: 700 }}>
            {(i + 1)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.adName}</span>
              <StageBadge stage={ad.stage} />
            </div>
            <div style={{ display: 'flex', gap: 18, fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 500, flexWrap: 'wrap' }}>
              {ad.hookRate > 0
                ? <span>Hook <span style={{ color: ad.hookRate > 20 ? ACCENT : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{ad.hookRate}%</span></span>
                : <span style={{ color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>imagen</span>
              }
              {ad.holdRate > 0 && <span>Hold <span style={{ color: ad.holdRate > 7 ? ACCENT : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{ad.holdRate}%</span></span>}
              <span>CTR <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{ad.uniqueCtr}%</span></span>
              <span>Freq <span style={{ color: ad.frequency > 3 ? DANGER : 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{ad.frequency}</span></span>
              <span>CPM <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>${ad.cpm}</span></span>
              {ad.impressions > 0 && <span style={{ color: 'rgba(255,255,255,0.2)' }}>{ad.impressions.toLocaleString()} impr.</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block' }}>Regs</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: ad.registrations > 0 ? ACCENT : 'rgba(255,255,255,0.12)' }}>{ad.registrations}</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block' }}>Convos</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: ad.convos > 0 ? GREEN : 'rgba(255,255,255,0.12)' }}>{ad.convos}</span>
            </div>
            <div style={{ textAlign: 'center', minWidth: 55 }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block' }}>Gasto</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>${ad.spend.toFixed(0)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
