import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { AuthContext } from './contexto.js'

async function cargarPerfil(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, name, role, active')
    .eq('id', userId)
    .maybeSingle()
  return data?.active ? data : null
}

export default function AuthProvider({ children }) {
  const [estado, setEstado] = useState({ cargando: true, session: null, perfil: null })

  useEffect(() => {
    let vigente = true

    async function aplicar(session) {
      const perfil = session ? await cargarPerfil(session.user.id) : null
      if (vigente) setEstado({ cargando: false, session, perfil })
    }

    supabase.auth.getSession().then(({ data }) => aplicar(data.session))
    const { data: suscripcion } = supabase.auth.onAuthStateChange((_evento, session) => {
      // Diferido: llamar a Supabase dentro del callback puede bloquear el cliente.
      setTimeout(() => aplicar(session), 0)
    })

    return () => {
      vigente = false
      suscripcion.subscription.unsubscribe()
    }
  }, [])

  return <AuthContext.Provider value={estado}>{children}</AuthContext.Provider>
}
