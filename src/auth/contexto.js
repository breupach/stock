import { createContext, useContext } from 'react'

export const AuthContext = createContext({ cargando: true, session: null, perfil: null })

export function useAuth() {
  return useContext(AuthContext)
}
