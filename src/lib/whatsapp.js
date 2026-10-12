import { formatearCantidad } from './formato.js'

// Arma el texto de la consulta a partir de los productos del carrito.
// Cada item: { name, brand_name, model, cantidad }
export function armarMensaje(items, nombreNegocio = '') {
  const saludo = nombreNegocio ? `Hola ${nombreNegocio}, ` : 'Hola, '
  const lineas = items.map((item) => {
    const detalle = [item.name, item.brand_name, item.model].filter(Boolean).join(' · ')
    return `- ${formatearCantidad(item.cantidad)} × ${detalle}`
  })
  return `${saludo}quiero consultar por estos productos:\n${lineas.join('\n')}`
}

export function linkWhatsApp(numero, texto) {
  const soloDigitos = String(numero ?? '').replace(/\D/g, '')
  if (!soloDigitos) return null
  return `https://wa.me/${soloDigitos}?text=${encodeURIComponent(texto)}`
}
