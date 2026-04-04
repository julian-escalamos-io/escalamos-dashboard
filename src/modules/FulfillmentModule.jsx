import { useMemo } from 'react'
import { Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import {
  computeClientTable, computeRecentChurn, aggregateHistorico,
} from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#E03E3E'
const GREEN = '#059669'
const AMBER = '#F59E0B'

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v) { return v ? `${(v * 100).toFixed(1)}%` : '—' }
function fmtN(v) { return v > 0 ? `${v}` : '—' }

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

// ─── Stat box pequeño ─────────────────────────────────────────────────────────
function Stat({ label, value, color, sub }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.8, color: 'rgba(26,31,54,0.38)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 800, color: color || 'rgba(26,31,54,0.75)', letterSpacing: -0.3 }}>{value}</span>
      {sub && <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.35)', fontWeight: 600 }}>{sub}</span>}
    </div>
  )
}

// ─── North star card ──────────────────────────────────────────────────────────
function NorthCard({ label, value, sub, color, highlight, delta }) {
  return (
    <div style={{
      borderRadius: 16, padding: '18px 20px',
      background: highlight ? 'linear-gradient(135deg, #1e3fa3 0%, #2D7AFF 100%)' : '#FFFFFF',
      border: highlight ? '1px solid rgba(45,122,255,0.3)' : '1px solid rgba(0,0,0,0.07)',
      boxShadow: highlight ? '0 4px 20px rgba(45,122,255,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden',
    }}>
      {highlight && <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />}
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2.5, fontWeight: 700, color: highlight ? 'rgba(255,255,255,0.6)' : 'rgba(26,31,54,0.42)' }}>{label}</span>
      <span style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, lineHeight: 1, color: highlight ? '#fff' : (color || '#1a1f36') }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: highlight ? 'rgba(255,255,255,0.5)' : 'rgba(26,31,54,0.38)', fontWeight: 600 }}>{sub}</span>}
      {delta}
    </div>
  )
}

