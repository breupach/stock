// El carrito vive solo en el navegador: [{ productId, cantidad }].
const CLAVE = 'stock.carrito'

export function leerCarrito(almacen = globalThis.localStorage) {
  try {
    const items = JSON.parse(almacen?.getItem(CLAVE) ?? '[]')
    return Array.isArray(items)
      ? items.filter((i) => Number.isInteger(i?.productId) && Number(i.cantidad) > 0)
      : []
  } catch {
    return []
  }
}

export function guardarCarrito(items, almacen = globalThis.localStorage) {
  try {
    almacen?.setItem(CLAVE, JSON.stringify(items))
  } catch {
    // Navegación privada o almacenamiento lleno: el carrito sigue en memoria.
  }
}

// Sumar al carrito: si el producto ya está, se acumula la cantidad.
export function agregarItem(items, productId, cantidad) {
  const existe = items.find((i) => i.productId === productId)
  if (!existe) return [...items, { productId, cantidad }]
  return items.map((i) => (i.productId === productId ? { ...i, cantidad: redondear(i.cantidad + cantidad) } : i))
}

export function cambiarCantidad(items, productId, cantidad) {
  if (!(cantidad > 0)) return quitarItem(items, productId)
  return items.map((i) => (i.productId === productId ? { ...i, cantidad } : i))
}

export const quitarItem = (items, productId) => items.filter((i) => i.productId !== productId)

const redondear = (n) => Math.round(n * 1000) / 1000

// Cantidad válida para la unidad del producto: entera para "unidad", hasta 3 decimales si no.
export function cantidadValida(texto, unidad) {
  const n = Number(String(texto ?? '').trim().replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return null
  if (unidad === 'unidad' && !Number.isInteger(n)) return null
  return redondear(n)
}

export function totalEstimado(items, productos) {
  return items.reduce((suma, i) => {
    const p = productos[i.productId]
    return p ? suma + Number(p.price) * i.cantidad : suma
  }, 0)
}
