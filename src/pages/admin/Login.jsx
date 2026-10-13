import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ingresar } from '../../auth/acciones.js'
import { useAuth } from '../../auth/contexto.js'
import BotonTema from '../../components/BotonTema.jsx'
import { useConfiguracion } from '../../hooks/useConfiguracion.js'

export default function Login() {
  const { perfil } = useAuth()
  const config = useConfiguracion()
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
    <main className="relative mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-3.5 px-4">
      <div className="absolute top-3 right-3">
        <BotonTema className="border border-linea bg-superficie text-tinta hover:border-tinta focus-visible:outline-tinta" />
      </div>
      <div>
        {config?.nombre_negocio && <p className="text-[13px] text-suave">{config.nombre_negocio}</p>}
        <h1 className="titulo">Ingresar al panel</h1>
      </div>
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
    </main>
  )
}
