import Anthropic from '@anthropic-ai/sdk'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).end()

  const auth = await requireAuth(req, res)
  if (!auth) return

  const { messages, context } = req.body

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY no configurada en variables de entorno' })
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages requerido' })
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const dataStr = context?.data ? JSON.stringify(context.data, null, 2) : 'Sin datos'

  const systemPrompt = `Sos un analista de datos experto trabajando para Escalamos.io, una agencia de marketing argentina. Tu rol es responder preguntas sobre el negocio basándote exclusivamente en los datos reales del dashboard.

Módulo activo: ${context?.module || 'General'}
Período seleccionado: ${context?.period || 'No especificado'}

Datos disponibles del período:
${dataStr}

Reglas:
- Respondé siempre en español, tono directo y profesional
- Citá números específicos de los datos cuando sea relevante
- Orientá las respuestas a la toma de decisiones
- Si algo no está en los datos disponibles, decilo claramente en vez de inventar
- Máximo 4 párrafos por respuesta, preferí bullets para listas
- No uses frases genéricas de motivación, hablá con datos`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })

    res.json({ content: response.content[0].text })
  } catch (e) {
    console.error('Chat API error:', e)
    res.status(500).json({ error: e.message || 'Error interno' })
  }
}
