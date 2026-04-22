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

function fmt(v) { return v > 0 ? `$${Math.round(v).toLocaleString('en-US')}` : v < 0 ? `-$${Math.round(Math.abs(v)).toLocaleString('en-US')}` : '—' }

const MESES_LABEL = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
function mkLabel(mk) {
  const [y, m] = mk.split('-')
  return `${MESES_LABEL[parseInt(m) - 1]} ${y.slice(2)}`
}

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

function SmallCard({ label, value, color, sub }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)', borderRadius: 12, padding: '12px 14px' }}>
      <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 4 }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: color || 'rgba(26,31,54,0.7)' }}>{value}</span>
      {sub && <span style={{ fontSize: 9, color: 'rgba(26,31,54,0.3)', fontWeight: 600, display: 'block', marginTop: 2 }}>{sub}</span>}
    </div>
  )
}

function ChartCard({ title, data, dataKey, color, prefix }) {
  return (
    <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '14px 18px' }}>
      <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.5)', fontWeight: 700, marginBottom: 6, display: 'block' }}>{title}</span>
      <MiniChart data={data} dataKey={dataKey} color={color} prefix={prefix} height={90} />
    </div>
  )
}

// ── Modelos que cuentan como clientes reales ────────────────────────────────
const MODELOS_CORE = ['boutique', 'agencia', 'consultoría', 'consultoria']

