import { createContext, useContext } from 'react'

export const AuthContext = createContext({ cargando: true, session: null, perfil: null, paso: null, refrescar: async () => {} })

export function useAuth() {
  return useContext(AuthContext)
}
