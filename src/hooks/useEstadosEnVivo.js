import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase.js'

// Escucha los cambios de estado (Disponible / Últimas / Sin stock) con Supabase
// Realtime. `alCambiar(productId, estado)` recibe cada cambio; `alReconectar()`
// corre si la conexión se cortó y volvió, porque en el corte se pudieron perder
// eventos y conviene volver a pedir los datos.
export function useEstadosEnVivo({ productoId, alCambiar, alReconectar }) {
  const cambiar = useRef(alCambiar)
  const reconectar = useRef(alReconectar)
  useEffect(() => {
    cambiar.current = alCambiar
    reconectar.current = alReconectar
  })

  useEffect(() => {
    let conectadoAntes = false
    const filtro = productoId ? { filter: `product_id=eq.${productoId}` } : {}
    const canal = supabase
      .channel(`estados-${productoId ?? 'todos'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_status', ...filtro }, ({ new: fila }) => {
        if (fila?.product_id) cambiar.current?.(fila.product_id, fila.status)
      })
      .subscribe((estado) => {
        if (estado !== 'SUBSCRIBED') return
        if (conectadoAntes) reconectar.current?.()
        conectadoAntes = true
      })
    return () => {
      supabase.removeChannel(canal)
    }
  }, [productoId])
}
