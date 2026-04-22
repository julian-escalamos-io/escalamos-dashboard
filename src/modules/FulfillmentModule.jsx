import { useMemo, useState } from 'react'
import { Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import {
  computeClientTable, computeRecentChurn, computeOverviewKPIs,
} from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'
const AMBER = '#F59E0B'

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v) { return v ? `${(v * 100).toFixed(1)}%` : '—' }

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(0,0,0,0.08)' }} />
  </div>
)

const ModelBadge = ({ tipo }) => {
  const colors = { Boutique: '#A78BFA', Agencia: '#2D7AFF', Soft: '#34D399', Financiera: '#FBBF24' }
  const color = colors[tipo] || 'rgba(26,31,54,0.3)'
  return <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: `${color}18`, color, fontWeight: 700 }}>{tipo || '—'}</span>
}

function NorthCard({ label, value, sub, color, highlight, delta, onClick }) {
  return (
    <div onClick={onClick} style={{
      borderRadius: 16, padding: '18px 20px',
      background: highlight ? 'linear-gradient(135deg, #1e3fa3 0%, #2D7AFF 100%)' : '#FFFFFF',
      border: highlight ? '1px solid rgba(45,122,255,0.3)' : '1px solid rgba(0,0,0,0.07)',
      boxShadow: highlight ? '0 4px 20px rgba(45,122,255,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden',
      cursor: onClick ? 'pointer' : 'default',
    }}>
      {highlight && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />}
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.6)' : 'rgba(26,31,54,0.42)' }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: highlight ? '#fff' : (color || '#1a1f36') }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: highlight ? 'rgba(255,255,255,0.5)' : 'rgba(26,31,54,0.38)', fontWeight: 600 }}>{sub}</span>}
      {delta}
    </div>
  )
}

