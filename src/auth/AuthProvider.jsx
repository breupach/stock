import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './contexto.js'
import { pasoPendiente } from './codigo.js'

async function cargarPerfil(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, name, role, active')
    .eq('id', userId)
    .maybeSingle()
  return data?.active ? data : null
}

async function cargarPaso(perfil) {
  if (!perfil) return null
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return pasoPendiente(perfil, data)
}

export default function AuthProvider({ children }) {
  const [estado, setEstado] = useState({ cargando: true, session: null, perfil: null, paso: null })

  const aplicar = useCallback(async (session) => {
    const perfil = session ? await cargarPerfil(session.user.id) : null
    const paso = await cargarPaso(perfil)
    setEstado({ cargando: false, session, perfil, paso })
  }, [])

  // Vuelve a leer la sesión, por ejemplo después de ingresar el código de seguridad.
  const refrescar = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    await aplicar(data.session)
  }, [aplicar])

  useEffect(() => {
    let vigente = true
    const aplicarSiVigente = (session) => vigente && aplicar(session)

    supabase.auth.getSession().then(({ data }) => aplicarSiVigente(data.session))
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      // Diferido: llamar a Supabase dentro del callback puede bloquear el cliente.
      setTimeout(() => aplicarSiVigente(session), 0)
    })

    return () => {
      vigente = false
      suscripcion.subscription.unsubscribe()
    }
  }, [aplicar])

  return <AuthContext.Provider value={{ ...estado, refrescar }}>{children}</AuthContext.Provider>
}
