import { useState, useMemo } from 'react'
import useSWR from 'swr'
import { Sidebar } from './components/Sidebar.jsx'
import { DateRangePicker } from './components/DateRangePicker.jsx'
import { ChatPanel } from './components/ChatPanel.jsx'
import { OverviewModule } from './modules/OverviewModule.jsx'
import { MarketingModule } from './modules/MarketingModule.jsx'
import { FulfillmentModule } from './modules/FulfillmentModule.jsx'
import { FinanzasModule } from './modules/FinanzasModule.jsx'
import { PRESETS } from './lib/dates.js'
import { buildCohorts, buildMetaAds, buildInstagram, buildSeo, buildUx } from './lib/cohorts.js'
import { parseServicios, parseEgresos, parseER, computeOverviewKPIs } from './lib/maestro.js'

const fetcher = (url) => fetch(url).then(r => r.json())

export default function App() {
  const [activeModule, setActiveModule] = useState('overview')
  const [modelFilter, setModelFilter] = useState('todos')
  const currentMonthKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })()
  const [selectedERMonth, setSelectedERMonth] = useState(currentMonthKey)
  const [dateRange, setDateRange] = useState(() => PRESETS[0].getRange())

  // Cohort month derived from dateRange start — keeps Marketing in sync with the filter
  const selectedCohortMonth = useMemo(() => {
    const s = dateRange.start
    return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`
  }, [dateRange])

  const { data, error, isLoading } = useSWR('/api/sheets', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000,
  })

  // ── Marketing (cohort) data ────────────────────────────────────────────────
  const allCohorts = useMemo(() => {
    if (!data) return []
    return buildCohorts(data.ghlLeads, data.ghlVentas, data.costos, { start: new Date('2020-01-01'), end: new Date('2030-12-31') })
  }, [data])

  const selectedCohort = useMemo(() => {
    if (!allCohorts.length) return null
    if (selectedCohortMonth) return allCohorts.find(c => c.month === selectedCohortMonth) || allCohorts[allCohorts.length - 1]
    return allCohorts[allCohorts.length - 1]
  }, [allCohorts, selectedCohortMonth])

  const prevCohort = useMemo(() => {
    if (!selectedCohort || !allCohorts.length) return null
    const idx = allCohorts.findIndex(c => c.month === selectedCohort.month)
    return idx > 0 ? allCohorts[idx - 1] : null
  }, [allCohorts, selectedCohort])

  const ads = useMemo(() => data ? buildMetaAds(data.metaAds, dateRange) : [], [data, dateRange])
  const instagram = useMemo(() => data ? buildInstagram(data.instagram, dateRange) : null, [data, dateRange])
  const seo = useMemo(() => data ? buildSeo(data.searchConsole, dateRange) : null, [data, dateRange])
  const ux = useMemo(() => data ? buildUx(data.clarity, data.ga4Trafico, dateRange) : null, [data, dateRange])

  // ── Registro Maestro data ─────────────────────────────────────────────────
  const servicios = useMemo(() => data?.servicios ? parseServicios(data.servicios) : [], [data])
  const egresos = useMemo(() => data?.egresos ? parseEgresos(data.egresos) : [], [data])
  const er = useMemo(() => data?.er ? parseER(data.er) : [], [data])

  // ── Chat context (summary of current view data) ───────────────────────────
  const chatContext = useMemo(() => {
    if (!data) return {}
    const currentER = er.find(r => r.monthKey === selectedERMonth) || er[er.length - 1]
    const kpis = computeOverviewKPIs(servicios, modelFilter)
    if (activeModule === 'marketing' && selectedCohort) {
      return {
        cohort: {
          month: selectedCohort.month,
          revenue: selectedCohort.revenue,
          gasto: selectedCohort.gasto,
          mer: selectedCohort.mer,
          cac: selectedCohort.cac,
          aov: selectedCohort.cohortAov,
          grossProfit: selectedCohort.grossProfit,
          payback: selectedCohort.payback,
          leadsCount: selectedCohort.leadsCount,
          closuresCount: selectedCohort.closuresCount,
          cpl: selectedCohort.cpl,
          cicloVentas: selectedCohort.cicloVentas,
          sourceCounts: selectedCohort.sourceCounts,
        },
        prevCohort: prevCohort ? { revenue: prevCohort.revenue, cac: prevCohort.cac, mer: prevCohort.mer } : null,
      }
    }
    if (activeModule === 'overview') {
      return { er: currentER, kpis }
    }
    if (activeModule === 'fulfillment') {
      return { kpis }
    }
    if (activeModule === 'finanzas') {
      return { er: currentER, totalEgresos: egresos.reduce((s, e) => s + (e.montoPorMes || e.monto), 0) }
    }
    return {}
  }, [activeModule, data, selectedCohort, prevCohort, er, servicios, egresos, modelFilter, selectedERMonth])

  const statusMsg = isLoading
    ? { text: '● cargando...', color: 'rgba(255,255,255,0.2)' }
    : error
    ? { text: '⚠ Error de conexión', color: '#FF6B6B' }
    : { text: `● ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, color: 'rgba(255,255,255,0.12)' }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#0E1220', color: '#fff',
      fontFamily: "'Montserrat', sans-serif",
      backgroundImage: `
        radial-gradient(ellipse 70% 50% at 65% -5%, rgba(45,122,255,0.22) 0%, transparent 60%),
        radial-gradient(ellipse 40% 30% at 95% 80%, rgba(45,122,255,0.07) 0%, transparent 55%)
      `,
    }}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        modelFilter={modelFilter}
        onModelChange={setModelFilter}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <div style={{
          padding: '0 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)',
          height: 56, flexShrink: 0, gap: 12,
        }}>
          {/* Left: title */}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
            {activeModule === 'overview' && 'Overview'}
            {activeModule === 'marketing' && 'Marketing'}
            {activeModule === 'fulfillment' && 'Fulfillment'}
            {activeModule === 'finanzas' && 'Finanzas'}
          </span>

          {/* Center/Right: filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Model filter — dropdown */}
            <select
              value={modelFilter}
              onChange={e => setModelFilter(e.target.value)}
              style={{
                padding: '6px 28px 6px 12px', borderRadius: 8,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: modelFilter !== 'todos' ? '#2D7AFF' : 'rgba(255,255,255,0.5)',
                fontSize: 11, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Montserrat'", outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(255,255,255,0.3)' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
              }}
            >
              <option value="todos" style={{ background: '#1a2236', color: '#fff' }}>Todos los modelos</option>
              <option value="Boutique" style={{ background: '#1a2236', color: '#fff' }}>Boutique</option>
              <option value="Agencia" style={{ background: '#1a2236', color: '#fff' }}>Agencia</option>
              <option value="Soft" style={{ background: '#1a2236', color: '#fff' }}>Soft</option>
              <option value="Financiera" style={{ background: '#1a2236', color: '#fff' }}>Financiera</option>
            </select>

            {/* ER month selector (Overview / Fulfillment / Finanzas) */}
            {activeModule !== 'marketing' && er.length > 0 && (
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
                {er.slice(-6).map(r => {
                  const isActive = (selectedERMonth || er[er.length - 1]?.monthKey) === r.monthKey
                  return (
                    <button key={r.monthKey} onClick={() => setSelectedERMonth(r.monthKey)} style={{
                      padding: '5px 11px', borderRadius: 6, border: 'none',
                      background: isActive ? 'rgba(45,122,255,0.18)' : 'transparent',
                      color: isActive ? '#2D7AFF' : 'rgba(255,255,255,0.28)',
                      fontSize: 11, cursor: 'pointer', fontWeight: 700, fontFamily: "'Montserrat'",
                    }}>
                      {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][r.month - 1]} {String(r.year).slice(-2)}
                    </button>
                  )
                })}
              </div>
            )}


            {/* Date range picker — always visible */}
            <DateRangePicker value={dateRange} onChange={setDateRange} />

            <span style={{ fontSize: 10, fontWeight: 600, color: statusMsg.color }}>{statusMsg.text}</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Cargando datos...</span>
            </div>
          )}
          {!isLoading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
              <span style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 600 }}>No se pudo conectar con la API</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{error.message}</span>
            </div>
          )}
          {!isLoading && !error && data && (
            <>
              {activeModule === 'overview' && (
                <OverviewModule
                  servicios={servicios} er={er}
                  modelFilter={modelFilter} selectedERMonth={selectedERMonth}
                />
              )}
              {activeModule === 'marketing' && (
                <MarketingModule
                  cohort={selectedCohort} prevCohort={prevCohort} allCohorts={allCohorts}
                  ads={ads} instagram={instagram} seo={seo} ux={ux}
                />
              )}
              {activeModule === 'fulfillment' && (
                <FulfillmentModule servicios={servicios} modelFilter={modelFilter} />
              )}
              {activeModule === 'finanzas' && (
                <FinanzasModule er={er} egresos={egresos} selectedERMonth={selectedERMonth} modelFilter={modelFilter} />
              )}
            </>
          )}
        </div>
      </div>

      <ChatPanel activeModule={activeModule} dateRange={dateRange} contextData={chatContext} />
    </div>
  )
}
