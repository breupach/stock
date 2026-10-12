// Sin decimales cuando el precio es redondo; si tiene centavos, siempre dos ($ 4.300,50).
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })
const pesosConCentavos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2 })

const cantidad = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 3 })

export function formatearPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  const n = Number(valor)
  return (Number.isInteger(n) ? pesos : pesosConCentavos).format(n)
}

export function formatearCantidad(valor) {
  if (valor === null || valor === undefined || valor === '') return '—'
  return cantidad.format(Number(valor))
}
