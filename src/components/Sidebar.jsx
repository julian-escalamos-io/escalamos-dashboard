import { useState } from 'react'


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
      background: '#E8EDF8',
      borderRight: 'none',
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
      <div style={{ padding: collapsed ? '20px 0' : '20px 18px', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)', height: 64, flexShrink: 0 }}>
        {!collapsed && <img src="/logo.png" alt="Escalamos.io" style={{ height: 18, filter: 'brightness(0)', opacity: 0.6 }} />}
        {collapsed && <div style={{ width: 26, height: 26, borderRadius: 6, background: 'rgba(45,122,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 10, height: 10, background: '#2D7AFF', borderRadius: 2 }} />
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
      <nav style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 0, flexShrink: 0 }}>
        {!collapsed && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(26,31,54,0.3)', padding: '4px 16px 8px', display: 'block' }}>Home</span>
        )}
        {NAV_ITEMS.map(({ key, label, icon }) => {
          const active = activeModule === key
          return (
            <div key={key} style={{ position: 'relative', padding: '2px 0' }}>
              <button
                onClick={() => onModuleChange(key)}
                title={collapsed ? label : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: collapsed ? '10px 0' : '10px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: active && !collapsed ? '10px 0 0 10px' : 9,
                  marginLeft: 8,
                  marginRight: active && !collapsed ? 0 : 8,
                  background: active ? '#FFFFFF' : 'transparent',
                  border: 'none',
                  color: active ? '#2D7AFF' : 'rgba(26,31,54,0.5)',
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: "'Montserrat'", transition: 'background 0.15s, color 0.15s',
                  width: active && !collapsed ? 'calc(100% - 8px)' : 'calc(100% - 16px)',
                }}
              >
                <span style={{ flexShrink: 0, lineHeight: 0 }}>{icon}</span>
                {!collapsed && label}
              </button>
            </div>
          )
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User */}
      <div style={{
        padding: collapsed ? '16px 0' : '14px 16px',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        display: 'flex', alignItems: 'center', gap: 10,
        justifyContent: collapsed ? 'center' : 'flex-start',
        flexShrink: 0,
      }}>
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: '#1a1f36',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: '#fff',
        }}>J</div>
        {!collapsed && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,31,54,0.8)', lineHeight: 1.3 }}>Julián Mercurio</div>
            <div style={{ fontSize: 10, color: 'rgba(26,31,54,0.4)', fontWeight: 600 }}>Admin</div>
          </div>
        )}
      </div>
    </div>
  )
}
