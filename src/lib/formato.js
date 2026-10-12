const pesos = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
})

const cantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 })

export function formatearPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return pesos.format(Number(valor))
}

export function formatearCantidad(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return cantidad.format(Number(valor))
}
