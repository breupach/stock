import { beforeEach, describe, expect, it, vi } from 'vitest'
import { manejarUsuarios } from './usuarios.js'

const ADMIN_ID = 'admin-1'

// Token con la forma de un JWT; solo importa el nivel de seguridad (aal).
const token = (aal) => `cabecera.${Buffer.from(JSON.stringify({ sub: ADMIN_ID, aal })).toString('base64url')}.firma`
const CON_CODIGO = token('aal2')
const SIN_CODIGO = token('aal1')

// Cliente de Supabase falso: guarda perfiles en memoria y registra las llamadas a Auth.
function clienteFalso(perfiles) {
  const tabla = new Map(perfiles.map((p) => [p.id, { ...p }]))
  const consulta = () => {
    const q = { filtroId: null, cambios: null }
    const api = {
      select: () => api,
      eq: (_col, id) => ((q.filtroId = id), api),
      update: (cambios) => ((q.cambios = cambios), api),
      insert: async (fila) => (tabla.set(fila.id, fila), { error: null }),
      maybeSingle: async () => {
        const fila = tabla.get(q.filtroId)
        if (fila && q.cambios) Object.assign(fila, q.cambios)
        return { data: fila ? { ...fila } : null, error: null }
      },
    }
    return api
  }
  return {
    tabla,
    from: () => consulta(),
    auth: {
      getUser: vi.fn(async (token) =>
        token === CON_CODIGO || token === SIN_CODIGO ? { data: { user: { id: ADMIN_ID } }, error: null } : { data: null, error: new Error('jwt') },
      ),
      admin: {
        createUser: vi.fn(async ({ email }) =>
          email.startsWith('repetido@')
            ? { data: null, error: new Error('A user with this email address has already been registered') }
            : { data: { user: { id: 'nuevo-1' } }, error: null },
        ),
        updateUserById: vi.fn(async () => ({ error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
        mfa: {
          listFactors: vi.fn(async () => ({ data: { factors: [{ id: 'f1' }, { id: 'f2' }] }, error: null })),
          deleteFactor: vi.fn(async () => ({ data: null, error: null })),
        },
      },
    },
  }
}

let admin
beforeEach(() => {
  admin = clienteFalso([
    { id: ADMIN_ID, username: 'admin', name: 'Admin', role: 'admin', active: true },
    { id: 'op-1', username: 'juan', name: 'Juan', role: 'operador', active: true },
  ])
})

const llamar = (metodo, cuerpo, tk = CON_CODIGO) => manejarUsuarios({ metodo, token: tk, cuerpo, admin })

describe('/api/users', () => {
  it('rechaza sin sesión o con sesión inválida', async () => {
    expect((await llamar('POST', {}, '')).status).toBe(401)
    expect((await llamar('POST', {}, 'otro')).status).toBe(401)
  })

  it('rechaza a quien no es admin', async () => {
    admin.tabla.get(ADMIN_ID).role = 'operador'
    expect((await llamar('POST', {})).status).toBe(403)
  })

  it('rechaza al admin que no ingresó el código de seguridad', async () => {
    const r = await llamar('POST', { usuario: 'maria', nombre: 'María', contrasena: 'segura123', rol: 'operador' }, SIN_CODIGO)
    expect(r.status).toBe(403)
    expect(r.body.error).toBe('falta_codigo')
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
  })

  it('crea un usuario con email interno y perfil', async () => {
    const r = await llamar('POST', { usuario: 'Maria', nombre: ' María ', contrasena: 'segura123', rol: 'operador' })
    expect(r.status).toBe(201)
    expect(admin.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'maria@usuarios.interno', password: 'segura123', email_confirm: true }),
    )
    expect(admin.tabla.get('nuevo-1')).toMatchObject({ username: 'maria', name: 'María', role: 'operador', active: true })
  })

  it('valida los datos del alta', async () => {
    expect((await llamar('POST', { usuario: 'x', nombre: 'X', contrasena: 'segura123', rol: 'operador' })).body.error).toBe('usuario_invalido')
    expect((await llamar('POST', { usuario: 'pepe', nombre: 'Pepe', contrasena: 'corta', rol: 'operador' })).body.error).toBe('contrasena_corta')
    expect((await llamar('POST', { usuario: 'pepe', nombre: 'Pepe', contrasena: 'segura123', rol: 'jefe' })).body.error).toBe('rol_invalido')
    expect((await llamar('POST', { usuario: 'repetido', nombre: 'R', contrasena: 'segura123', rol: 'operador' })).status).toBe(409)
  })

  it('desactiva bloqueando el acceso y reactiva', async () => {
    expect((await llamar('PATCH', { id: 'op-1', activo: false })).status).toBe(200)
    expect(admin.auth.admin.updateUserById).toHaveBeenLastCalledWith('op-1', { ban_duration: '876000h' })
    expect(admin.tabla.get('op-1').active).toBe(false)
    await llamar('PATCH', { id: 'op-1', activo: true })
    expect(admin.auth.admin.updateUserById).toHaveBeenLastCalledWith('op-1', { ban_duration: 'none' })
  })

  it('cambia rol y contraseña', async () => {
    await llamar('PATCH', { id: 'op-1', rol: 'admin', contrasena: 'nueva-clave' })
    expect(admin.tabla.get('op-1').role).toBe('admin')
    expect(admin.auth.admin.updateUserById).toHaveBeenCalledWith('op-1', { password: 'nueva-clave' })
  })

  it('no deja que el admin se quite el rol ni se desactive', async () => {
    expect((await llamar('PATCH', { id: ADMIN_ID, rol: 'operador' })).body.error).toBe('propio_usuario')
    expect((await llamar('PATCH', { id: ADMIN_ID, activo: false })).body.error).toBe('propio_usuario')
    expect((await llamar('PATCH', { id: ADMIN_ID, contrasena: 'otra-clave' })).status).toBe(200)
  })

  it('restablece el código de otro admin borrando sus factores', async () => {
    expect((await llamar('PATCH', { id: 'op-1', restablecerCodigo: true })).status).toBe(200)
    expect(admin.auth.admin.mfa.listFactors).toHaveBeenCalledWith({ userId: 'op-1' })
    expect(admin.auth.admin.mfa.deleteFactor).toHaveBeenCalledWith({ id: 'f1', userId: 'op-1' })
    expect(admin.auth.admin.mfa.deleteFactor).toHaveBeenCalledWith({ id: 'f2', userId: 'op-1' })
  })

  it('no deja que el admin restablezca su propio código', async () => {
    expect((await llamar('PATCH', { id: ADMIN_ID, restablecerCodigo: true })).body.error).toBe('propio_usuario')
    expect(admin.auth.admin.mfa.deleteFactor).not.toHaveBeenCalled()
  })
})
