import { useState, useRef, useEffect } from 'react'

const ACCENT = '#2D7AFF'

const MODULE_LABELS = {
  overview: 'Overview',
  marketing: 'Marketing',
  fulfillment: 'Fulfillment',
  finanzas: 'Finanzas',
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M3 4.5C3 3.67 3.67 3 4.5 3H15.5C16.33 3 17 3.67 17 4.5V12.5C17 13.33 16.33 14 15.5 14H11L7 17V14H4.5C3.67 14 3 13.33 3 12.5V4.5Z"
        stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round" />
      <line x1="6" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="6" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 8L14 2L10 8L14 14L2 8Z" fill="currentColor" opacity="0.9" />
    </svg>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
    }}>
      <div style={{
        maxWidth: '85%',
        padding: '10px 14px',
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        background: isUser ? ACCENT : 'rgba(255,255,255,0.06)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.08)',
        fontSize: 13,
        color: isUser ? '#fff' : 'rgba(255,255,255,0.8)',
        lineHeight: 1.6,
        fontWeight: 500,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.content}
      </div>
    </div>
  )
}

export function ChatPanel({ activeModule, dateRange, contextData }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, open])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  // Reset conversation when module changes
  useEffect(() => {
    setMessages([])
    setError(null)
  }, [activeModule])

  function formatPeriod() {
    if (!dateRange) return 'período actual'
    const fmt = (d) => d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    return `${fmt(dateRange.start)} – ${fmt(dateRange.end)}`
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages,
          context: {
            module: MODULE_LABELS[activeModule] || activeModule,
            period: formatPeriod(),
            data: contextData || {},
          },
        }),
      })
      if (!resp.ok) throw new Error(`Error ${resp.status}`)
      const data = await resp.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.content }])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const moduleLabel = MODULE_LABELS[activeModule] || activeModule

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: open ? 'rgba(45,122,255,0.3)' : ACCENT,
          border: open ? `1px solid ${ACCENT}` : 'none',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: open ? 'none' : '0 4px 20px rgba(45,122,255,0.4)',
          transition: 'all 0.2s',
          zIndex: 1000,
          flexShrink: 0,
        }}
        title={open ? 'Cerrar chat' : 'Abrir chat'}
      >
        {open
          ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3L13 13M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          : <ChatIcon />
        }
      </button>

      {/* Panel */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: 380,
          height: '100vh',
          background: '#0E1220',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 999,
          boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(45,122,255,0.15)', border: '1px solid rgba(45,122,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: ACCENT }}>
              <ChatIcon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Chat</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>
                {moduleLabel} · {formatPeriod()}
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); setError(null) }}
                style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.3)', fontSize: 10, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 600 }}
              >
                limpiar
              </button>
            )}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 16px 8px',
          }}>
            {messages.length === 0 && (
              <div style={{ padding: '20px 4px' }}>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                  Preguntame sobre los datos de <span style={{ color: ACCENT }}>{moduleLabel}</span>. Tengo acceso a todos los KPIs del período seleccionado.
                </p>
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    '¿Cómo está el margen este mes?',
                    '¿Qué canales están generando más leads?',
                    '¿Cuál es el CAC vs el mes anterior?',
                  ].map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(s); inputRef.current?.focus() }}
                      style={{
                        padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                        background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)',
                        fontSize: 12, cursor: 'pointer', fontFamily: 'Montserrat', fontWeight: 500,
                        textAlign: 'left', transition: 'all 0.12s',
                      }}
                    >{s}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => <Message key={i} msg={msg} />)}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }}>
                <div style={{ padding: '10px 16px', borderRadius: '14px 14px 14px 4px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <span style={{ fontSize: 18, color: ACCENT, letterSpacing: 4, animation: 'pulse 1s infinite' }}>···</span>
                </div>
              </div>
            )}
            {error && (
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: '#FF6B6B' }}>Error: {error}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '12px 16px 20px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0,
          }}>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'flex-end',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 12,
              padding: '8px 8px 8px 14px',
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Preguntá sobre los datos..."
                rows={1}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  fontFamily: 'Montserrat, sans-serif',
                  fontWeight: 500,
                  resize: 'none',
                  lineHeight: 1.5,
                  maxHeight: 120,
                  overflowY: 'auto',
                }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: input.trim() && !loading ? ACCENT : 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: input.trim() && !loading ? '#fff' : 'rgba(255,255,255,0.2)',
                  cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                <SendIcon />
              </button>
            </div>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', margin: '6px 2px 0', fontWeight: 500 }}>Enter para enviar · Shift+Enter nueva línea</p>
          </div>
        </div>
      )}
    </>
  )
}
