import { useState } from 'react'
import { KPI, Delta } from '../KPI.jsx'
import { MiniChart } from '../MiniChart.jsx'
import { MetricModal } from '../MetricModal.jsx'
import { monthLabel } from '../../lib/formatters.js'

const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '32px 0 18px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2, flexShrink: 0 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(255,255,255,0.55)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
  </div>
)

function fmt(val) {
  if (!val || val === 0) return '—'
  return `$${Math.round(val).toLocaleString('en-US')}`
}

function InsightsBlock({ cohort }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohorts: [cohort], period: monthLabel(cohort.month) }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      const data = await resp.json()
      setInsights(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? 16 : 0 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Conclusiones & Accionables</span>
        {!insights && (
          <button onClick={generate} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: loading ? 'rgba(45,122,255,0.1)' : 'rgba(45,122,255,0.15)', color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {loading ? '✦ Analizando...' : '✦ Generar análisis'}
          </button>
        )}
        {insights && (
          <button onClick={() => setInsights(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat' }}>↺ regenerar</button>
        )}
      </div>
      {error && <p style={{ color: DANGER, fontSize: 12, marginTop: 12 }}>Error: {error}</p>}
      {!insights && !loading && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 12, fontWeight: 500 }}>Clic en "Generar análisis" para que Claude analice el período seleccionado.</p>
      )}
      {insights && (
        <>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>{insights.conclusion}</p>
          <div style={{ background: 'rgba(45,122,255,0.05)', border: '1px solid rgba(45,122,255,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cuello de botella</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{insights.bottleneck}</p>
          </div>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, display: 'block', marginBottom: 10 }}>Acciones priorizadas (80/20)</span>
          {(insights.actions || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, minWidth: 20 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontWeight: 500 }}>{a}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export function Overview({ cohort, prevCohort, allCohorts }) {
  const [openMetric, setOpenMetric] = useState(null)

  if (!cohort) return (
    <div style={{ color: 'rgba(255,255,255,0.5)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos disponibles.</div>
  )

  const prev = prevCohort
  const gasto = cohort.gasto
  const mer = cohort.mer
  const cac = cohort.cac
  const aov = cohort.cohortAov
  const gp = cohort.grossProfit
  const payback = cohort.payback

  const pGasto = prev?.gasto
  const pMer = prev?.mer
  const pCac = prev?.cac
  const pAov = prev?.cohortAov
  const pGp = prev?.grossProfit
  const pPay = prev?.payback

  const monthName = monthLabel(cohort.month).split(' ')[0]

  return (
    <>
      {/* Cohort header */}
      <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>
          Cohorte {monthLabel(cohort.month)}
        </span>
        <span style={{ fontSize: 10, padding: '3px 12px', borderRadius: 20, background: cohort.isOpen ? 'rgba(255,255,255,0.05)' : 'rgba(45,122,255,0.15)', color: cohort.isOpen ? 'rgba(255,255,255,0.7)' : ACCENT, fontWeight: 700 }}>
          {cohort.isOpen ? `abierta · ${cohort.activeCount} activos` : 'completa'}
        </span>
      </div>

      {/* ROW 1: Revenue | Inversión | MER */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr 1fr', gap: 10, marginBottom: 10, maxWidth: 860 }}>
        <KPI
          label="Ingresos nuevos clientes"
          value={cohort.revenue > 0 ? fmt(cohort.revenue) : '—'}
          accent={ACCENT} highlight fontWeight={600}
          onClick={() => setOpenMetric('revenue')}
          delta={prev && prev.revenue > 0 ? <Delta current={cohort.revenue} previous={prev.revenue} /> : null}
        />
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(255,255,255,0.62)', fontWeight: 600 }}>Inversión total</span>
            {pGasto ? <Delta current={gasto} previous={pGasto} inverse /> : null}
          </div>
          <span style={{ fontSize: 24, fontWeight: 600 }}>{fmt(gasto)}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Publicidad</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{fmt(cohort.gastoAds)}</span>
            </div>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px' }}>
              <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.5)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Equipo</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{fmt(cohort.gastoEquipo)}</span>
            </div>
          </div>
        </div>
        <KPI
          label="MER"
          value={mer > 0 ? `${mer.toFixed(1)}x` : '—'}
          subtitle="revenue / inversión"
          accent={mer > 3 ? ACCENT : mer > 0 ? DANGER : undefined}
          fontWeight={600}
          onClick={() => setOpenMetric('mer')}
          delta={pMer ? <Delta current={mer} previous={pMer} /> : null}
        />
      </div>

      {/* ROW 2: AOV | CAC | GP | Payback */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10, maxWidth: 860 }}>
        <KPI label="AOV" value={aov > 0 ? fmt(aov) : '—'} subtitle="ingresos nuevos / clientes nuevos" ring onClick={() => setOpenMetric('aov')} delta={pAov ? <Delta current={aov} previous={pAov} /> : null} />
        <KPI label="CAC" value={cac > 0 ? fmt(cac) : '—'} subtitle="inversión total / clientes nuevos" accent={cac > 0 && cac < 150 ? ACCENT : undefined} ring onClick={() => setOpenMetric('cac')} delta={pCac ? <Delta current={cac} previous={pCac} inverse /> : null} />
        <KPI label="30D Gross Profit" value={gp > 0 ? fmt(gp) : '—'} subtitle="AOV × margen bruto" onClick={() => setOpenMetric('grossProfit')} delta={pGp ? <Delta current={gp} previous={pGp} /> : null} />
        <KPI label="Payback" value={payback > 0 ? `${payback.toFixed(0)} días` : '—'} subtitle="CAC / GP mensual × 30d" accent={payback > 0 && payback < 30 ? ACCENT : undefined} onClick={() => setOpenMetric('payback')} delta={pPay ? <Delta current={payback} previous={pPay} inverse /> : null} />
      </div>

      {/* CLIENTS TABLE */}
      <div style={{ padding: '16px 0', marginBottom: 10, maxWidth: 600 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: ACCENT }}>{cohort.clients.length}</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.58)', fontWeight: 700 }}>Clientes cerrados — {monthName}</span>
        </div>
        {cohort.clients.length > 0 ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 24px', padding: '0 0 8px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.15)', fontWeight: 700 }}>
              <span>Cliente</span><span>Monto</span><span>Ciclo</span>
            </div>
            {cohort.clients.map((cl, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0 24px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{cl.name}</span>
                <span style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>{fmt(cl.value)}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.58)', minWidth: 32 }}>{cl.days > 0 ? `${cl.days}d` : '—'}</span>
              </div>
            ))}
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Sin cierres en este período</span>
        )}
      </div>

      {/* EVOLUTION CHARTS */}
      {allCohorts && allCohorts.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 18px' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 6, display: 'block' }}>Ingresos nuevos clientes</span>
              <MiniChart
                data={allCohorts.filter(c => c.revenue > 0).map(c => ({ label: monthLabel(c.month).slice(0, 3), revenue: c.revenue }))}
                dataKey="revenue" color={ACCENT} prefix="$" height={110}
              />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '14px 18px' }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700, marginBottom: 6, display: 'block' }}>CAC</span>
              <MiniChart
                data={allCohorts.filter(c => c.cac > 0).map(c => ({ label: monthLabel(c.month).slice(0, 3), cac: c.cac }))}
                dataKey="cac" color={DANGER} prefix="$" height={110}
              />
            </div>
          </div>
        </>
      )}

      {/* INSIGHTS */}
      <Divider title="Conclusiones & Accionables" />
      <InsightsBlock cohort={cohort} />

      {openMetric && (
        <MetricModal metricKey={openMetric} cohort={cohort} prevCohort={prevCohort} allCohorts={allCohorts} onClose={() => setOpenMetric(null)} />
      )}
    </>
  )
}
