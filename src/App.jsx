import { useState, useMemo, useCallback, useEffect } from 'react'
import { SignedIn, SignedOut, useUser, useAuth } from '@clerk/clerk-react'
import { LoginScreen } from './components/LoginScreen.jsx'
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
import { parseServicios, parseEgresos, parseER, parseHistorico, parseERUnificado, erUnificadoToOverview, parsePendingInvoices, parseIncobrables, computeOverviewKPIs } from './lib/maestro.js'

// ── Configuración de roles ─────────────────────────────────────────────────
const MODULES_BY_ROLE = {
  admin:    ['overview', 'marketing', 'fulfillment', 'finanzas'],
  ops:      ['marketing', 'fulfillment'],
  finanzas: ['finanzas'],
}

const DEFAULT_MODULE_BY_ROLE = {
  admin:    'overview',
  ops:      'marketing',
  finanzas: 'finanzas',
}

export default function App() {
  return (
    <>
      <SignedIn>
        <Dashboard />
      </SignedIn>
      <SignedOut>
        <LoginScreen />
      </SignedOut>
    </>
  )
}

function Dashboard() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()

  const role = isLoaded ? (user?.publicMetadata?.role || 'ops') : null
  const lockedModel = isLoaded ? (user?.publicMetadata?.model || null) : null
  const allowedModules = MODULES_BY_ROLE[role] || []

  const [activeModule, setActiveModule] = useState('overview')
  const [roleInitialized, setRoleInitialized] = useState(false)

  // Redirigir al módulo correcto según rol al cargar
  useEffect(() => {
    if (isLoaded && role && !roleInitialized) {
      setActiveModule(DEFAULT_MODULE_BY_ROLE[role] || 'overview')
      setRoleInitialized(true)
    }
  }, [isLoaded, role, roleInitialized])

  const [modelFilter, setModelFilter] = useState('todos')

  // Fijar el filtro de modelo si el usuario tiene uno asignado
  useEffect(() => {
    if (lockedModel) setModelFilter(lockedModel)
  }, [lockedModel])
  const currentMonthKey = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` })()
  const [selectedERMonth, setSelectedERMonth] = useState(currentMonthKey)
  const [finanzasSubTab, setFinanzasSubTab] = useState('proyeccion')
  const [dateRange, setDateRange] = useState(() => PRESETS[0].getRange())

  const selectedCohortMonth = useMemo(() => {
    const s = dateRange.start
    return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, '0')}`
  }, [dateRange])

  // Fetcher autenticado con token de Clerk
  const authedFetcher = useCallback(
    (url) => getToken().then(token =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ),
    [getToken]
  )

  const { data, error, isLoading } = useSWR('/api/sheets', authedFetcher, {
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
  const historico = useMemo(() => data?.historico ? parseHistorico(data.historico) : [], [data])

  // ── E.R. Unificado (Xero) ────────────────────────────────────────────────
  const erUnificado = useMemo(() => data?.erUnificado ? parseERUnificado(data.erUnificado) : [], [data])
  // Vista compatible para Overview (solo filas TOTAL mensuales)
  const er = useMemo(() => erUnificado.length ? erUnificadoToOverview(erUnificado) : (data?.er ? parseER(data.er) : []), [erUnificado, data])
  // Facturas pendientes e incobrables (desde Xero Raw Data)
  const pendingInvoices = useMemo(() => data?.xeroRaw ? parsePendingInvoices(data.xeroRaw) : [], [data])
  const incobrables = useMemo(() => data?.xeroRaw ? parseIncobrables(data.xeroRaw) : [], [data])

  // ── Chat context ───────────────────────────────────────────────────────────
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
    if (activeModule === 'overview') return { er: currentER, kpis }
    if (activeModule === 'fulfillment') return { kpis }
    if (activeModule === 'finanzas') {
      const finRow = erUnificado.find(r => r.monthKey === (selectedERMonth || er[er.length - 1]?.monthKey) && r.isTotal)
      return { er: currentER, erUnificado: finRow, totalEgresos: egresos.reduce((s, e) => s + (e.montoPorMes || e.monto), 0) }
    }
    return {}
  }, [activeModule, data, selectedCohort, prevCohort, er, servicios, egresos, modelFilter, selectedERMonth])

  const statusMsg = isLoading
    ? { text: '● cargando...', color: 'rgba(26,31,54,0.25)' }
    : error
    ? { text: '⚠ Error de conexión', color: '#E03E3E' }
    : { text: `● ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`, color: 'rgba(26,31,54,0.2)' }

  // Guardar módulo activo solo si el rol tiene acceso
  const handleModuleChange = (mod) => {
    if (allowedModules.includes(mod)) setActiveModule(mod)
  }

  // Si el modelo está bloqueado, ignorar cambios manuales
  const handleModelChange = (model) => {
    if (!lockedModel) setModelFilter(model)
  }

  if (!isLoaded) return null

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#E8EDF8', color: '#1a1f36',
      fontFamily: "'Montserrat', sans-serif",
      padding: 12, gap: 12, alignItems: 'flex-start',
    }}>
      {/* Sidebar */}
      <Sidebar
        activeModule={activeModule}
        onModuleChange={handleModuleChange}
        modelFilter={modelFilter}
        onModelChange={handleModelChange}
        allowedModules={allowedModules}
        role={role}
      />

      {/* Main content */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0,
        background: '#FFFFFF',
        backgroundImage: `radial-gradient(ellipse 80% 50% at 75% -5%, rgba(45,122,255,0.12) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 100% 80%, rgba(99,102,241,0.08) 0%, transparent 60%)`,
        borderRadius: 20, overflow: 'hidden',
        minHeight: 'calc(100vh - 24px)',
      }}>
        {/* Top bar */}
        <div style={{
          padding: '0 28px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          height: 60, flexShrink: 0, gap: 12,
          background: '#1a1f36',
          boxShadow: '0 4px 24px rgba(26,31,54,0.22)',
          position: 'relative', zIndex: 10,
        }}>
          {/* Left: title */}
          <span style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', flexShrink: 0, letterSpacing: -0.3 }}>
            {activeModule === 'overview' && 'Overview'}
            {activeModule === 'marketing' && 'Marketing'}
            {activeModule === 'fulfillment' && 'Fulfillment'}
            {activeModule === 'finanzas' && 'Finanzas'}
          </span>

          {/* Center/Right: filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {/* Model filter — pills con colores por modelo (oculto si el modelo está bloqueado) */}
            {!lockedModel && [
              { value: 'todos',      label: 'Todos',      bg: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: 'rgba(255,255,255,0.12)', activeBg: 'rgba(255,255,255,0.16)' },
              { value: 'Boutique',   label: 'Boutique',   bg: 'rgba(245,158,11,0.12)', color: '#F59E0B',               border: 'rgba(245,158,11,0.3)',   activeBg: 'rgba(245,158,11,0.25)' },
              { value: 'Agencia',    label: 'Agencia',    bg: 'rgba(59,130,246,0.12)', color: '#60A5FA',               border: 'rgba(59,130,246,0.3)',   activeBg: 'rgba(59,130,246,0.25)' },
              { value: 'Soft',       label: 'Soft',       bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)',  activeBg: 'rgba(255,255,255,0.12)' },
              { value: 'Financiera', label: 'Financiera', bg: 'rgba(16,185,129,0.12)', color: '#34D399',               border: 'rgba(16,185,129,0.3)',   activeBg: 'rgba(16,185,129,0.25)' },
              { value: 'Consultoría', label: 'Consultoría', bg: 'rgba(168,85,247,0.12)', color: '#A855F7',             border: 'rgba(168,85,247,0.3)',   activeBg: 'rgba(168,85,247,0.25)' },
            ].map(m => {
              const isActive = modelFilter === m.value
              return (
                <button key={m.value} onClick={() => setModelFilter(m.value)} style={{
                  padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat'",
                  background: isActive ? m.activeBg : m.bg,
                  color: isActive ? m.color : 'rgba(255,255,255,0.4)',
                  border: `1px solid ${isActive ? m.border : 'rgba(255,255,255,0.08)'}`,
                  opacity: isActive ? 1 : 0.7,
                  transition: 'all 0.15s',
                }}>{m.label}</button>
              )
            })}

            {/* ER month selector — ocultar en Marketing y Finanzas */}
            {activeModule !== 'marketing' && activeModule !== 'finanzas' && er.length > 0 && (
              <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.08)' }}>
                {er.slice(-6).map(r => {
                  const isActive = (selectedERMonth || er[er.length - 1]?.monthKey) === r.monthKey
                  return (
                    <button key={r.monthKey} onClick={() => setSelectedERMonth(r.monthKey)} style={{
                      padding: '5px 11px', borderRadius: 6, border: 'none',
                      background: isActive ? 'rgba(45,122,255,0.1)' : 'transparent',
                      color: isActive ? '#60A5FA' : 'rgba(255,255,255,0.35)',
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

            <span style={{ fontSize: 10, fontWeight: 600, color: statusMsg.color === 'rgba(255,255,255,0.12)' ? 'rgba(255,255,255,0.2)' : statusMsg.color }}>{statusMsg.text}</span>
          </div>
        </div>

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
              {activeModule === 'overview' && allowedModules.includes('overview') && (
                <OverviewModule
                  servicios={servicios} er={er}
                  modelFilter={modelFilter} selectedERMonth={selectedERMonth}
                  cac={selectedCohort?.cac} allCohorts={allCohorts}
                />
              )}
              {activeModule === 'marketing' && allowedModules.includes('marketing') && (
                <MarketingModule
                  cohort={selectedCohort} prevCohort={prevCohort} allCohorts={allCohorts}
                  ads={ads} instagram={instagram} seo={seo} ux={ux}
                />
              )}
              {activeModule === 'fulfillment' && allowedModules.includes('fulfillment') && (
                <FulfillmentModule servicios={servicios} modelFilter={modelFilter} historico={historico} selectedERMonth={selectedERMonth} />
              )}
              {activeModule === 'finanzas' && allowedModules.includes('finanzas') && (
                <FinanzasModule erUnificado={erUnificado} er={er} egresos={egresos} servicios={servicios} pendingInvoices={pendingInvoices} incobrables={incobrables} xeroRaw={data?.xeroRaw} libroDiario={data?.libroDiario} role={role} selectedERMonth={selectedERMonth} modelFilter={modelFilter} subTab={finanzasSubTab} onSubTabChange={setFinanzasSubTab} />
              )}
            </>
          )}
        </div>
      </div>

      <ChatPanel activeModule={activeModule} dateRange={dateRange} contextData={chatContext} />
    </div>
  )
}
