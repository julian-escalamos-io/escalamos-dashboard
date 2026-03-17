import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { DateRangePicker } from './components/DateRangePicker.jsx'
import { Overview } from './components/tabs/Overview.jsx'
import { AdsTab } from './components/tabs/AdsTab.jsx'
import { InstagramTab } from './components/tabs/InstagramTab.jsx'
import { SeoTab } from './components/tabs/SeoTab.jsx'
import { UxTab } from './components/tabs/UxTab.jsx'
import { PRESETS } from './lib/dates.js'
import { buildCohorts, buildMetaAds, buildInstagram, buildSeo, buildUx } from './lib/cohorts.js'

const ACCENT = '#2D7AFF'
const ACCENT_DIM = 'rgba(45,122,255,0.15)'
const ACCENT_BORDER = 'rgba(45,122,255,0.3)'

const TABS = [
  ['overview', 'Overview'],
  ['ads', 'Meta Ads'],
  ['gads', 'Google Ads'],
  ['instagram', 'Instagram'],
  ['seo', 'SEO'],
  ['ux', 'UX'],
]

const fetcher = (url) => fetch(url).then(r => r.json())

export default function App() {
  const [view, setView] = useState('overview')
  const [dateRange, setDateRange] = useState(() => PRESETS[0].getRange()) // default: Este mes

  const { data, error, isLoading } = useSWR('/api/sheets', fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 5 * 60 * 1000, // refresh every 5 min
  })

  const cohorts = useMemo(() => {
    if (!data) return []
    return buildCohorts(data.ghlLeads, data.ghlVentas, data.costos, dateRange)
  }, [data, dateRange])

  const ads = useMemo(() => {
    if (!data) return []
    return buildMetaAds(data.metaAds, dateRange)
  }, [data, dateRange])

  const instagram = useMemo(() => {
    if (!data) return null
    return buildInstagram(data.instagram, dateRange)
  }, [data, dateRange])

  const seo = useMemo(() => {
    if (!data) return null
    return buildSeo(data.searchConsole, dateRange)
  }, [data, dateRange])

  const ux = useMemo(() => {
    if (!data) return null
    return buildUx(data.clarity, data.ga4Trafico, dateRange)
  }, [data, dateRange])

  return (
    <div style={{ minHeight: '100vh', background: '#080A0F', color: '#fff', fontFamily: "'Montserrat', sans-serif" }}>
      {/* Header */}
      <div style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2, color: 'rgba(255,255,255,0.35)' }}>
            ESCALAMOS<span style={{ fontWeight: 400, opacity: 0.5 }}>.io</span>
          </span>
          <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.06)' }} />
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontWeight: 500 }}>Marketing Dashboard</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isLoading && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>● cargando...</span>
          )}
          {error && (
            <span style={{ fontSize: 11, color: '#FF6B6B', fontWeight: 600 }}>⚠ Error de conexión</span>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '14px 32px 0', display: 'flex', gap: 4 }}>
        {TABS.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setView(k)}
            style={{
              background: view === k ? ACCENT_DIM : 'transparent',
              border: view === k ? `1px solid ${ACCENT_BORDER}` : '1px solid transparent',
              borderRadius: 8, padding: '8px 18px',
              color: view === k ? ACCENT : 'rgba(255,255,255,0.25)',
              fontSize: 12, cursor: 'pointer', fontWeight: 600, fontFamily: "'Montserrat'",
              transition: 'all 0.2s',
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px' }}>
        {isLoading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.2)', fontWeight: 600 }}>Cargando datos del Sheets...</span>
          </div>
        )}

        {!isLoading && error && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#FF6B6B', fontWeight: 600 }}>No se pudo conectar con la API</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>{error.message}</span>
          </div>
        )}

        {!isLoading && !error && data && (
          <>
            {view === 'overview' && <Overview cohorts={cohorts} allCostos={data.costos} />}
            {view === 'ads' && <AdsTab ads={ads} />}
            {view === 'gads' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 14 }}>
                <div style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: 32, display: 'block', marginBottom: 12, opacity: 0.15 }}>⏳</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Pendiente activación — token en proceso</span>
                </div>
              </div>
            )}
            {view === 'instagram' && <InstagramTab data={instagram} />}
            {view === 'seo' && <SeoTab data={seo} />}
            {view === 'ux' && <UxTab data={ux} />}
          </>
        )}
      </div>
    </div>
  )
}
