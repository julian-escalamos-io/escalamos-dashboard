import { useClerk, useUser } from '@clerk/clerk-react'

const ACCENT = '#2D7AFF'

const ROLE_LABELS = {
  admin:    'Admin',
  ops:      'Operaciones',
  finanzas: 'Finanzas',
}

const ALL_NAV_ITEMS = [
  {
    key: 'overview',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
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
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
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
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M2 14 C2 11 4.5 9.5 8 9.5 C11.5 9.5 14 11 14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    key: 'finanzas',
    label: 'Finanzas',
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
        <rect x="1.5" y="5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
        <path d="M5 5V3.5C5 2.67 5.67 2 6.5 2H9.5C10.33 2 11 2.67 11 3.5V5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M1.5 9H14.5" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
        <circle cx="8" cy="9" r="1.2" fill="currentColor" />
      </svg>
    ),
  },
]

export function Sidebar({ activeModule, onModuleChange, allowedModules = [], role }) {
  const { signOut } = useClerk()
  const { user } = useUser()

  const navItems = ALL_NAV_ITEMS.filter(item => allowedModules.includes(item.key))
  const firstName = user?.firstName || ''
  const lastName = user?.lastName || ''
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.emailAddresses?.[0]?.emailAddress || 'Usuario'
  const initial = fullName[0]?.toUpperCase() || 'U'
  const roleLabel = ROLE_LABELS[role] || role || ''

  return (
    <div style={{
      width: 220,
      height: 'calc(100vh - 24px)',
      background: '#F5F7FC',
      boxShadow: '0 2px 16px rgba(26,31,54,0.08)',
      borderRadius: 20,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      overflow: 'hidden',
      position: 'sticky',
      top: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '22px 20px',
        display: 'flex', alignItems: 'center',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        height: 68, flexShrink: 0,
      }}>
        <img src="/logo.png" alt="Escalamos.io" style={{ height: 18, filter: 'brightness(0)', opacity: 0.75 }} />
      </div>

      {/* Nav items */}
      <nav style={{ padding: '20px 12px', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'rgba(26,31,54,0.28)', padding: '0 8px 12px', display: 'block' }}>Home</span>
        {navItems.map(({ key, label, icon }) => {
          const active = activeModule === key
          return (
            <button
              key={key}
              onClick={() => onModuleChange(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 12px',
                justifyContent: 'flex-start',
                borderRadius: 10,
                background: active ? 'rgba(45,122,255,0.08)' : 'transparent',
                border: 'none',
                color: active ? ACCENT : 'rgba(26,31,54,0.45)',
                fontSize: 13, fontWeight: active ? 700 : 500, cursor: 'pointer',
                fontFamily: "'Montserrat'", transition: 'all 0.15s',
                width: '100%',
              }}
            >
              <span style={{
                flexShrink: 0, lineHeight: 0,
                width: 36, height: 36, borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: active ? ACCENT : 'rgba(26,31,54,0.05)',
                color: active ? '#fff' : 'rgba(26,31,54,0.45)',
                transition: 'all 0.15s',
              }}>{icon}</span>
              {label}
            </button>
          )
        })}
      </nav>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* User + Sign out */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        display: 'flex', flexDirection: 'column', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: '#1a1f36',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff',
          }}>{initial}</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(26,31,54,0.8)', lineHeight: 1.3 }}>{fullName}</div>
            <div style={{ fontSize: 10, color: 'rgba(26,31,54,0.38)', fontWeight: 600 }}>{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 8, border: '1px solid rgba(26,31,54,0.1)',
            background: 'transparent', color: 'rgba(26,31,54,0.4)', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', fontFamily: "'Montserrat'", transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(224,62,62,0.06)'; e.currentTarget.style.color = '#E03E3E'; e.currentTarget.style.borderColor = 'rgba(224,62,62,0.2)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(26,31,54,0.4)'; e.currentTarget.style.borderColor = 'rgba(26,31,54,0.1)' }}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
