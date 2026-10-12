// Supabase Auth identifica a cada usuario por email. La app usa nombres de
// usuario, así que arma un email interno que nadie necesita conocer.
export const DOMINIO_USUARIOS = 'usuarios.interno'

export function normalizarUsuario(usuario) {
  return String(usuario ?? '').trim().toLowerCase()
}

export function usuarioValido(usuario) {
  return /^[a-z0-9._-]{3,30}$/.test(normalizarUsuario(usuario))
}

export function emailDeUsuario(usuario) {
  return `${normalizarUsuario(usuario)}@${DOMINIO_USUARIOS}`
}
