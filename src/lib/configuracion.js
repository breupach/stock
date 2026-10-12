import { supabase } from './supabase.js'

// Configuración pública (número de WhatsApp y nombre del negocio). Se pide una
// vez por visita y se comparte entre pantallas.
let pedido = null

export function cargarConfiguracion() {
  pedido ??= supabase
    .from('settings')
    .select('key, value')
    .then(({ data, error }) => {
      if (error) {
        pedido = null
        return {}
      }
      return Object.fromEntries(data.map((s) => [s.key, s.value]))
    })
  return pedido
}

export function olvidarConfiguracion() {
  pedido = null
}
