import { supabase } from './supabase.js'

async function llamar(metodo, cuerpo) {
  const { data } = await supabase.auth.getSession()
  const respuesta = await fetch('/api/users', {
    method: metodo,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
    },
    body: JSON.stringify(cuerpo),
  })
  const json = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(json.mensaje ?? 'No se pudo completar la operación.')
  return json
}

export const crearUsuario = (datos) => llamar('POST', datos)
export const actualizarUsuario = (id, cambios) => llamar('PATCH', { id, ...cambios })
