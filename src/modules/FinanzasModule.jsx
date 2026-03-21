import { useState, useMemo } from 'react'
import { KPI, Delta } from '../components/KPI.jsx'
import { MiniChart } from '../components/MiniChart.jsx'
import { DataTable } from '../components/DataTable.jsx'
import { computeEgresosBreakdown } from '../lib/maestro.js'

const ACCENT = '#2D7AFF'
const DANGER = '#FF6B6B'
const GREEN = '#34D399'
const ACCENT_DIM = 'rgba(45,122,255,0.12)'
const ACCENT_BORDER = 'rgba(45,122,255,0.28)'

const SUB_TABS = [['pl', 'P&L'], ['egresos', 'Egresos']]

function fmt(v) { return (v !== undefined && v !== null && v !== 0) ? `$${Math.round(v).toLocaleString('en-US')}` : '—' }
function fmtPct(v) { return v ? `${(v * 100).toFixed(1)}%` : '—' }

const Divider = ({ title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '28px 0 16px' }}>
    <div style={{ width: 3, height: 14, background: ACCENT, borderRadius: 2 }} />
    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2.5, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>{title}</span>
    <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
  </div>
)

function InsightsBlock({ currentER, prevER }) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState(null)
  const [error, setError] = useState(null)

  async function generate() {
    setLoading(true); setError(null)
    try {
      const resp = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'finanzas',
          data: { current: currentER, prev: prevER },
          period: currentER?.monthLabel,
        }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      const data = await resp.json()
      setInsights(data)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: insights ? 16 : 0 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>Análisis financiero</span>
        {!insights && <button onClick={generate} disabled={loading} style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${ACCENT}`, background: 'rgba(45,122,255,0.12)', color: ACCENT, fontSize: 11, fontWeight: 700, fontFamily: 'Montserrat', cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? '✦ Analizando...' : '✦ Generar análisis'}
        </button>}
        {insights && <button onClick={() => setInsights(null)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.07)', background: 'transparent', color: 'rgba(255,255,255,0.4)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat' }}>↺ regenerar</button>}
      </div>
      {error && <p style={{ color: DANGER, fontSize: 12, marginTop: 12 }}>Error: {error}</p>}
      {!insights && !loading && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 12 }}>Claude analiza margen vs objetivo, deudas, gastos y proyección del mes.</p>}
      {insights && (
        <>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, margin: '0 0 16px', fontWeight: 500 }}>{insights.conclusion}</p>
          <div style={{ background: 'rgba(45,122,255,0.05)', border: '1px solid rgba(45,122,255,0.12)', borderRadius: 10, padding: '14px 18px', marginBottom: 16 }}>
            <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: ACCENT, fontWeight: 700, display: 'block', marginBottom: 6 }}>Cuello de botella</span>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>{insights.bottleneck}</p>
          </div>
          {(insights.actions || []).map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: ACCENT, minWidth: 20 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, fontWeight: 500 }}>{a}</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

const MODELO_ORDER = { todos: 0, Todos: 0, boutique: 1, Boutique: 1, agencia: 2, Agencia: 2, soft: 3, Soft: 3, financiera: 4, Financiera: 4 }
const MODELOS = ['Todos', 'Boutique', 'Agencia', 'Soft', 'Financiera']

const MODELO_COLORS = {
  Todos:      { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', border: 'rgba(255,255,255,0.12)' },
  Boutique:   { bg: 'rgba(245,158,11,0.15)',  color: '#F59E0B',               border: 'rgba(245,158,11,0.3)'  },
  Agencia:    { bg: 'rgba(59,130,246,0.15)',  color: '#60A5FA',               border: 'rgba(59,130,246,0.3)'  },
  Soft:       { bg: 'rgba(15,15,15,0.6)',     color: 'rgba(255,255,255,0.45)', border: 'rgba(255,255,255,0.1)' },
  Financiera: { bg: 'rgba(16,185,129,0.15)',  color: '#34D399',               border: 'rgba(16,185,129,0.3)'  },
}

function ModeloBadge({ value }) {
  const c = MODELO_COLORS[value] || MODELO_COLORS.Todos
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
    }}>{value || '—'}</span>
  )
}

function modeloRank(m) {
  return MODELO_ORDER[m] ?? 99
}

const RECURRENCIA_ORDER = { Mensual: 0, Trimestral: 1, Semestral: 2, Anual: 3 }

// Gastos negativos en el sheet → ordenar por valor más negativo primero (mayor gasto)
function egresoMes(e) { return e.montoPorMes || e.monto || 0 }

function sortEgresos(rows) {
  return [...rows].sort((a, b) => {
    const mo = modeloRank(a.modelo) - modeloRank(b.modelo)
    if (mo !== 0) return mo
    const ro = (RECURRENCIA_ORDER[a.recurrencia] ?? 99) - (RECURRENCIA_ORDER[b.recurrencia] ?? 99)
    if (ro !== 0) return ro
    // valores negativos: el más negativo (mayor gasto) va primero → orden ascendente
    const mo2 = egresoMes(a) - egresoMes(b)
    if (mo2 !== 0) return mo2
    return String(a.area || '').localeCompare(String(b.area || ''))
  })
}

// Fila colapsable que muestra el ponderado de gastos "Todos" para una unidad
function PonderadoRow({ items, share, totalColor }) {
  const [open, setOpen] = useState(false)
  const total = items.reduce((s, e) => s + egresoMes(e), 0) * share
  const pct = Math.round(share * 100)

  return (
    <div style={{ marginBottom: 6 }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px',
          background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: open ? '10px 10px 0 0' : 10, cursor: 'pointer', userSelect: 'none',
        }}
      >
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', width: 12 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
          Todos ponderado <span style={{ opacity: 0.5, fontSize: 11 }}>({pct}% del MRR)</span>
        </span>
        <span style={{ marginLeft: 'auto', color: totalColor, fontWeight: 700, fontSize: 13 }}>{fmt(total)}/mes</span>
      </div>
      {open && (
        <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
          {sortEgresos(items).map((e, i) => {
            const weighted = egresoMes(e) * share
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 14px',
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
              }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, width: 70, flexShrink: 0 }}>{e.recurrencia}</span>
                <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.proveedor}</span>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.servicio}</span>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, marginLeft: 8, whiteSpace: 'nowrap' }}>{fmt(egresoMes(e))} × {pct}%</span>
                <span style={{ color: totalColor, fontSize: 12, fontWeight: 700, width: 65, textAlign: 'right', flexShrink: 0 }}>{fmt(weighted)}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EgresosTable({ rows, todosPonderado, share, totalLabel, totalColor }) {
  const totalMes = rows.reduce((s, e) => s + egresoMes(e), 0)
  const todosTotal = todosPonderado ? todosPonderado.reduce((s, e) => s + egresoMes(e), 0) * share : 0

  const cols = [
    { key: 'modelo',      label: 'Modelo',      width: 100, render: v => <ModeloBadge value={v} /> },
    { key: 'recurrencia', label: 'Recurrencia',  width: 88,  render: v => <span style={{ color: 'rgba(255,255,255,0.4)' }}>{v || '—'}</span> },
    { key: 'proveedor',   label: 'Proveedor',    width: 140 },
    { key: 'servicio',    label: 'Servicio',     width: 220, wrap: true },
    { key: 'area',        label: 'Área',         width: 75,  render: v => <span style={{ color: 'rgba(255,255,255,0.4)' }}>{v || '—'}</span> },
    { key: '_total',      label: 'Total',        width: 72,  align: 'right', render: (_, row) => (
      <span style={{ color: 'rgba(255,255,255,0.28)', fontWeight: 500 }}>{row.monto ? fmt(row.monto) : '—'}</span>
    )},
    { key: '_mes', label: '$ / mes', width: 72, align: 'right', render: (_, row) => (
      <span style={{ color: totalColor, fontWeight: 700 }}>{fmt(egresoMes(row))}</span>
    )},
  ]

  return (
    <div style={{ marginBottom: 10 }}>
      {todosPonderado && todosPonderado.length > 0 && (
        <PonderadoRow items={todosPonderado} share={share} totalColor={totalColor} />
      )}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, overflow: 'hidden' }}>
        <DataTable rows={sortEgresos(rows)} columns={cols} compact />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, padding: '7px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
          {todosTotal !== 0 && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
              Propios: <strong style={{ color: totalColor }}>{fmt(totalMes)}/mes</strong>
            </span>
          )}
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
            {totalLabel}: <strong style={{ color: totalColor }}>{fmt(totalMes + todosTotal)}/mes</strong>
          </span>
        </div>
      </div>
    </div>
  )
}

function EgresosTab({ egresos, modelFilter, servicios }) {
  // MRR por unidad para calcular ponderado
  const mrrByUnit = useMemo(() => {
    const active = (servicios || []).filter(s => s.estado?.toLowerCase() === 'activo')
    const result = { Boutique: 0, Agencia: 0, Soft: 0, Financiera: 0, total: 0 }
    for (const s of active) {
      const tipo = s.tipo
      if (result[tipo] !== undefined) result[tipo] += s.monto
      result.total += s.monto
    }
    return result
  }, [servicios])

  const shareOf = (unit) => mrrByUnit.total > 0 ? mrrByUnit[unit] / mrrByUnit.total : 0

  const todosItems  = egresos.filter(e => e.modelo?.toLowerCase() === 'todos')
  const isUnit = modelFilter && modelFilter !== 'todos'
  const unitItems   = isUnit ? egresos.filter(e => e.modelo?.toLowerCase() === modelFilter.toLowerCase()) : []

  // En vista "todos" mostramos todos los gastos; en unidad, solo los propios (el ponderado se agrega aparte)
  const displayItems = isUnit ? unitItems : egresos

  const fijos    = displayItems.filter(e => e.tipoGasto?.toLowerCase().includes('fijo'))
  const variables = displayItems.filter(e => !e.tipoGasto?.toLowerCase().includes('fijo'))

  const todosFijos    = isUnit ? todosItems.filter(e => e.tipoGasto?.toLowerCase().includes('fijo'))    : []
  const todosVariables = isUnit ? todosItems.filter(e => !e.tipoGasto?.toLowerCase().includes('fijo')) : []

  const share = isUnit ? shareOf(modelFilter) : 0

  const totalFijos     = fijos.reduce((s, e) => s + egresoMes(e), 0)     + todosFijos.reduce((s, e) => s + egresoMes(e), 0)     * share
  const totalVariables = variables.reduce((s, e) => s + egresoMes(e), 0) + todosVariables.reduce((s, e) => s + egresoMes(e), 0) * share
  const total = totalFijos + totalVariables

  return (
    <>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20, maxWidth: 660 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Gastos fijos / mes</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: DANGER }}>{fmt(totalFijos)}</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Gastos variables / mes</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#FBBF24' }}>{fmt(totalVariables)}</span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px 18px' }}>
          <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.35)', fontWeight: 700, display: 'block', marginBottom: 4 }}>Total / mes</span>
          <span style={{ fontSize: 22, fontWeight: 700 }}>{fmt(total)}</span>
        </div>
      </div>

      {/* Fijos */}
      {(fijos.length > 0 || todosFijos.length > 0) && (
        <>
          <Divider title={`Gastos fijos — ${fmt(totalFijos)}/mes`} />
          <EgresosTable rows={fijos} todosPonderado={todosFijos} share={share} totalLabel="Total fijos" totalColor={DANGER} />
        </>
      )}

      {/* Variables */}
      {(variables.length > 0 || todosVariables.length > 0) && (
        <>
          <Divider title={`Gastos variables — ${fmt(totalVariables)}/mes`} />
          <EgresosTable rows={variables} todosPonderado={todosVariables} share={share} totalLabel="Total variables" totalColor="#FBBF24" />
        </>
      )}
    </>
  )
}

export function FinanzasModule({ er, egresos, servicios, selectedERMonth, modelFilter = 'todos', subTab = 'pl', onSubTabChange }) {
  const setSubTab = onSubTabChange || (() => {})
  const erRows = er || []
  const egresosData = egresos || []

  const currentER = useMemo(() => {
    if (!erRows.length) return null
    if (selectedERMonth) return erRows.find(r => r.monthKey === selectedERMonth) || erRows[erRows.length - 1]
    return erRows[erRows.length - 1]
  }, [erRows, selectedERMonth])

  const prevER = useMemo(() => {
    if (!currentER || !erRows.length) return null
    const idx = erRows.findIndex(r => r.monthKey === currentER.monthKey)
    return idx > 0 ? erRows[idx - 1] : null
  }, [erRows, currentER])

  const egresosBreakdown = useMemo(() => computeEgresosBreakdown(egresosData), [egresosData])
  const totalEgresosMes = useMemo(() => egresosData.reduce((s, e) => s + (e.montoPorMes > 0 ? e.montoPorMes : e.monto), 0), [egresosData])

  const chart12 = erRows.slice(-12)

  if (!erRows.length && !egresosData.length) {
    return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Sin datos del Registro Maestro.</div>
  }

  return (
    <>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {SUB_TABS.map(([k, l]) => (
          <button key={k} onClick={() => setSubTab(k)} style={{
            background: subTab === k ? ACCENT_DIM : 'transparent',
            border: subTab === k ? `1px solid ${ACCENT_BORDER}` : '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8, padding: '8px 16px',
            color: subTab === k ? ACCENT : 'rgba(255,255,255,0.3)',
            fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: "'Montserrat'", transition: 'all 0.15s',
          }}>{l}</button>
        ))}
      </div>

      {subTab === 'egresos' && <EgresosTab egresos={egresosData} modelFilter={modelFilter} servicios={servicios} />}
      {subTab !== 'egresos' && <>

      {/* Period indicator */}
      {currentER && (
        <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>{currentER.monthLabel}</span>
          {currentER.proyectada > 0 && (
            <span style={{ fontSize: 10, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>
              Proyectada {fmt(currentER.proyectada)} · {currentER.acierto || '—'}
            </span>
          )}
        </div>
      )}

      {/* KPIs principales */}
      {currentER && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 10, maxWidth: 1100 }}>
          <KPI label="Revenue" value={fmt(currentER.revenue)} accent={ACCENT} highlight fontWeight={600}
            delta={prevER ? <Delta current={currentER.revenue} previous={prevER.revenue} /> : null} />
          <KPI label="Cash Collected" value={fmt(currentER.cashCollected)}
            delta={prevER ? <Delta current={currentER.cashCollected} previous={prevER.cashCollected} /> : null} />
          <KPI label="Gastos" value={fmt(currentER.gastos)}
            delta={prevER ? <Delta current={currentER.gastos} previous={prevER.gastos} inverse /> : null} />
          <KPI label="Ganancia" value={fmt(currentER.ganancia)}
            accent={currentER.ganancia > 0 ? GREEN : DANGER}
            delta={prevER ? <Delta current={currentER.ganancia} previous={prevER.ganancia} /> : null} />
          <KPI label="Margen neto" value={fmtPct(currentER.margenNeto)}
            subtitle="ganancia / revenue"
            accent={currentER.margenNeto > 0.3 ? ACCENT : currentER.margenNeto > 0.15 ? undefined : DANGER}
            delta={prevER ? <Delta current={currentER.margenNeto} previous={prevER.margenNeto} /> : null} />
        </div>
      )}

      {/* P&L 12 meses */}
      <Divider title="P&L mensual — últimos 12 meses" />
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20, marginBottom: 10 }}>
        <DataTable
          rows={[...erRows].reverse().slice(0, 12).reverse()}
          columns={[
            { key: 'monthLabel', label: 'Período', sortable: false },
            { key: 'revenue', label: 'Revenue', align: 'right', render: v => fmt(v) },
            { key: 'cashCollected', label: 'Cash', align: 'right', render: v => fmt(v) },
            { key: 'gastos', label: 'Gastos', align: 'right', render: v => fmt(v) },
            { key: 'ganancia', label: 'Ganancia', align: 'right', render: v => (
              <span style={{ color: v > 0 ? GREEN : DANGER, fontWeight: 700 }}>{fmt(v)}</span>
            )},
            { key: 'margenNeto', label: 'Margen', align: 'right', render: v => (
              <span style={{ color: v > 0.3 ? ACCENT : v > 0.15 ? 'rgba(255,255,255,0.6)' : DANGER, fontWeight: 600 }}>
                {fmtPct(v)}
              </span>
            )},
            { key: 'proyectada', label: 'Proyectada', align: 'right', render: v => v > 0 ? fmt(v) : '—' },
          ]}
        />
      </div>

      {/* Charts */}
      {chart12.length > 1 && (
        <>
          <Divider title="Evolución" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Revenue vs Ganancia</span>
              <MiniChart
                data={chart12.map(r => ({ label: `${r.month}/${String(r.year).slice(-2)}`, revenue: r.revenue }))}
                dataKey="revenue" color={ACCENT} prefix="$"
              />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: 8, display: 'block' }}>Margen neto %</span>
              <MiniChart
                data={chart12.map(r => ({ label: `${r.month}/${String(r.year).slice(-2)}`, margen: (r.margenNeto || 0) * 100 }))}
                dataKey="margen" color={GREEN}
              />
            </div>
          </div>
        </>
      )}

      {/* Deudas */}
      {currentER && (currentER.deudasAFavor > 0 || currentER.deudasCobradas > 0) && (
        <>
          <Divider title="Deudas" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10, maxWidth: 660 }}>
            <KPI label="Deudas a favor" value={fmt(currentER.deudasAFavor)} subtitle="nos deben"
              accent={currentER.deudasAFavor > 0 ? '#FBBF24' : undefined}
              delta={prevER?.deudasAFavor ? <Delta current={currentER.deudasAFavor} previous={prevER.deudasAFavor} inverse /> : null} />
            <KPI label="Cobradas este mes" value={fmt(currentER.deudasCobradas)} subtitle="deudas recuperadas"
              accent={currentER.deudasCobradas > 0 ? GREEN : undefined} />
            <KPI label="Cash del mes" value={fmt(currentER.delMes)} />
          </div>
        </>
      )}

      {/* Proyección */}
      {currentER && currentER.proyectada > 0 && (
        <>
          <Divider title="Proyección del mes" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10, maxWidth: 660 }}>
            <KPI label="Revenue proyectado" value={fmt(currentER.proyectada)} />
            <KPI label="Revenue actual" value={fmt(currentER.revenue)} />
            <KPI label="% avance" value={currentER.proyectada > 0 ? `${Math.round((currentER.revenue / currentER.proyectada) * 100)}%` : '—'}
              accent={currentER.revenue >= currentER.proyectada ? GREEN : undefined} />
          </div>
        </>
      )}

      {/* Gastos breakdown */}
      {egresosData.length > 0 && (
        <>
          <Divider title="Estructura de gastos" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 16 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: DANGER }}>{fmt(totalEgresosMes)}</span>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.5 }}>/mes</span>
              </div>
              <DataTable
                rows={egresosBreakdown}
                columns={[
                  { key: 'area', label: 'Área' },
                  { key: 'total', label: 'Total / mes', align: 'right', render: v => fmt(v) },
                ]}
              />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14, padding: 20 }}>
              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.45)', fontWeight: 700, marginBottom: 16, display: 'block' }}>Top gastos</span>
              <DataTable
                rows={[...egresosData].sort((a, b) => {
                  const va = a.montoPorMes > 0 ? a.montoPorMes : a.monto
                  const vb = b.montoPorMes > 0 ? b.montoPorMes : b.monto
                  return vb - va
                }).slice(0, 10)}
                columns={[
                  { key: 'proveedor', label: 'Proveedor' },
                  { key: 'servicio', label: 'Servicio' },
                  { key: 'monto', label: '$ / mes', align: 'right', render: (v, row) => fmt(row.montoPorMes > 0 ? row.montoPorMes : v) },
                ]}
              />
            </div>
          </div>
        </>
      )}

      {/* Análisis */}
      <Divider title="Análisis financiero" />
      <InsightsBlock currentER={currentER} prevER={prevER} />
      </>}
    </>
  )
}