export function FulfillmentModule({ servicios, modelFilter, historico = [], selectedERMonth }) {
  const serviciosData = servicios || []

  // Último mes disponible en histórico (o el selectedERMonth)
  const monthKeys = useMemo(() => [...new Set(historico.map(r => r.monthKey))].sort(), [historico])
  const currentMonthKey = useMemo(() => {
    if (selectedERMonth && monthKeys.includes(selectedERMonth)) return selectedERMonth
    return monthKeys[monthKeys.length - 1] || null
  }, [monthKeys, selectedERMonth])

  const prevMonthKey = useMemo(() => {
    if (!currentMonthKey) return null
    const idx = monthKeys.indexOf(currentMonthKey)
    return idx > 0 ? monthKeys[idx - 1] : null
  }, [monthKeys, currentMonthKey])

  const h = useMemo(() => currentMonthKey ? aggregateHistorico(historico, currentMonthKey, modelFilter) : null, [historico, currentMonthKey, modelFilter])
  const hPrev = useMemo(() => prevMonthKey ? aggregateHistorico(historico, prevMonthKey, modelFilter) : null, [historico, prevMonthKey, modelFilter])

  // Histórico 12m para charts
  const hist12 = useMemo(() => {
    const keys = monthKeys.slice(-12)
    return keys.map(mk => {
      const agg = aggregateHistorico(historico, mk, modelFilter)
      return { monthKey: mk, label: mk, ...agg }
    }).filter(r => r.clientesActivos > 0 || r.nrr > 0)
  }, [historico, monthKeys, modelFilter])

  const clients = useMemo(() => computeClientTable(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churned = useMemo(() => computeRecentChurn(serviciosData, modelFilter), [serviciosData, modelFilter])

  if (!serviciosData.length && !historico.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos del Registro Maestro.</div>
  }

  // NRR color
  const nrrColor = h?.nrr >= 100 ? GREEN : h?.nrr >= 90 ? AMBER : DANGER

  return (
    <>
      {/* ── MÉTRICAS NORTE ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
        <NorthCard
          label="Clientes activos" highlight
          value={h?.clientesActivos ?? clients.length}
          sub={`${h?.cNuevos > 0 ? `+${h.cNuevos} nuevos` : ''}${h?.cNuevos > 0 && h?.cPerdidos > 0 ? ' · ' : ''}${h?.cPerdidos > 0 ? `−${h.cPerdidos} bajas` : ''}`}
          delta={hPrev ? <Delta current={h?.clientesActivos} previous={hPrev?.clientesActivos} /> : null}
        />
        <NorthCard label="AOV" value={h?.aov > 0 ? fmt(h.aov) : '—'}
          sub="MRR / cliente activo"
          delta={hPrev ? <Delta current={h?.aov} previous={hPrev?.aov} /> : null}
        />
        <NorthCard label="Life Span" value={h?.lifeSpan > 0 ? `${h.lifeSpan.toFixed(1)}m` : '—'}
          sub="permanencia promedio"
          delta={hPrev ? <Delta current={h?.lifeSpan} previous={hPrev?.lifeSpan} /> : null}
        />
        <NorthCard label="NRR" value={h?.nrr > 0 ? `${Math.round(h.nrr)}` : '—'}
          color={nrrColor} sub="Net Revenue Retention"
          delta={hPrev ? <Delta current={h?.nrr} previous={hPrev?.nrr} /> : null}
        />
        <NorthCard label="LTGP" value={h?.ltgp > 0 ? fmt(h.ltgp) : '—'}
          sub={h?.ltgpActual > 0 ? `actual ${fmt(h.ltgpActual)}` : undefined}
          delta={hPrev ? <Delta current={h?.ltgp} previous={hPrev?.ltgp} /> : null}
        />
      </div>

      {/* ── MOVIMIENTO DEL MES ─────────────────────────────────────────────── */}
      {h && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            {/* Entradas */}
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN }} />
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>Entradas</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                <Stat label="C. Nuevos" value={fmtN(h.cNuevos)} color={GREEN} sub={fmt(h.mNuevos)} />
                <Stat label="Upsells" value={fmtN(h.upsells)} color={GREEN} sub={fmt(h.mUpsells)} />
                <Stat label="$ Nuevos" value={fmt(h.mNuevos)} color={GREEN} />
                <Stat label="$ Upsells" value={fmt(h.mUpsells)} color={GREEN} />
              </div>
            </div>
            {/* Salidas */}
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '18px 22px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: DANGER }} />
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700 }}>Salidas</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                <Stat label="C. Perdidos" value={fmtN(h.cPerdidos)} color={h.cPerdidos > 0 ? DANGER : 'rgba(26,31,54,0.5)'} sub={fmt(h.mPerdidos)} />
                <Stat label="Downsells" value={fmtN(h.downsells)} color={h.downsells > 0 ? AMBER : 'rgba(26,31,54,0.5)'} sub={fmt(h.mDownsells)} />
                <Stat label="$ Perdidos" value={fmt(h.mPerdidos)} color={h.mPerdidos > 0 ? DANGER : 'rgba(26,31,54,0.5)'} />
                <Stat label="$ Downsells" value={fmt(h.mDownsells)} color={h.mDownsells > 0 ? AMBER : 'rgba(26,31,54,0.5)'} />
              </div>
            </div>
          </div>

          {/* Churn & Retention */}
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 16, padding: '18px 22px', marginBottom: 24 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(26,31,54,0.5)', fontWeight: 700, display: 'block', marginBottom: 18 }}>Churn &amp; Retention</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 20 }}>
              <Stat label="% Churn Tri" value={fmtPct(h.pctChurnTri)} color={h.pctChurnTri > 0.05 ? DANGER : h.pctChurnTri > 0.02 ? AMBER : GREEN} />
              <Stat label="% Churn A" value={fmtPct(h.pctChurnA)} color={h.pctChurnA > 0.15 ? DANGER : h.pctChurnA > 0.08 ? AMBER : GREEN} />
              <Stat label="% MRR Neto" value={fmtPct(h.pctMRRNeto)} color={h.pctMRRNeto > 0 ? GREEN : DANGER} />
              <Stat label="NRR" value={h.nrr > 0 ? `${Math.round(h.nrr)}` : '—'} color={nrrColor} />
              <Stat label="Life Retention" value={h.lifeRetention > 0 ? `${h.lifeRetention.toFixed(1)}m` : '—'} />
              <Stat label="Life Span" value={h.lifeSpan > 0 ? `${h.lifeSpan.toFixed(1)}m` : '—'} />
            </div>
          </div>
        </>
      )}

      {/* ── EVOLUCIÓN 12 MESES ─────────────────────────────────────────────── */}
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

      {/* ── CLIENTES ACTIVOS ───────────────────────────────────────────────── */}
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

      {/* ── CHURN RECIENTE ─────────────────────────────────────────────────── */}
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
