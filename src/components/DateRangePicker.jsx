import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format } from 'date-fns'
import { PRESETS } from '../lib/dates.js'

const ACCENT = '#2D7AFF'
const ACCENT_DIM = 'rgba(45,122,255,0.15)'
const ACCENT_BORDER = 'rgba(45,122,255,0.3)'

const pickerCss = `
.rdp-root {
  --rdp-accent-color: #2D7AFF;
  --rdp-accent-background-color: rgba(45,122,255,0.18);
  --rdp-day-width: 36px;
  --rdp-day-height: 36px;
  --rdp-selected-border: none;
  font-family: 'Montserrat', sans-serif;
  font-size: 12px;
  color: rgba(255,255,255,0.75);
  margin: 0;
}
.rdp-months { display: flex; gap: 24px; }
.rdp-month_caption {
  color: rgba(255,255,255,0.55);
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 1px;
  padding-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rdp-nav { display: flex; gap: 4px; }
.rdp-button_previous, .rdp-button_next {
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Montserrat', sans-serif;
}
.rdp-button_previous:hover, .rdp-button_next:hover { color: #fff; background: rgba(255,255,255,0.06); }
.rdp-month_grid { border-collapse: collapse; width: 100%; }
.rdp-weekdays { display: table-row; }
.rdp-weekday {
  color: rgba(255,255,255,0.2);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  width: 36px;
  height: 28px;
  text-align: center;
  padding: 0;
}
.rdp-week { display: table-row; }
.rdp-day { width: 36px; height: 36px; padding: 1px; text-align: center; }
.rdp-day_button {
  appearance: none;
  -webkit-appearance: none;
  background: transparent;
  border: none;
  outline: none;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 500;
  color: rgba(255,255,255,0.65);
  box-sizing: border-box;
  transition: background 0.12s, color 0.12s;
}
.rdp-day_button:hover { background: rgba(45,122,255,0.2); color: #fff; }
.rdp-selected .rdp-day_button { background: #2D7AFF; color: #fff; font-weight: 700; }
.rdp-range_start .rdp-day_button, .rdp-range_end .rdp-day_button { background: #2D7AFF; color: #fff; font-weight: 700; }
.rdp-range_middle .rdp-day_button { background: rgba(45,122,255,0.15); color: rgba(255,255,255,0.85); border-radius: 0; }
.rdp-outside .rdp-day_button { color: rgba(255,255,255,0.15); }
.rdp-today .rdp-day_button { color: #2D7AFF; font-weight: 800; }
.rdp-disabled .rdp-day_button { color: rgba(255,255,255,0.1); cursor: default; }
`

export function DateRangePicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState('mtd')
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
    setActiveKey(preset.key)
    setRange(null)
    setOpen(false)
    onChange(preset.getRange())
  }

  function handleSelectClick() {
    setActiveKey('custom')
    setOpen(!open)
  }

  function handleRangeSelect(r) {
    setRange(r)
    if (r?.from && r?.to) {
      onChange({ start: r.from, end: r.to })
      setOpen(false)
    }
  }

  const customLabel = activeKey === 'custom' && value
    ? `${format(value.start, 'd/M/yy')} → ${format(value.end, 'd/M/yy')}`
    : 'Seleccionar'

  const btnBase = {
    padding: '8px 16px', borderRadius: 8, border: 'none',
    fontSize: 12, fontWeight: 600, fontFamily: "'Montserrat'",
    cursor: 'pointer', transition: 'all 0.15s',
  }

  return (
    <div ref={ref} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <style>{pickerCss}</style>

      {/* Button group */}
      <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: 3, border: '1px solid rgba(255,255,255,0.04)' }}>
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => applyPreset(p)}
            style={{
              ...btnBase,
              background: activeKey === p.key ? ACCENT_DIM : 'transparent',
              color: activeKey === p.key ? ACCENT : 'rgba(255,255,255,0.25)',
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={handleSelectClick}
          style={{
            ...btnBase,
            background: activeKey === 'custom' ? ACCENT_DIM : 'transparent',
            color: activeKey === 'custom' ? ACCENT : 'rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {customLabel}
          <span style={{ fontSize: 8, opacity: 0.5 }}>▼</span>
        </button>
      </div>

      {/* Calendar dropdown — only for "Seleccionar" */}
      {open && activeKey === 'custom' && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
          background: '#151820', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          padding: '16px 20px',
        }}>
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleRangeSelect}
            numberOfMonths={2}
          />
        </div>
      )}
    </div>
  )
}
