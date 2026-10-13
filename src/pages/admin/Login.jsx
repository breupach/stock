import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ingresar } from '../../auth/acciones.js'
import { useAuth } from '../../auth/contexto.js'
import PantallaIngreso from '../../components/PantallaIngreso.jsx'

export default function Login() {
  const { perfil } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const destino = location.state?.desde ?? '/admin'
  if (perfil) return <Navigate to={destino} replace />

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const mensaje = await ingresar(usuario, contrasena)
    setEnviando(false)
    if (mensaje) setError(mensaje)
    else navigate(destino, { replace: true })
  }

  return (
    <PantallaIngreso titulo="Ingresar al panel">
      <form onSubmit={enviar} className="tarjeta space-y-4">
        <label className="block">
          <span className="etiqueta">Usuario</span>
          <input
            className="campo"
            autoComplete="username"
            autoCapitalize="none"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="etiqueta">Contraseña</span>
          <input
            type="password"
            className="campo"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-[13px] text-sin-stock">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando} className="btn-accion w-full py-3 text-sm">
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <p className="text-center text-[11px] text-suave">¿Te olvidaste la contraseña? Pedile al administrador que te la cambie.</p>
    </PantallaIngreso>
  )
}
