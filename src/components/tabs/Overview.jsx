import { useState } from 'react'
import { KPI, Delta } from '../KPI.jsx'
import { FunnelBar } from '../FunnelBar.jsx'
import { MiniChart } from '../MiniChart.jsx'
import { aggregateCohorts, FUNNEL_ORDER } from '../../lib/cohorts.js'
import { money, monthLabel } from '../../lib/formatters.js'

const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'
const GREEN = '#34D399'

function Divider({ title }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0 16px' }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(255,255,255,0.18)', fontWeight: 700 }}>{title}</span>
      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.05)' }} />
    </div>
  )
}

function InsightsBlock({ cohorts, period }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohorts, period }),
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
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>Conclusiones & Accionables</span>
        {!insights && (
          <button
            onClick={generate}
            disabled={loading}
            style={{
              padding: '8px 18px', borderRadius: 8, border: `1px solid ${ACCENT}`,
              background: loading ? 'rgba(45,122,255,0.1)' : 'rgba(45,122,255,0.15)',
              color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat',
              cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {loading ? '✦ Analizando...' : '✦ Generar análisis'}
          </button>
        )}
        {insights && (
          <button
            onClick={() => setInsights(null)}
            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.2)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat' }}
          >
            ↺ regenerar
          </button>
        )}
      </div>

      {error && <p style={{ color: DANGER, fontSize: 12, marginTop: 12 }}>Error: {error}</p>}

      {!insights && !loading && (
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', marginTop: 12, fontWeight: 500 }}>
          Clic en "Generar análisis" para que Claude analice las cohortes del período seleccionado.
        </p>
      )}

      {insights && (
        <>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>{insights.conclusion}</p>
          <div style={{ background: 'rgba(45,122,255,0.05)', border: '1px solid rgba(45,122,255,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cuello de botella</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>{insights.bottleneck}</p>
          </div>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.2)', fontWeight: 700, display: 'block', marginBottom: 10 }}>Acciones priorizadas</span>
          {(insights.actions || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, minWidth: 20 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, fontWeight: 500 }}>{a}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function CohortCard({ cohort, prevCohort, isLast }) {
  const prev = prevCohort
  return (
    <div style={{ background: isLast ? 'rgba(45,122,255,0.04)' : 'rgba(255,255,255,0.015)', border: isLast ? '1px solid rgba(45,122,255,0.15)' : '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: '18px 20px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: isLast ? ACCENT : 'rgba(255,255,255,0.7)' }}>{monthLabel(cohort.month)}</span>
        <span style={{ fontSize: 10, padding: '3px 12px', borderRadius: 20, background: cohort.isOpen ? 'rgba(255,255,255,0.05)' : 'rgba(45,122,255,0.12)', color: cohort.isOpen ? 'rgba(255,255,255,0.4)' : ACCENT, fontWeight: 700 }}>
          {cohort.isOpen ? `en curso · ${cohort.activeCount} activos` : 'completa'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <KPI label="Revenue" value={cohort.revenue > 0 ? money(cohort.revenue) : '—'} accent={ACCENT} delta={prev && prev.revenue > 0 ? <Delta current={cohort.revenue} previous={prev.revenue} /> : null} />
        <KPI label="MER" value={cohort.mer > 0 ? `${cohort.mer.toFixed(1)}x` : '—'} accent={cohort.mer >= 3 ? ACCENT : cohort.mer > 0 ? DANGER : undefined} delta={prev && prev.mer > 0 ? <Delta current={cohort.mer} previous={prev.mer} /> : null} />
        <KPI label="CAC" value={cohort.cac > 0 ? money(cohort.cac) : '—'} delta={prev && prev.cac > 0 ? <Delta current={cohort.cac} previous={prev.cac} inverse /> : null} />
        <KPI label="Payback" value={cohort.payback > 0 ? `${cohort.payback.toFixed(0)}d` : '—'} accent={cohort.payback > 0 && cohort.payback < 30 ? ACCENT : undefined} delta={prev && prev.payback > 0 ? <Delta current={cohort.payback} previous={prev.payback} inverse /> : null} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        <KPI label="Leads" value={cohort.leadsCount} delta={prev ? <Delta current={cohort.leadsCount} previous={prev.leadsCount} /> : null} />
        <KPI label="Cierres" value={cohort.closuresCount} delta={prev ? <Delta current={cohort.closuresCount} previous={prev.closuresCount} /> : null} />
        <KPI label="Conversión" value={cohort.leadsCount > 0 ? `${((cohort.closuresCount / cohort.leadsCount) * 100).toFixed(1)}%` : '—'} accent={cohort.leadsCount > 0 && cohort.closuresCount / cohort.leadsCount > 0.1 ? ACCENT : undefined} />
        <KPI label="CPL" value={cohort.cpl > 0 ? money(cohort.cpl) : '—'} delta={prev && prev.cpl > 0 ? <Delta current={cohort.cpl} previous={prev.cpl} inverse /> : null} />
      </div>

      {/* Inversión breakdown */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Ads</span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{money(cohort.gastoAds)}</span>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Equipo</span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{money(cohort.gastoEquipo)}</span>
        </div>
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', borderRadius: 8, padding: '10px 12px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', fontWeight: 600, display: 'block', marginBottom: 2 }}>Total</span>
          <span style={{ fontSize: 15, fontWeight: 800 }}>{money(cohort.gasto)}</span>
        </div>
      </div>

      {/* Funnel */}
      {cohort.leadsCount > 0 && (
        <div style={{ marginTop: 14 }}>
          {[
            ['Lead nuevo', 'Lead nuevo', 'rgba(45,122,255,0.3)'],
            ['En conversación', 'En conversación', 'rgba(45,122,255,0.45)'],
            ['Cliente potencial', 'Cliente potencial', 'rgba(45,122,255,0.55)'],
            ['Negociando', 'Negociando', 'rgba(45,122,255,0.7)'],
            ['Ganado', 'Ganado', ACCENT],
          ].map(([label, key, color]) => (
            <FunnelBar key={key} label={label} value={cohort.funnelCount[key] || 0} total={cohort.funnelCount['Lead nuevo'] || cohort.leadsCount} color={color} />
          ))}
        </div>
      )}

      {/* Clients table */}
      {cohort.clients.length > 0 && (
        <div style={{ marginTop: 14, background: 'rgba(255,255,255,0.015)', borderRadius: 10, padding: '12px 14px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(255,255,255,0.2)', fontWeight: 700, display: 'block', marginBottom: 8 }}>Clientes cerrados</span>
          {cohort.clients.map((cl, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{cl.name}</span>
              <div style={{ display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 12, color: ACCENT, fontWeight: 700 }}>{money(cl.value)}</span>
                {cl.days > 0 && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{cl.days}d</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sources */}
      {Object.keys(cohort.sourceCounts).length > 0 && (
        <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(cohort.sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([src, cnt]) => (
            <span key={src} style={{ fontSize: 10, padding: '3px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
              {src}: {cnt}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function Overview({ cohorts, allCostos }) {
  const totals = aggregateCohorts(cohorts)
  if (!totals) {
    return <div style={{ color: 'rgba(255,255,255,0.2)', padding: 40, textAlign: 'center', fontSize: 14 }}>Sin datos en el período seleccionado.</div>
  }

  // Chart data: all months from costos (for evolution charts)
  const chartData = allCostos
    .filter(r => r && r[0])
    .map(r => {
      const m = (r[0] + '').slice(0, 7)
      return { key: m, label: m.slice(2).replace('-', '/'), revenue: 0, cac: 0 }
    })

  // Build period label for insights
  const periodLabel = cohorts.length === 1
    ? monthLabel(cohorts[0].month)
    : `${monthLabel(cohorts[0].month)} → ${monthLabel(cohorts[cohorts.length - 1].month)}`

  return (
    <>
      {/* Summary KPIs (only shown when multiple cohorts) */}
      {cohorts.length > 1 && (
        <>
          <Divider title={`Resumen del período — ${cohorts.length} cohortes`} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
            <KPI label="Revenue total" value={money(totals.revenue)} accent={ACCENT} highlight />
            <KPI label="MER promedio" value={totals.mer > 0 ? `${totals.mer.toFixed(1)}x` : '—'} accent={totals.mer >= 3 ? ACCENT : DANGER} />
            <KPI label="Leads totales" value={totals.leadsCount} />
            <KPI label="Cierres totales" value={totals.closuresCount} />
          </div>
        </>
      )}

      {/* Cohort cards */}
      <Divider title={cohorts.length > 1 ? 'Cohortes' : `Cohorte ${monthLabel(cohorts[0].month)}`} />
      {cohorts.map((c, i) => (
        <CohortCard key={c.month} cohort={c} prevCohort={cohorts[i - 1] || null} isLast={i === cohorts.length - 1} />
      ))}

      {/* Insights */}
      <Divider title="Análisis IA" />
      <InsightsBlock cohorts={cohorts} period={periodLabel} />
    </>
  )
}
