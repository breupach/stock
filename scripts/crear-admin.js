// Crea el primer usuario administrador. Uso:
//   node --env-file=.env.local scripts/crear-admin.js <usuario> "<Nombre>" <contraseña>
import { createClient } from '@supabase/supabase-js'
import { emailDeUsuario, normalizarUsuario, usuarioValido } from '../src/lib/usuario.js'

const [usuario, nombre, contrasena] = process.argv.slice(2)
const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!usuario || !nombre || !contrasena) {
  console.error('Uso: node --env-file=.env.local scripts/crear-admin.js <usuario> "<Nombre>" <contraseña>')
  process.exit(1)
}
if (!usuarioValido(usuario)) {
  console.error('El usuario debe tener de 3 a 30 caracteres: letras, números, punto, guion o guion bajo.')
  process.exit(1)
}
if (contrasena.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}
if (!url || !serviceKey) {
  console.error('Faltan VITE_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } })

const { data, error } = await admin.auth.admin.createUser({
  email: emailDeUsuario(usuario),
  password: contrasena,
  email_confirm: true,
})
if (error) {
  console.error('No se pudo crear el usuario:', error.message)
  process.exit(1)
}

const { error: errorPerfil } = await admin.from('profiles').insert({
  id: data.user.id,
  username: normalizarUsuario(usuario),
  name: nombre,
  role: 'admin',
})
if (errorPerfil) {
  await admin.auth.admin.deleteUser(data.user.id)
  console.error('No se pudo crear el perfil:', errorPerfil.message)
  process.exit(1)
}

console.log(`Administrador "${normalizarUsuario(usuario)}" creado.`)
