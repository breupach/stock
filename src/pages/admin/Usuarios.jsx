import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/contexto.js'
import { actualizarUsuario, crearUsuario } from '../../lib/apiUsuarios.js'
import { supabase } from '../../lib/supabase.js'

const ETIQUETA_ROL = { admin: 'Admin', operador: 'Operador' }
const campo = 'mt-1 block w-full rounded-md border border-stone-300 px-3 py-2'

function FormularioAlta({ alCrear }) {
  const vacio = { usuario: '', nombre: '', contrasena: '', rol: 'operador' }
  const [datos, setDatos] = useState(vacio)
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const cambiar = (k) => (e) => setDatos({ ...datos, [k]: e.target.value })

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    try {
      await crearUsuario(datos)
      setDatos(vacio)
      alCrear()
    } catch (err) {
      setError(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Nuevo usuario</h2>
      <label>
        <span className="text-sm font-medium">Usuario</span>
        <input className={campo} autoCapitalize="none" value={datos.usuario} onChange={cambiar('usuario')} required />
      </label>
      <label>
        <span className="text-sm font-medium">Nombre</span>
        <input className={campo} value={datos.nombre} onChange={cambiar('nombre')} required />
      </label>
      <label>
        <span className="text-sm font-medium">Contraseña (mínimo 8)</span>
        <input className={campo} type="password" autoComplete="new-password" minLength={8} value={datos.contrasena} onChange={cambiar('contrasena')} required />
      </label>
      <label>
        <span className="text-sm font-medium">Rol</span>
        <select className={campo} value={datos.rol} onChange={cambiar('rol')}>
          <option value="operador">Operador</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {error && <p role="alert" className="text-sm text-sin-stock sm:col-span-2">{error}</p>}
      <button type="submit" disabled={enviando} className="rounded-md bg-marca px-4 py-2.5 font-medium text-white disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
        {enviando ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  )
}

function FilaUsuario({ u, esYo, alCambiar }) {
  const [contrasena, setContrasena] = useState('')
  const [mensaje, setMensaje] = useState(null)

  async function aplicar(cambios, ok) {
    setMensaje(null)
    try {
      await actualizarUsuario(u.id, cambios)
      setMensaje(ok)
      alCambiar()
    } catch (err) {
      setMensaje(err.message)
    }
  }

  return (
    <li className="rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {u.name} <span className="text-sm font-normal text-stone-500">@{u.username}</span>
          {esYo && <span className="ml-2 text-xs text-stone-500">(vos)</span>}
        </p>
        <span className={`text-sm ${u.active ? 'text-disponible' : 'text-sin-stock'}`}>{u.active ? 'Activo' : 'Desactivado'}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          Rol
          <select className="rounded-md border border-stone-300 px-2 py-1.5" value={u.role} disabled={esYo} onChange={(e) => aplicar({ rol: e.target.value }, 'Rol actualizado.')}>
            <option value="operador">{ETIQUETA_ROL.operador}</option>
            <option value="admin">{ETIQUETA_ROL.admin}</option>
          </select>
        </label>
        {!esYo && (
          <button type="button" className="rounded-md border border-stone-300 px-3 py-1.5" onClick={() => aplicar({ activo: !u.active }, u.active ? 'Usuario desactivado.' : 'Usuario activado.')}>
            {u.active ? 'Desactivar' : 'Activar'}
          </button>
        )}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            aplicar({ contrasena }, 'Contraseña cambiada.').then(() => setContrasena(''))
          }}
        >
          <input type="password" autoComplete="new-password" placeholder="Nueva contraseña" minLength={8} className="w-40 rounded-md border border-stone-300 px-2 py-1.5" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
          <button type="submit" className="rounded-md border border-stone-300 px-3 py-1.5">Cambiar</button>
        </form>
      </div>
      {mensaje && <p className="mt-2 text-sm text-stone-600">{mensaje}</p>}
    </li>
  )
}

export default function Usuarios() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios] = useState(null)

  const [version, setVersion] = useState(0)
  const cargar = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let vigente = true
    supabase
      .from('profiles')
      .select('id, username, name, role, active')
      .order('name')
      .then(({ data }) => {
        if (vigente) setUsuarios(data ?? [])
      })
    return () => {
      vigente = false
    }
  }, [version])

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Usuarios</h1>
      <FormularioAlta alCrear={cargar} />
      {usuarios === null ? (
        <p className="text-stone-500">Cargando…</p>
      ) : (
        <ul className="space-y-3">
          {usuarios.map((u) => (
            <FilaUsuario key={u.id} u={u} esYo={u.id === perfil.id} alCambiar={cargar} />
          ))}
        </ul>
      )}
    </div>
  )
}
