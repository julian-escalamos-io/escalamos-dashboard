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
  const [finanzasSubTab, setFinanzasSubTab] = useState('pl')
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

  // ── Hero KPIs (always-on top banner) ─────────────────────────────────────
  const heroData = useMemo(() => {
    if (!data) return null
    const kpis = computeOverviewKPIs(servicios, modelFilter)
    const currentER = er.find(r => r.monthKey === selectedERMonth) || er[er.length - 1]
    return { kpis, currentER }
  }, [data, servicios, er, modelFilter, selectedERMonth])

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
    ? { text: '● cargando...', color: 'rgba(26,31,54,0.25)' }
    : error
    ? { text: '⚠ Error de conexión', color: '#E03E3E' }
    : { text: `● ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, color: 'rgba(26,31,54,0.2)' }

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#E8EDF8', color: '#1a1f36',
      fontFamily: "'Montserrat', sans-serif",
    }}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={setActiveModule}
        modelFilter={modelFilter}
        onModelChange={setModelFilter}
      />

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        background: '#FFFFFF',
        backgroundImage: `radial-gradient(ellipse 80% 50% at 75% -5%, rgba(45,122,255,0.15) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(99,102,241,0.08) 0%, transparent 60%)`,
        borderRadius: 0,
      }}>
        {/* Top bar */}
        <div style={{
          padding: '0 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.07)',
          height: 56, flexShrink: 0, gap: 12,
          background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)',
        }}>
          {/* Left: title */}
          <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(26,31,54,0.65)', flexShrink: 0 }}>
            {activeModule === 'overview' && 'Overview'}
            {activeModule === 'marketing' && 'Marketing'}
            {activeModule === 'fulfillment' && 'Fulfillment'}
            {activeModule === 'finanzas' && 'Finanzas'}
          </span>

          {/* Center/Right: filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Model filter — pills con colores por modelo */}
            {[
              { value: 'todos',      label: 'Todos',      bg: 'rgba(0,0,0,0.04)', color: 'rgba(26,31,54,0.55)', border: 'rgba(0,0,0,0.1)', activeBg: 'rgba(0,0,0,0.08)' },
              { value: 'Boutique',   label: 'Boutique',   bg: 'rgba(245,158,11,0.08)',  color: '#D97706',               border: 'rgba(245,158,11,0.25)',  activeBg: 'rgba(245,158,11,0.18)' },
              { value: 'Agencia',    label: 'Agencia',    bg: 'rgba(59,130,246,0.08)',  color: '#2D7AFF',               border: 'rgba(59,130,246,0.25)',  activeBg: 'rgba(59,130,246,0.15)' },
              { value: 'Soft',       label: 'Soft',       bg: 'rgba(0,0,0,0.03)',       color: 'rgba(26,31,54,0.55)',   border: 'rgba(0,0,0,0.1)',        activeBg: 'rgba(0,0,0,0.07)'  },
              { value: 'Financiera', label: 'Financiera', bg: 'rgba(16,185,129,0.08)',  color: '#059669',               border: 'rgba(16,185,129,0.25)',  activeBg: 'rgba(16,185,129,0.15)' },
            ].map(m => {
              const isActive = modelFilter === m.value
              return (
                <button key={m.value} onClick={() => setModelFilter(m.value)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat'",
                  background: isActive ? m.activeBg : m.bg,
                  color: isActive ? m.color : 'rgba(26,31,54,0.45)',
                  border: `1px solid ${isActive ? m.border : 'rgba(0,0,0,0.07)'}`,
                  opacity: isActive ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}>{m.label}</button>
              )
            })}

            {/* ER month selector — ocultar en Finanzas > Egresos (sin filtro de fecha) */}
            {activeModule !== 'marketing' && !(activeModule === 'finanzas' && finanzasSubTab === 'egresos') && er.length > 0 && (
              <div style={{ display: 'flex', gap: 2, background: 'rgba(0,0,0,0.03)', borderRadius: 8, padding: 3, border: '1px solid rgba(0,0,0,0.07)' }}>
                {er.slice(-6).map(r => {
                  const isActive = (selectedERMonth || er[er.length - 1]?.monthKey) === r.monthKey
                  return (
                    <button key={r.monthKey} onClick={() => setSelectedERMonth(r.monthKey)} style={{
                      padding: '5px 11px', borderRadius: 6, border: 'none',
                      background: isActive ? 'rgba(45,122,255,0.1)' : 'transparent',
                      color: isActive ? '#2D7AFF' : 'rgba(26,31,54,0.35)',
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

        {/* Hero strip */}
        {heroData && (
          <div style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', gap: 0,
            background: 'linear-gradient(90deg, #1e3fa3 0%, #2D7AFF 60%, #4f8fff 100%)',
            padding: '0 32px', height: 72,
          }}>
            {[
              { label: 'MRR', value: heroData.kpis.mrr > 0 ? `$${Math.round(heroData.kpis.mrr).toLocaleString('en-US')}` : '—', icon: '◈' },
              { label: 'Clientes', value: heroData.kpis.clientesActivos || '—', icon: '◉' },
              { label: 'Revenue mes', value: heroData.currentER?.revenue > 0 ? `$${Math.round(heroData.currentER.revenue).toLocaleString('en-US')}` : '—', icon: '◎' },
              { label: 'Margen neto', value: heroData.currentER?.margenNeto > 0 ? `${(heroData.currentER.margenNeto * 100).toFixed(1)}%` : '—', icon: '◇' },
              { label: 'AOV', value: heroData.kpis.aov > 0 ? `$${Math.round(heroData.kpis.aov).toLocaleString('en-US')}` : '—', icon: '◆' },
            ].map(({ label, value, icon }, i) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {i > 0 && <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.15)', margin: '0 24px' }} />}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: 'rgba(255,255,255,0.9)',
                  }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.8, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>{value}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {isLoading && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
              <span style={{ fontSize: 13, color: 'rgba(26,31,54,0.25)', fontWeight: 600 }}>Cargando datos...</span>
            </div>
          )}
          {!isLoading && error && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
              <span style={{ fontSize: 13, color: '#E03E3E', fontWeight: 600 }}>No se pudo conectar con la API</span>
              <span style={{ fontSize: 11, color: 'rgba(26,31,54,0.25)' }}>{error.message}</span>
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
                <FinanzasModule er={er} egresos={egresos} servicios={servicios} selectedERMonth={selectedERMonth} modelFilter={modelFilter} subTab={finanzasSubTab} onSubTabChange={setFinanzasSubTab} />
              )}
            </>
          )}
        </div>
      </div>

      <ChatPanel activeModule={activeModule} dateRange={dateRange} contextData={chatContext} />
    </div>
  )
}
