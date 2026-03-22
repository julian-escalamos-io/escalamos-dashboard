import { useState } from 'react'

const ACCENT = '#2D7AFF'
const ACCENT_DIM = 'rgba(45,122,255,0.12)'
const ACCENT_BORDER = 'rgba(45,122,255,0.28)'

const NAV_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8" />
        <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5" />
        <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.35" />
      </svg>
    ),
  },
  {
    key: 'marketing',
    label: 'Marketing',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2 11 C2 11 5 5 8 5 C11 5 14 11 14 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.5" />
        <path d="M2 13 L6 8 L9 10 L12 6 L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="14" cy="8" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
  {
    key: 'fulfillment',
    label: 'Fulfillment',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 14 C2 11 4.5 9.5 8 9.5 C11.5 9.5 14 11 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M5 5V3.5C5 2.67 5.67 2 6.5 2H9.5C10.33 2 11 2.67 11 3.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M1.5 9H14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="8" cy="9" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
]


export function Sidebar({ activeModule, onModuleChange }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{
      width: collapsed ? 56 : 220,
      minHeight: '100vh',
      background: '#FFFFFF',
      borderRight: '1px solid rgba(0,0,0,0.08)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s ease',
      overflow: 'hidden',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? '20px 0' : '20px 18px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid rgba(0,0,0,0.06)', height: 64, flexShrink: 0 }}>
        {!collapsed && <img src="/logo.png" alt="Escalamos.io" style={{ height: 18, opacity: 0.7 }} />}
        {collapsed && <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(45,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, background: ACCENT, borderRadius: 2 }} />
        </div>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', color: 'rgba(26,31,54,0.3)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', flexShrink: 0 }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            {collapsed
              ? <path d="M4 7H10 M7 4L10 7L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              : <path d="M10 7H4 M7 4L4 7L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            }
          </svg>
        </button>
      </div>

      {/* Nav items */}
      <nav style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
        {NAV_ITEMS.map(({ key, label, icon }) => {
          const active = activeModule === key
          return (
            <button
              key={key}
              onClick={() => onModuleChange(key)}
              title={collapsed ? label : undefined}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: collapsed ? '10px 0' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 9,
                background: active ? ACCENT_DIM : 'transparent',
                border: active ? `1px solid ${ACCENT_BORDER}` : '1px solid transparent',
                color: active ? ACCENT : 'rgba(26,31,54,0.45)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: "'Montserrat'", transition: 'all 0.15s',
                width: '100%',
              }}
            >
              <span style={{ flexShrink: 0, lineHeight: 0 }}>{icon}</span>
              {!collapsed && label}
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />
    </div>
  )
}
