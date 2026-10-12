import { supabase } from '../lib/supabase.js'
import { emailDeUsuario, usuarioValido } from '../lib/usuario.js'

// Devuelve null si entró, o un mensaje de error para mostrar.
export async function ingresar(usuario, contrasena) {
  if (!usuarioValido(usuario) || !contrasena) return 'Usuario o contraseña incorrectos.'

  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailDeUsuario(usuario),
    password: contrasena,
  })
  if (error) {
    return error.status === 400 ? 'Usuario o contraseña incorrectos.' : 'No se pudo ingresar. Probá de nuevo.'
  }

  const { data: perfil } = await supabase
    .from('profiles')
    .select('active')
    .eq('id', data.user.id)
    .maybeSingle()
  if (!perfil?.active) {
    await supabase.auth.signOut()
    return 'Tu usuario no tiene acceso al panel.'
  }
  return null
}

export function salir() {
  return supabase.auth.signOut()
}