export function FulfillmentModule({ servicios, modelFilter, erUnificado = [], dateRange }) {
  const serviciosData = servicios || []

  // Filas por modelo (no TOTAL, no acumulado)
  const erModelRows = useMemo(() => {
    let rows = erUnificado.filter(r => !r.isAcumulado && !r.isTotal)
    if (modelFilter && modelFilter !== 'todos') {
      rows = rows.filter(r => r.modelo.toLowerCase() === modelFilter.toLowerCase())
    }
    return rows
  }, [erUnificado, modelFilter])

  const monthKeys = useMemo(() => [...new Set(erModelRows.map(r => r.monthKey))].sort(), [erModelRows])

  // Detectar rango multi-mes
  const isMultiMonth = useMemo(() => {
    if (!dateRange?.start || !dateRange?.end) return false
    const sk = `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, '0')}`
    const ek = `${dateRange.end.getFullYear()}-${String(dateRange.end.getMonth() + 1).padStart(2, '0')}`
    return sk !== ek
  }, [dateRange])

  const startKey = useMemo(() => dateRange?.start ? `${dateRange.start.getFullYear()}-${String(dateRange.start.getMonth() + 1).padStart(2, '0')}` : null, [dateRange])
  const endKey = useMemo(() => dateRange?.end ? `${dateRange.end.getFullYear()}-${String(dateRange.end.getMonth() + 1).padStart(2, '0')}` : null, [dateRange])

  const currentMonthKey = useMemo(() => {
    if (endKey && monthKeys.includes(endKey)) return endKey
    return monthKeys[monthKeys.length - 1] || null
  }, [monthKeys, endKey])

  const prevMonthKey = useMemo(() => {
    if (!currentMonthKey) return null
    const idx = monthKeys.indexOf(currentMonthKey)
    return idx > 0 ? monthKeys[idx - 1] : null
  }, [monthKeys, currentMonthKey])

  // Aggregate ER rows for a given month
  const aggMonth = (mk) => {
    if (!mk) return null
    const rows = erModelRows.filter(r => r.monthKey === mk)
    if (!rows.length) return null
    const s = (f) => rows.reduce((a, r) => a + (r[f] || 0), 0)
    const coreRows = modelFilter === 'todos'
      ? rows.filter(r => MODELOS_CORE.includes(r.modelo.toLowerCase()))
      : rows
    const clientesActivos = coreRows.reduce((a, r) => a + (r.clientesActivos || 0), 0)
    const wavg = (f) => clientesActivos > 0 ? coreRows.reduce((a, r) => a + (r[f] || 0) * (r.clientesActivos || 0), 0) / clientesActivos : 0
    return {
      clientesActivos, clientesNuevos: s('clientesNuevos'),
      clientesBajas: s('clientesBajas'), mNuevos: s('mNuevos'), mBajas: s('mBajas'),
      mUpsells: s('mUpsells'), mDownsells: s('mDownsells'), mrrNeto: s('mrrNeto'),
      pctChurn: wavg('pctChurn'), nrr: wavg('nrr'),
      aov: wavg('erAov'), lifeSpan: wavg('erLifeSpan'), ltr: wavg('erLtr'),
    }
  }

  // Para multi-mes: sumar movimientos, usar último mes para estado
  const h = useMemo(() => {
    if (!isMultiMonth) return aggMonth(currentMonthKey)
    const rangeKeys = monthKeys.filter(mk => mk >= startKey && mk <= endKey)
    if (!rangeKeys.length) return null
    const monthly = rangeKeys.map(mk => aggMonth(mk)).filter(Boolean)
    if (!monthly.length) return null
    const lastMonth = monthly[monthly.length - 1]
    const sumField = (f) => monthly.reduce((a, m) => a + (m[f] || 0), 0)
    return {
      // Estado: último mes del rango
      clientesActivos: lastMonth.clientesActivos,
      aov: lastMonth.aov, lifeSpan: lastMonth.lifeSpan, ltr: lastMonth.ltr,
      nrr: lastMonth.nrr, pctChurn: lastMonth.pctChurn,
      // Movimientos: suma del rango
      clientesNuevos: sumField('clientesNuevos'), clientesBajas: sumField('clientesBajas'),
      mNuevos: sumField('mNuevos'), mBajas: sumField('mBajas'),
      mUpsells: sumField('mUpsells'), mDownsells: sumField('mDownsells'),
      mrrNeto: sumField('mrrNeto'),
    }
  }, [erModelRows, currentMonthKey, isMultiMonth, monthKeys, startKey, endKey])

  const hPrev = useMemo(() => aggMonth(prevMonthKey), [erModelRows, prevMonthKey])

  // Últimos 12 meses para charts
  const hist12 = useMemo(() => {
    return monthKeys.slice(-12).map(mk => {
      const agg = aggMonth(mk)
      return { monthKey: mk, label: mkLabel(mk), ...agg }
    }).filter(r => r && (r.clientesActivos > 0 || r.nrr > 0))
  }, [erModelRows, monthKeys])

  const clients = useMemo(() => computeClientTable(serviciosData, modelFilter), [serviciosData, modelFilter])
  const churned = useMemo(() => computeRecentChurn(serviciosData, modelFilter), [serviciosData, modelFilter])
  const kpis = useMemo(() => computeOverviewKPIs(serviciosData, modelFilter), [serviciosData, modelFilter])

  const clientesActivosReales = useMemo(() => {
    if (modelFilter !== 'todos') return kpis.clientesActivos
    const ids = new Set(
      serviciosData
        .filter(s => s.estado.toLowerCase() === 'activo' && MODELOS_CORE.includes(s.tipo.toLowerCase()))
        .map(s => s.idCliente)
    )
    return ids.size
  }, [serviciosData, modelFilter, kpis])

  // ── Cohortes de antigüedad ────────────────────────────────────────────────
  const cohortes = useMemo(() => {
    const active = serviciosData.filter(s =>
      s.estado.toLowerCase() === 'activo' &&
      (modelFilter === 'todos' ? MODELOS_CORE.includes(s.tipo.toLowerCase()) : s.tipo.toLowerCase() === modelFilter.toLowerCase())
    )
    // Agrupar por cliente (tomar max meses)
    const byClient = {}
    for (const s of active) {
      if (!byClient[s.idCliente]) byClient[s.idCliente] = { meses: s.meses, mrr: 0, ltr: s.ltr }
      byClient[s.idCliente].mrr += s.monto
      if (s.meses > byClient[s.idCliente].meses) byClient[s.idCliente].meses = s.meses
      if (s.ltr > byClient[s.idCliente].ltr) byClient[s.idCliente].ltr = s.ltr
    }
    const clientList = Object.values(byClient)
    const bucket = (min, max) => {
      const inRange = clientList.filter(c => c.meses >= min && (max === null || c.meses < max))
      const n = inRange.length
      return {
        n,
        avgMeses: n > 0 ? inRange.reduce((a, c) => a + c.meses, 0) / n : 0,
        avgMrr: n > 0 ? inRange.reduce((a, c) => a + c.mrr, 0) / n : 0,
        avgLtr: n > 0 ? inRange.reduce((a, c) => a + c.ltr, 0) / n : 0,
        totalMrr: inRange.reduce((a, c) => a + c.mrr, 0),
      }
    }
    return [
      { label: '0-6 meses', ...bucket(0, 7) },
      { label: '6-12 meses', ...bucket(7, 13) },
      { label: '12+ meses', ...bucket(13, null) },
    ]
  }, [serviciosData, modelFilter])

  const aov = h?.aov > 0 ? h.aov : 0
  const lifeSpan = h?.lifeSpan > 0 ? h.lifeSpan : 0
  const ltrPromedio = h?.ltr > 0 ? h.ltr : 0

  const [showChart, setShowChart] = useState(null)

  if (!serviciosData.length && !erUnificado.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(26,31,54,0.38)', fontSize: 14 }}>Sin datos.</div>
  }

  const nrrPct = h?.nrr > 0 ? (h.nrr <= 2 ? h.nrr * 100 : h.nrr) : 0
  const nrrColor = nrrPct >= 100 ? GREEN : nrrPct >= 90 ? AMBER : DANGER

  return (
    <>
      {/* ── MÉTRICAS NORTE (destacadas) ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 1fr', gap: 10, marginBottom: 10 }}>
        <NorthCard
          label="Clientes activos" highlight
          value={h?.clientesActivos || clientesActivosReales}
          sub={`${kpis.serviciosActivos} servicios · MRR ${fmt(kpis.mrr)}`}
          delta={hPrev?.clientesActivos ? <Delta current={h?.clientesActivos} previous={hPrev.clientesActivos} /> : null}
        />
        <NorthCard label="AOV" value={aov > 0 ? fmt(aov) : '—'}
          sub="revenue / cliente activo"
          onClick={() => setShowChart(showChart === 'aov' ? null : 'aov')}
          delta={hPrev?.aov > 0 ? <Delta current={aov} previous={hPrev.aov} /> : null}
        />
        <NorthCard label="Life Span" value={lifeSpan > 0 ? `${lifeSpan.toFixed(1)}m` : '—'}
          sub="permanencia promedio"
          onClick={() => setShowChart(showChart === 'lifeSpan' ? null : 'lifeSpan')}
          delta={hPrev?.lifeSpan > 0 ? <Delta current={lifeSpan} previous={hPrev.lifeSpan} /> : null}
        />
        <NorthCard label="LTR" value={ltrPromedio > 0 ? fmt(ltrPromedio) : '—'}
          sub="lifetime revenue promedio"
          onClick={() => setShowChart(showChart === 'ltr' ? null : 'ltr')}
          delta={hPrev?.ltr > 0 ? <Delta current={ltrPromedio} previous={hPrev.ltr} /> : null}
        />
      </div>

      {/* ── EVOLUCIÓN KPI SELECCIONADO (compacto) ──────────────────────── */}
      {showChart && hist12.length > 1 && (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: 12, padding: '14px 18px', marginBottom: 10, maxWidth: 600 }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(26,31,54,0.4)', fontWeight: 700, marginBottom: 4, display: 'block' }}>
            {showChart === 'aov' ? 'AOV' : showChart === 'lifeSpan' ? 'Life Span' : 'LTR'}
          </span>
          <MiniChart
            data={hist12.map(r => ({
              label: r.label,
              value: showChart === 'aov' ? r.aov : showChart === 'lifeSpan' ? r.lifeSpan : r.ltr,
            }))}
            dataKey="value" color={ACCENT}
            prefix={showChart === 'lifeSpan' ? '' : '$'} height={90}
          />
        </div>
      )}

      {/* ── MÉTRICAS OPERATIVAS (secundarias) ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 8 }}>
        <SmallCard label="MRR Neto" value={h?.mrrNeto ? fmt(h.mrrNeto) : '—'} sub={isMultiMonth ? 'acumulado del período' : 'ingresos − pérdidas del mes'} />
        <SmallCard label="NRR" value={nrrPct > 0 ? `${Math.round(nrrPct)}%` : '—'} color={nrrColor} sub="net revenue retention" />
        <SmallCard label="C. Nuevos" value={h?.clientesNuevos > 0 ? `+${h.clientesNuevos}` : '—'} color={GREEN} sub={h?.mNuevos > 0 ? fmt(h.mNuevos) : undefined} />
        <SmallCard label="C. Bajas" value={h?.clientesBajas ? `${Math.abs(h.clientesBajas)}` : '—'} color={h?.clientesBajas ? DANGER : undefined} sub={h?.mBajas ? fmt(Math.abs(h.mBajas)) : undefined} />
        <SmallCard label="Churn rate" value={h?.pctChurn > 0 ? `${(h.pctChurn * 100).toFixed(1)}%` : '—'} color={h?.pctChurn > 0.05 ? DANGER : h?.pctChurn > 0.02 ? AMBER : GREEN} sub="% clientes perdidos" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
        <SmallCard label="$ Nuevos" value={h?.mNuevos > 0 ? fmt(h.mNuevos) : '—'} color={GREEN} />
        <SmallCard label="$ Bajas" value={h?.mBajas ? fmt(Math.abs(h.mBajas)) : '—'} color={h?.mBajas ? DANGER : undefined} />
        <SmallCard label="$ Upsells" value={h?.mUpsells ? fmt(Math.abs(h.mUpsells)) : '—'} color={GREEN} />
        <SmallCard label="$ Downsells" value={h?.mDownsells ? fmt(Math.abs(h.mDownsells)) : '—'} color={h?.mDownsells ? DANGER : undefined} />
      </div>

      {/* ── COHORTES DE ANTIGÜEDAD ─────────────────────────────────────── */}
      <Divider title="Cohortes de antigüedad" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {cohortes.map((c, i) => (
          <div key={i} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(26,31,54,0.7)' }}>{c.label}</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: ACCENT }}>{c.n}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 2 }}>Avg meses</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(26,31,54,0.7)' }}>{c.avgMeses > 0 ? `${c.avgMeses.toFixed(1)}m` : '—'}</span>
              </div>
              <div>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 2 }}>Avg MRR</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(26,31,54,0.7)' }}>{fmt(c.avgMrr)}</span>
              </div>
              <div>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 2 }}>Avg LTR</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(26,31,54,0.7)' }}>{fmt(c.avgLtr)}</span>
              </div>
              <div>
                <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5, color: 'rgba(26,31,54,0.35)', fontWeight: 700, display: 'block', marginBottom: 2 }}>MRR total</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{fmt(c.totalMrr)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── EVOLUCIÓN 12 MESES ─────────────────────────────────────────── */}
      {hist12.length > 1 && (
        <>
          <Divider title="Evolución 12 meses" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <ChartCard title="Clientes activos" data={hist12.map(r => ({ label: r.label, v: r.clientesActivos }))} dataKey="v" color={ACCENT} />
            <ChartCard title="Life Span" data={hist12.map(r => ({ label: r.label, v: r.lifeSpan }))} dataKey="v" color={ACCENT} />
            <ChartCard title="Churn rate" data={hist12.map(r => ({ label: r.label, v: r.pctChurn > 0 ? +(r.pctChurn * 100).toFixed(1) : 0 }))} dataKey="v" color={DANGER} prefix="" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            <ChartCard title="AOV" data={hist12.map(r => ({ label: r.label, v: r.aov }))} dataKey="v" color={ACCENT} prefix="$" />
            <ChartCard title="LTR" data={hist12.map(r => ({ label: r.label, v: r.ltr }))} dataKey="v" color={GREEN} prefix="$" />
            <ChartCard title="MRR Neto" data={hist12.map(r => ({ label: r.label, v: r.mrrNeto }))} dataKey="v" color={ACCENT} prefix="$" />
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
