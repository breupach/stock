import { supabase } from './supabase.js'

export const COLUMNAS_MOVIMIENTO =
  'id, product_id, type, quantity, balance_after, reason, reference, user_id, created_at, reverses_id, products(name, sku, unit)'

// Agrega a cada movimiento si ya fue revertido. Se consulta aparte porque la
// reversión puede ser posterior a los movimientos que se están mostrando.
export async function marcarRevertidos(movimientos) {
  const ids = movimientos.map((m) => m.id)
  if (!ids.length) return movimientos
  const { data } = await supabase.from('stock_movements').select('reverses_id').in('reverses_id', ids)
  const revertidos = new Set((data ?? []).map((r) => r.reverses_id))
  return movimientos.map((m) => ({ ...m, revertido: revertidos.has(m.id) }))
}
