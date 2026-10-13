import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { guardarTema, leerTema, temaInicial } from '../lib/tema.js'
import { TemaContext } from './contexto.js'

// Envuelve toda la app: catálogo y panel comparten el tema elegido.
export default function TemaProvider({ children }) {
  const [oscuro, setOscuro] = useState(() => temaInicial())

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', oscuro)
    return () => document.documentElement.classList.remove('dark')
  }, [oscuro])

  // Mientras el cliente no elija, acompaña los cambios del sistema (por ejemplo, de noche).
  useEffect(() => {
    const consulta = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!consulta) return
    const alCambiar = (e) => !leerTema() && setOscuro(e.matches)
    consulta.addEventListener('change', alCambiar)
    return () => consulta.removeEventListener('change', alCambiar)
  }, [])

  const valor = useMemo(
    () => ({
      oscuro,
      alternar: () => {
        guardarTema(oscuro ? 'claro' : 'oscuro')
        setOscuro(!oscuro)
      },
    }),
    [oscuro],
  )
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}
