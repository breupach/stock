import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/contexto.js'
import { actualizarUsuario, crearUsuario } from '../../lib/apiUsuarios.js'
import { supabase } from '../../lib/supabase.js'

const ETIQUETA_ROL = { admin: 'Admin', operador: 'Operador' }
const campo = 'campo'

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
    <form onSubmit={enviar} className="tarjeta grid gap-3 sm:grid-cols-2">
      <h2 className="subtitulo sm:col-span-2">Nuevo usuario</h2>
      <label>
        <span className="etiqueta">Usuario</span>
        <input className={campo} autoCapitalize="none" value={datos.usuario} onChange={cambiar('usuario')} required />
      </label>
      <label>
        <span className="etiqueta">Nombre</span>
        <input className={campo} value={datos.nombre} onChange={cambiar('nombre')} required />
      </label>
      <label>
        <span className="etiqueta">Contraseña (mínimo 8)</span>
        <input className={campo} type="password" autoComplete="new-password" minLength={8} value={datos.contrasena} onChange={cambiar('contrasena')} required />
      </label>
      <label>
        <span className="etiqueta">Rol</span>
        <select className={campo} value={datos.rol} onChange={cambiar('rol')}>
          <option value="operador">Operador</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {error && <p role="alert" className="text-[13px] text-sin-stock sm:col-span-2">{error}</p>}
      <button type="submit" disabled={enviando} className="btn-accion justify-self-start sm:col-span-2">
        {enviando ? 'Creando…' : 'Crear usuario'}
      </button>
    </form>
  )
}

function FilaUsuario({ u, esYo, tieneCodigo, alCambiar }) {
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
    <li className="tarjeta">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {u.name} <span className="font-normal text-suave">@{u.username}</span>
            {esYo && <span className="ml-1 text-[11px] font-normal text-suave">(vos)</span>}
          </p>
          {u.role === 'admin' && (
            <p className="mt-1 text-[11px] text-suave">
              Código de seguridad:{' '}
              <b className={`font-semibold ${tieneCodigo ? 'text-disponible' : 'text-ultimas'}`}>{tieneCodigo ? 'activo' : 'pendiente'}</b>
            </p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${u.active ? 'text-disponible' : 'text-sin-stock'}`}>
          <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-current" />
          {u.active ? 'Activo' : 'Desactivado'}
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px]">
        <label className="flex items-center gap-2">
          Rol
          <select className="campo mt-0 w-auto py-1.5" value={u.role} disabled={esYo} onChange={(e) => aplicar({ rol: e.target.value }, 'Rol actualizado.')}>
            <option value="operador">{ETIQUETA_ROL.operador}</option>
            <option value="admin">{ETIQUETA_ROL.admin}</option>
          </select>
        </label>
        {!esYo && (
          <button type="button" className="btn-secundario" onClick={() => aplicar({ activo: !u.active }, u.active ? 'Usuario desactivado.' : 'Usuario activado.')}>
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
          <input type="password" autoComplete="new-password" placeholder="Nueva contraseña" minLength={8} className="campo mt-0 w-44 py-1.5" value={contrasena} onChange={(e) => setContrasena(e.target.value)} required />
          <button type="submit" className="btn-secundario">Cambiar</button>
        </form>
        {!esYo && tieneCodigo && (
          <button
            type="button"
            className="btn-secundario"
            onClick={() => aplicar({ restablecerCodigo: true }, 'Código restablecido. La próxima vez que entre, lo activa de nuevo.')}
          >
            Restablecer código
          </button>
        )}
      </div>
      {mensaje && <p className="mt-2 text-[13px] text-suave">{mensaje}</p>}
    </li>
  )
}

export default function Usuarios() {
  const { perfil } = useAuth()
  const [usuarios, setUsuarios] = useState(null)
  const [conCodigo, setConCodigo] = useState(new Set())

  const [version, setVersion] = useState(0)
  const cargar = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase.from('profiles').select('id, username, name, role, active').order('name'),
      supabase.rpc('usuarios_con_codigo'),
    ]).then(([perfiles, codigos]) => {
      if (!vigente) return
      setUsuarios(perfiles.data ?? [])
      setConCodigo(new Set(codigos.data ?? []))
    })
    return () => {
      vigente = false
    }
  }, [version])

  return (
    <div className="max-w-3xl space-y-4 md:space-y-6">
      <h1 className="titulo">Usuarios</h1>
      <FormularioAlta alCrear={cargar} />
      {usuarios === null ? (
        <p className="text-suave">Cargando…</p>
      ) : (
        <ul className="space-y-3">
          {usuarios.map((u) => (
            <FilaUsuario key={u.id} u={u} esYo={u.id === perfil.id} tieneCodigo={conCodigo.has(u.id)} alCambiar={cargar} />
          ))}
        </ul>
      )}
    </div>
  )
}
