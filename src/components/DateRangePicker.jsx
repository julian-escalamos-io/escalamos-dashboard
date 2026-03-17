import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { PRESETS } from '../lib/dates.js'

const ACCENT = '#2D7AFF'
const ACCENT_DIM = 'rgba(45,122,255,0.15)'
const ACCENT_BORDER = 'rgba(45,122,255,0.3)'

// Minimal CSS for DayPicker dark theme
const pickerCss = `
.rdp-root {
  --rdp-accent-color: ${ACCENT};
  --rdp-accent-background-color: rgba(45,122,255,0.15);
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  color: rgba(255,255,255,0.7);
}
.rdp-day_button {
  color: rgba(255,255,255,0.7);
  border-radius: 6px;
}
.rdp-day_button:hover {
  background: rgba(45,122,255,0.2);
  color: #fff;
}
.rdp-selected .rdp-day_button {
  background: ${ACCENT};
  color: #fff;
}
.rdp-range_middle .rdp-day_button {
  background: rgba(45,122,255,0.12);
  color: rgba(255,255,255,0.8);
  border-radius: 0;
}
.rdp-range_start .rdp-day_button, .rdp-range_end .rdp-day_button {
  background: ${ACCENT};
  color: #fff;
}
.rdp-month_caption {
  color: rgba(255,255,255,0.5);
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.rdp-nav button {
  color: rgba(255,255,255,0.4);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
}
.rdp-nav button:hover { color: #fff; }
.rdp-weekday {
  color: rgba(255,255,255,0.2);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
}
.rdp-outside .rdp-day_button { color: rgba(255,255,255,0.15); }
.rdp-today .rdp-day_button { color: ${ACCENT}; font-weight: 800; }
`

export function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [activePreset, setActivePreset] = useState('mtd')
  const [range, setRange] = useState(null)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function applyPreset(preset) {
    const r = preset.getRange()
    setActivePreset(preset.key)
    setRange(null)
    onChange(r)
    if (preset.key !== 'custom') setOpen(false)
  }

  function handleRangeSelect(r) {
    setRange(r)
    setActivePreset('custom')
    if (r?.from && r?.to) {
      onChange({ start: r.from, end: r.to })
      setOpen(false)
    }
  }

  const displayLabel = activePreset !== 'custom'
    ? PRESETS.find(p => p.key === activePreset)?.label || 'Período'
    : value
      ? `${format(value.start, 'd/M/yy')} → ${format(value.end, 'd/M/yy')}`
      : 'Rango custom'

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <style>{pickerCss}</style>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
          border: open ? `1px solid ${ACCENT_BORDER}` : '1px solid rgba(255,255,255,0.07)',
          background: open ? ACCENT_DIM : 'rgba(255,255,255,0.025)',
          color: open ? ACCENT : 'rgba(255,255,255,0.4)',
          fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        {displayLabel}
        <span style={{ fontSize: 8, opacity: 0.4 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 200,
          background: '#151820', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          display: 'flex', overflow: 'hidden', minWidth: 540,
        }}>
          {/* Presets column */}
          <div style={{ width: 160, borderRight: '1px solid rgba(255,255,255,0.06)', padding: '12px 8px' }}>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: 'rgba(255,255,255,0.2)', fontWeight: 700, padding: '4px 8px 10px' }}>Accesos rápidos</div>
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => applyPreset(p)}
                style={{
                  display: 'block', width: '100%', padding: '9px 12px',
                  border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: 7,
                  background: activePreset === p.key ? ACCENT_DIM : 'transparent',
                  color: activePreset === p.key ? ACCENT : 'rgba(255,255,255,0.4)',
                  fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat',
                }}
              >
                {p.label}
              </button>
            ))}
            <div style={{ margin: '10px 8px 4px', borderTop: '1px solid rgba(255,255,255,0.06)' }} />
            <button
              onClick={() => setActivePreset('custom')}
              style={{
                display: 'block', width: '100%', padding: '9px 12px',
                border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: 7,
                background: activePreset === 'custom' ? ACCENT_DIM : 'transparent',
                color: activePreset === 'custom' ? ACCENT : 'rgba(255,255,255,0.4)',
                fontSize: 12, fontWeight: 600, fontFamily: 'Montserrat',
              }}
            >
              Rango custom
            </button>
          </div>

          {/* Calendar */}
          <div style={{ padding: '12px 16px', background: '#0f111a' }}>
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleRangeSelect}
              numberOfMonths={2}
            />
          </div>
        </div>
      )}
    </div>
  )
}
