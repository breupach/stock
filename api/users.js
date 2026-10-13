import { createClient } from '@supabase/supabase-js'
import { claveDeServicioValida, manejarUsuarios } from './_lib/usuarios.js'

// Función serverless de Vercel: altas y cambios de usuarios. Usa la clave de
// servicio, que solo existe en las variables del servidor.
export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !claveServicio) {
    return res.status(500).json({ error: 'sin_configurar', mensaje: 'Falta configurar el servidor.' })
  }
  if (!claveDeServicioValida(claveServicio)) {
    return res.status(500).json({
      error: 'clave_invalida',
      mensaje: 'La clave secreta de Supabase configurada en Vercel no es válida.',
    })
  }

  const admin = createClient(url, claveServicio, { auth: { persistSession: false, autoRefreshToken: false } })
  const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  const { status, body } = await manejarUsuarios({ metodo: req.method, token, cuerpo: req.body, admin })
  return res.status(status).json(body)
}
