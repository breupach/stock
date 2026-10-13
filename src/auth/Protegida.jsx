import { Navigate, useLocation } from 'react-router'
import { RUTA_PASO } from './codigo.js'
import { useAuth } from './contexto.js'

// Protege una ruta del panel. Con soloAdmin, el operador ve un aviso en lugar de la pantalla.
export default function Protegida({ soloAdmin = false, children }) {
  const { cargando, perfil, paso } = useAuth()
  const location = useLocation()

  if (cargando) return <p className="p-6 text-suave">Cargando…</p>
  if (!perfil) return <Navigate to="/admin/login" replace state={{ desde: location.pathname }} />
  if (paso) return <Navigate to={RUTA_PASO[paso]} replace state={{ desde: location.pathname }} />
  if (soloAdmin && perfil.role !== 'admin') {
    return <p className="p-6 text-suave">Esta sección es solo para administradores.</p>
  }
  return children
}
