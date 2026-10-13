import { emailDeUsuario, normalizarUsuario, usuarioValido } from '../../src/lib/usuario.js'

const ROLES = ['admin', 'operador']
const BLOQUEO = '876000h' // ~100 años: Supabase no tiene "bloqueo permanente"

const respuesta = (status, body) => ({ status, body })

// Nivel de seguridad de la sesión: aal2 si pasó el código de Google Authenticator.
// El token ya fue validado con getUser; acá solo se lee lo que dice.
export function nivelDelToken(token) {
  try {
    const carga = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return carga.aal ?? 'aal1'
  } catch {
    return 'aal1'
  }
}
const error = (status, codigo, mensaje) => respuesta(status, { error: codigo, mensaje })

// Lógica de /api/users, separada del handler de Vercel para poder probarla.
// `admin` es un cliente de Supabase creado con la clave de servicio.
export async function manejarUsuarios({ metodo, token, cuerpo, admin }) {
  if (!token) return error(401, 'sin_sesion', 'Tenés que ingresar al panel.')

  const { data: auth, error: errorAuth } = await admin.auth.getUser(token)
  if (errorAuth || !auth?.user) return error(401, 'sin_sesion', 'Tu sesión venció. Volvé a ingresar.')

  const { data: quien } = await admin.from('profiles').select('role, active').eq('id', auth.user.id).maybeSingle()
  if (!quien?.active || quien.role !== 'admin') {
    return error(403, 'no_autorizado', 'Solo un administrador puede gestionar usuarios.')
  }
  if (nivelDelToken(token) !== 'aal2') {
    return error(403, 'falta_codigo', 'Ingresá el código de seguridad para gestionar usuarios.')
  }

  if (metodo === 'POST') return crear(admin, cuerpo ?? {})
  if (metodo === 'PATCH') return actualizar(admin, cuerpo ?? {}, auth.user.id)
  return error(405, 'metodo_invalido', 'Método no permitido.')
}

async function crear(admin, { usuario, nombre, contrasena, rol }) {
  if (!usuarioValido(usuario)) {
    return error(400, 'usuario_invalido', 'El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.')
  }
  if (!nombre?.trim()) return error(400, 'nombre_obligatorio', 'Falta el nombre.')
  if (!contrasena || contrasena.length < 8) {
    return error(400, 'contrasena_corta', 'La contraseña debe tener al menos 8 caracteres.')
  }
  if (!ROLES.includes(rol)) return error(400, 'rol_invalido', 'El rol debe ser admin u operador.')

  const { data, error: errorAlta } = await admin.auth.admin.createUser({
    email: emailDeUsuario(usuario),
    password: contrasena,
    email_confirm: true,
  })
  if (errorAlta) {
    const existe = /already|registered|exists/i.test(errorAlta.message)
    return existe
      ? error(409, 'usuario_existente', 'Ya existe un usuario con ese nombre.')
      : error(500, 'error_alta', 'No se pudo crear el usuario.')
  }

  const perfil = { id: data.user.id, username: normalizarUsuario(usuario), name: nombre.trim(), role: rol, active: true }
  const { error: errorPerfil } = await admin.from('profiles').insert(perfil)
  if (errorPerfil) {
    await admin.auth.admin.deleteUser(data.user.id)
    return error(500, 'error_alta', 'No se pudo crear el usuario.')
  }
  return respuesta(201, perfil)
}

async function actualizar(admin, { id, nombre, rol, activo, contrasena, restablecerCodigo }, idPropio) {
  if (!id) return error(400, 'falta_id', 'Falta el usuario a modificar.')
  if (restablecerCodigo) return restablecer(admin, id, idPropio)
  if (id === idPropio && (rol !== undefined || activo === false)) {
    return error(400, 'propio_usuario', 'No podés cambiar tu propio rol ni desactivarte.')
  }

  const cambios = {}
  if (nombre !== undefined) {
    if (!nombre.trim()) return error(400, 'nombre_obligatorio', 'Falta el nombre.')
    cambios.name = nombre.trim()
  }
  if (rol !== undefined) {
    if (!ROLES.includes(rol)) return error(400, 'rol_invalido', 'El rol debe ser admin u operador.')
    cambios.role = rol
  }
  if (activo !== undefined) cambios.active = Boolean(activo)

  const datosAuth = {}
  if (contrasena !== undefined) {
    if (contrasena.length < 8) return error(400, 'contrasena_corta', 'La contraseña debe tener al menos 8 caracteres.')
    datosAuth.password = contrasena
  }
  if (activo !== undefined) datosAuth.ban_duration = activo ? 'none' : BLOQUEO

  if (Object.keys(datosAuth).length > 0) {
    const { error: errorAuth } = await admin.auth.admin.updateUserById(id, datosAuth)
    if (errorAuth) return error(500, 'error_actualizacion', 'No se pudo actualizar el usuario.')
  }

  if (Object.keys(cambios).length > 0) {
    const { data, error: errorPerfil } = await admin
      .from('profiles')
      .update(cambios)
      .eq('id', id)
      .select('id, username, name, role, active')
      .maybeSingle()
    if (errorPerfil) return error(500, 'error_actualizacion', 'No se pudo actualizar el usuario.')
    if (!data) return error(404, 'usuario_inexistente', 'El usuario no existe.')
    return respuesta(200, data)
  }
  return respuesta(200, { id })
}

// Borra el código de Google Authenticator de otro usuario (perdió o cambió el
// celular). Al volver a entrar, la app le pide que lo active de nuevo.
async function restablecer(admin, id, idPropio) {
  if (id === idPropio) return error(400, 'propio_usuario', 'No podés restablecer tu propio código.')
  const { data, error: errorLista } = await admin.auth.admin.mfa.listFactors({ userId: id })
  if (errorLista) return error(500, 'error_actualizacion', 'No se pudo restablecer el código.')
  for (const factor of data?.factors ?? []) {
    const { error: errorBorrado } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: id })
    if (errorBorrado) return error(500, 'error_actualizacion', 'No se pudo restablecer el código.')
  }
  return respuesta(200, { id })
}
