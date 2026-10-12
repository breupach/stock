// Filtros del catálogo público. Viven en la URL para que volver desde una ficha
// deje el listado como estaba.
export function leerFiltros(parametros) {
  return {
    texto: parametros.get('q') ?? '',
    marca: parametros.get('marca') ?? '',
    categoria: parametros.get('categoria') ?? '',
    soloDisponibles: parametros.get('disponibles') === '1',
  }
}

export function escribirFiltros({ texto, marca, categoria, soloDisponibles }) {
  const p = new URLSearchParams()
  if (texto) p.set('q', texto)
  if (marca) p.set('marca', marca)
  if (categoria) p.set('categoria', categoria)
  if (soloDisponibles) p.set('disponibles', '1')
  return p
}

const normalizar = (s) =>
  (s ?? '')
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

// "Solo disponibles" incluye las últimas unidades: también se pueden pedir.
export function filtrarCatalogo(productos, { texto = '', marca = '', categoria = '', soloDisponibles = false } = {}) {
  const palabras = normalizar(texto).split(/\s+/).filter(Boolean)
  return productos.filter((p) => {
    if (marca && String(p.brand_id) !== String(marca)) return false
    if (categoria && String(p.category_id) !== String(categoria)) return false
    if (soloDisponibles && p.status === 'sin_stock') return false
    if (!palabras.length) return true
    const campos = normalizar([p.name, p.sku, p.brand_name, p.model, p.category_name, p.year].join(' '))
    return palabras.every((w) => campos.includes(w))
  })
}

// Primera foto (la de menor orden) de cada producto: { [product_id]: storage_path }
export function fotoPrincipal(fotos) {
  const principal = {}
  for (const f of [...fotos].sort((a, b) => a.sort_order - b.sort_order)) {
    if (!(f.product_id in principal)) principal[f.product_id] = f.storage_path
  }
  return principal
}

// Opciones de marca o categoría que aparecen en el catálogo, ordenadas por nombre.
export function opcionesDe(productos, campoId, campoNombre) {
  const mapa = new Map()
  for (const p of productos) if (p[campoId] != null) mapa.set(p[campoId], p[campoNombre])
  return [...mapa].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