export function FulfillmentModule({ servicios, modelFilter, erUnificado = [], dateRange }) {
  const serviciosData = servicios || []

  // Filas del ER filtradas por modelo (sin acumulado, sin TOTAL si hay filtro de modelo)
  const erTotalRows = useMemo(() => {
    let rows = erUnificado.filter(r => !r.isAcumulado)
    if (modelFilter && modelFilter !== 'todos') {
      rows = rows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
    } else {
      rows = rows.filter(r => r.isTotal)
    }
    return rows
  }, [erUnificado, modelFilter])

  // Meses disponibles
  const monthKeys = useMemo(() => [...new Set(erTotalRows.map(r => r.monthKey))].sort(), [erTotalRows])

  // Mes seleccionado derivado del filtro de fechas
  const currentMonthKey = useMemo(() => {
    if (dateRange?.end) {
      const endKey = `${dateRange.end.getFullYear()}-${String(dateRange.end.getMonth() + 1).padStart(2, '0')}`
      if (monthKeys.includes(endKey)) return endKey
    }
    return monthKeys[monthKeys.length - 1] || null
  }, [monthKeys, dateRange])

  const prevMonthKey = useMemo(() => {
    if (!currentMonthKey) return null
    const idx = monthKeys.indexOf(currentMonthKey)
    return idx > 0 ? monthKeys[idx - 1] : null
  }, [monthKeys, currentMonthKey])

  // Aggregate ER rows for a given month
  const aggMonth = (mk) => {
    if (!mk) return null
    const rows = erTotalRows.filter(r => r.monthKey === mk)
    if (!rows.length) return null
    const s = (f) => rows.reduce((a, r) => a + (r[f] || 0), 0)
    const avg = (f) => rows.length ? s(f) / rows.length : 0
    return {
      clientesActivos: s('clientesActivos'), clientesNuevos: s('clientesNuevos'),
      clientesBajas: s('clientesBajas'), mNuevos: s('mNuevos'), mBajas: s('mBajas'),
      mUpsells: s('mUpsells'), mDownsells: s('mDownsells'), mrrNeto: s('mrrNeto'),
      pctChurn: avg('pctChurn'), nrr: avg('nrr'),
    }
  }

  const h = useMemo(() => aggMonth(currentMonthKey), [erTotalRows, currentMonthKey])
  const hPrev = useMemo(() => aggMonth(prevMonthKey), [erTotalRows, prevMonthKey])

  // Últimos 12 meses para charts
  const hist12 = useMemo(() => {
    return monthKeys.slice(-12).map(mk => {
      const agg = aggMonth(mk)
      return { monthKey: mk, label: mk, ...agg }
    }).filter(r => r && (r.clientesActivos > 0 || r.nrr > 0))
  }, [erTotalRows, monthKeys])

  const clients = useMemo(() => computeClientTable(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churned = useMemo(() => computeRecentChurn(serviciosData, modelFilter), [serviciosData, modelFilter])
  const kpis = useMemo(() => computeOverviewKPIs(serviciosData, modelFilter), [serviciosData, modelFilter])

  const aov = kpis.aov > 0 ? kpis.aov : 0
  const lifeSpan = kpis.permanencia > 0 ? kpis.permanencia : 0
  const ltrPromedio = kpis.ltvPromedio > 0 ? kpis.ltvPromedio : 0

  const [showChart, setShowChart] = useState(null)

  if (!serviciosData.length && !erUnificado.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos.</div>
  }

  const nrrColor = h?.nrr >= 100 ? GREEN : h?.nrr >= 90 ? AMBER : DANGER

  return (
    <>
      {/* ── MÉTRICAS NORTE (destacadas) ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <NorthCard
          label="Clientes activos" highlight
          value={kpis.clientesActivos || h?.clientesActivos || clients.length}
          sub={`${kpis.serviciosActivos} servicios · MRR ${fmt(kpis.mrr)}`}
          delta={hPrev ? <Delta current={h?.clientesActivos} previous={hPrev?.clientesActivos} /> : null}
        />
        <NorthCard label="AOV" value={aov > 0 ? fmt(aov) : '—'}
          sub="MRR / cliente activo"
          onClick={() => setShowChart(showChart === 'aov' ? null : 'aov')}
          delta={hPrev?.clientesActivos > 0 ? <Delta current={aov} previous={kpis.aov} /> : null}
        />
        <NorthCard label="Life Span" value={lifeSpan > 0 ? `${lifeSpan.toFixed(1)}m` : '—'}
          sub="permanencia promedio"
          onClick={() => setShowChart(showChart === 'lifeSpan' ? null : 'lifeSpan')}
        />
        <NorthCard label="LTR" value={ltrPromedio > 0 ? fmt(ltrPromedio) : '—'}
          sub="lifetime revenue promedio"
          onClick={() => setShowChart(showChart === 'ltr' ? null : 'ltr')}
        />
      </div>

      {/* ── EVOLUCIÓN KPI SELECCIONADO ──────────────────────────────────── */}
      {showChart && hist12.length <= 1 && (
        <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 13 }}>
          Sin datos suficientes para evolución.
        </div>
      )}
      {showChart && hist12.length > 1 && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>
            Evolución — {showChart === 'aov' ? 'AOV' : showChart === 'lifeSpan' ? 'Life Span' : 'LTR'}
          </span>
          <MiniChart
            data={hist12.map(r => ({
              label: r.label,
              value: showChart === 'aov' ? (r.clientesActivos > 0 ? (r.mrrNeto || 0) / r.clientesActivos : 0) : 0,
            }))}
            dataKey="value"
            color={ACCENT}
            prefix="$"
            height={140}
          />
        </div>
      )}

      {/* ── MÉTRICAS OPERATIVAS (secundarias — más sutiles) ──────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
        {[
          { label: 'MRR Neto', value: h?.mrrNeto ? fmt(h.mrrNeto) : '—', sub: 'ingresos + pérdidas' },
          { label: 'NRR', value: h?.nrr > 0 ? `${Math.round(h.nrr)}%` : '—', color: nrrColor },
          { label: 'C. Nuevos', value: h?.clientesNuevos > 0 ? `+${h.clientesNuevos}` : '—', color: GREEN, sub: h?.mNuevos > 0 ? fmt(h.mNuevos) : undefined },
          { label: 'C. Bajas', value: h?.clientesBajas > 0 ? `${h.clientesBajas}` : '—', color: h?.clientesBajas > 0 ? DANGER : undefined, sub: h?.mBajas > 0 ? fmt(h.mBajas) : undefined },
          { label: 'Churn rate', value: h?.pctChurn > 0 ? `${(h.pctChurn * 100).toFixed(1)}%` : '—', color: h?.pctChurn > 0.05 ? DANGER : h?.pctChurn > 0.02 ? AMBER : GREEN },
        ].map((m, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 12, padding: '12px 14px' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 4 }}>{m.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: m.color || 'rgba(26,31,54,0.7)' }}>{m.value}</span>
            {m.sub && <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.3)', fontWeight: 600, display: 'block', marginTop: 2 }}>{m.sub}</span>}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { label: '$ Nuevos', value: h?.mNuevos > 0 ? fmt(h.mNuevos) : '—', color: GREEN },
          { label: '$ Bajas', value: h?.mBajas > 0 ? fmt(h.mBajas) : '—', color: h?.mBajas > 0 ? DANGER : undefined },
          { label: '$ Upsells', value: h?.mUpsells > 0 ? fmt(h.mUpsells) : '—', color: GREEN },
          { label: '$ Downsells', value: h?.mDownsells > 0 ? fmt(h.mDownsells) : '—', color: h?.mDownsells > 0 ? AMBER : undefined },
        ].map((m, i) => (
          <div key={i} style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 12, padding: '12px 14px' }}>
            <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 4 }}>{m.label}</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: m.color || 'rgba(26,31,54,0.7)' }}>{m.value}</span>
          </div>
        ))}
      </div>

      {/* ── EVOLUCIÓN 12 MESES ─────────────────────────────────────────── */}
      {hist12.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Clientes activos</span>
              <MiniChart data={hist12.map(r => ({ label: r.label, clientes: r.clientesActivos }))} dataKey="clientes" color={ACCENT} />
            </div>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 8, display: 'block' }}>NRR</span>
              <MiniChart data={hist12.map(r => ({ label: r.label, nrr: r.nrr }))} dataKey="nrr" color={GREEN} />
            </div>
          </div>
        </>
      )}

      {/* ── CLIENTES ACTIVOS ───────────────────────────────────────────── */}
      <Divider title={`Clientes activos${modelFilter !== 'todos' ? ` — ${modelFilter}` : ''}`} />
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={clients}
          columns={[
            { key: 'nombre', label: 'Cliente' },
            { key: 'tipo', label: 'Modelo', render: v => <ModelBadge tipo={v} /> },
            { key: 'servicios', label: 'Servicios', render: v => (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', maxWidth: 280 }}>
                {(v || []).slice(0, 4).map((s, i) => (
                  <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: 'rgba(0,0,0,0.05)', color: 'rgba(26,31,54,0.6)', fontWeight: 600 }}>{s}</span>
                ))}
                {v && v.length > 4 && <span style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', fontWeight: 600 }}>+{v.length - 4}</span>}
              </div>
            )},
            { key: 'mrr', label: 'MRR', align: 'right', render: v => <span style={{ color: ACCENT, fontWeight: 700 }}>{fmt(v)}</span> },
            { key: 'meses', label: 'Meses', align: 'right', render: v => v > 0 ? `${v}m` : '—' },
            { key: 'ltr', label: 'LTR', align: 'right', render: v => fmt(v) },
          ]}
          emptyText="Sin clientes activos"
        />
      </div>

      {/* ── CHURN RECIENTE ─────────────────────────────────────────────── */}
      {churned.length > 0 && (
        <>
          <Divider title="Churn reciente (últimos 3 meses)" />
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
            <DataTable
              rows={churned}
              columns={[
                { key: 'nombre', label: 'Cliente' },
                { key: 'tipo', label: 'Modelo', render: v => <ModelBadge tipo={v} /> },
                { key: 'meses', label: 'Duración', align: 'right', render: v => v > 0 ? `${v}m` : '—' },
                { key: 'ltr', label: 'LTR', align: 'right', render: v => fmt(v) },
                { key: 'fechaBaja', label: 'Baja', render: v => v?.slice(0, 7) || '—' },
              ]}
              emptyText="Sin bajas recientes"
            />
          </div>
        </>
      )}
    </>
  )
}
