import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { ingresar } from '../../auth/acciones.js'
import { useAuth } from '../../auth/contexto.js'

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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-2xl font-semibold">Ingresar al panel</h1>
      <form onSubmit={enviar} className="space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Usuario</span>
          <input
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
            autoComplete="username"
            autoCapitalize="none"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            required
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            type="password"
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
            autoComplete="current-password"
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
            required
          />
        </label>
        {error && (
          <p role="alert" className="text-sm text-sin-stock">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="w-full rounded-md bg-marca px-4 py-3 font-medium text-white hover:bg-marca-oscuro disabled:opacity-60"
        >
          {enviando ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
