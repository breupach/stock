import { createContext, useContext } from 'react'

export const TemaContext = createContext({ oscuro: false, alternar() {} })

export const useTema = () => useContext(TemaContext)
