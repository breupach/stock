// Misma regla que public.calcular_estado en la base. El catálogo recibe el estado
// ya calculado; esta copia sirve al panel, que sí conoce la cantidad.
export function calcularEstado(stock, minStock) {
  const s = Number(stock)
  if (s <= 0) return 'sin_stock'
  if (s <= Number(minStock)) return 'ultimas'
  return 'disponible'
}

export const ETIQUETA_ESTADO = {
  disponible: 'Disponible',
  ultimas: 'Últimas unidades',
  sin_stock: 'Sin stock',
}
