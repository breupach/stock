import { useEffect, useState } from 'react'
import { cargarConfiguracion } from '../lib/configuracion.js'

export function useConfiguracion() {
  const [config, setConfig] = useState(null)
  useEffect(() => {
    let vigente = true
    cargarConfiguracion().then((c) => vigente && setConfig(c))
    return () => {
      vigente = false
    }
  }, [])
  return config
}
