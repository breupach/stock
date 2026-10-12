import { describe, expect, it } from 'vitest'
import { escribirFiltros, filtrarCatalogo, fotoPrincipal, leerFiltros, opcionesDe } from './catalogo.js'

const productos = [
  { id: 1, name: 'Buje de bronce', sku: 'BUJ-1', brand_id: 1, brand_name: 'Acme', model: 'X2', category_id: 5, category_name: 'Bujes', status: 'disponible' },
  { id: 2, name: 'Eje cardánico', sku: 'EJE-1', brand_id: 2, brand_name: 'Zeta', model: null, category_id: 6, category_name: 'Ejes', status: 'ultimas' },
  { id: 3, name: 'Perno', sku: 'PER-1', brand_id: 1, brand_name: 'Acme', model: null, category_id: null, category_name: null, status: 'sin_stock' },
]
const ids = (f) => filtrarCatalogo(productos, f).map((p) => p.id)

describe('filtrarCatalogo', () => {
  it('busca sin importar mayúsculas ni tildes, con varias palabras', () => {
    expect(ids({ texto: 'CARDANICO' })).toEqual([2])
    expect(ids({ texto: 'acme x2' })).toEqual([1])
    expect(ids({ texto: 'per-1' })).toEqual([3])
  })

  it('filtra por marca y categoría', () => {
    expect(ids({ marca: '1' })).toEqual([1, 3])
    expect(ids({ categoria: '6' })).toEqual([2])
  })

  it('"solo disponibles" deja también las últimas unidades', () => {
    expect(ids({ soloDisponibles: true })).toEqual([1, 2])
  })
})

describe('filtros en la URL', () => {
  it('ida y vuelta, sin parámetros vacíos', () => {
    const f = { texto: 'buje', marca: '1', categoria: '', soloDisponibles: true }
    const p = escribirFiltros(f)
    expect(p.toString()).toBe('q=buje&marca=1&disponibles=1')
    expect(leerFiltros(p)).toEqual(f)
  })
})

describe('fotoPrincipal y opcionesDe', () => {
  it('elige la foto de menor orden', () => {
    const fotos = [
      { product_id: 1, storage_path: 'b', sort_order: 2 },
      { product_id: 1, storage_path: 'a', sort_order: 0 },
      { product_id: 2, storage_path: 'c', sort_order: 1 },
    ]
    expect(fotoPrincipal(fotos)).toEqual({ 1: 'a', 2: 'c' })
  })

  it('lista solo las marcas presentes, sin repetir y en orden', () => {
    expect(opcionesDe(productos, 'brand_id', 'brand_name')).toEqual([{ id: 1, nombre: 'Acme' }, { id: 2, nombre: 'Zeta' }])
    expect(opcionesDe(productos, 'category_id', 'category_name').map((c) => c.nombre)).toEqual(['Bujes', 'Ejes'])
  })
})
