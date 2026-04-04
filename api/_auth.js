import { verifyToken } from '@clerk/backend'

/**
 * Verifica el JWT de Clerk en el header Authorization.
 * Retorna el payload si es válido, o responde 401 y retorna null.
 */
export async function requireAuth(req, res) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No autorizado' })
    return null
  }
  const token = authHeader.slice(7)
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY })
    return payload
  } catch {
    res.status(401).json({ error: 'Token inválido' })
    return null
  }
}
