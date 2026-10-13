import { describe, expect, it } from 'vitest'
import { agregarItem, cambiarCantidad, cantidadValida, guardarCarrito, leerCarrito, quitarItem, resumenCarrito, totalEstimado } from './carrito.js'

function almacenFalso(inicial = {}) {
  const datos = { ...inicial }
  return { getItem: (k) => datos[k] ?? null, setItem: (k, v) => { datos[k] = v }, datos }
}

describe('carrito', () => {
  it('acumula al agregar el mismo producto y quita con cantidad cero', () => {
    let items = agregarItem([], 1, 2)
    items = agregarItem(items, 1, 0.5)
    items = agregarItem(items, 2, 1)
    expect(items).toEqual([{ productId: 1, cantidad: 2.5 }, { productId: 2, cantidad: 1 }])
    expect(cambiarCantidad(items, 1, 0)).toEqual([{ productId: 2, cantidad: 1 }])
    expect(quitarItem(items, 2)).toEqual([{ productId: 1, cantidad: 2.5 }])
  })

  it('guarda y lee del almacenamiento, ignorando datos rotos', () => {
    const a = almacenFalso()
    guardarCarrito([{ productId: 3, cantidad: 2 }], a)
    expect(leerCarrito(a)).toEqual([{ productId: 3, cantidad: 2 }])
    expect(leerCarrito(almacenFalso({ 'stock.carrito': '{roto' }))).toEqual([])
    expect(leerCarrito(almacenFalso({ 'stock.carrito': '[{"productId":"x","cantidad":1},{"productId":4,"cantidad":0}]' }))).toEqual([])
  })

  it('no falla si el navegador bloquea el almacenamiento', () => {
    const bloqueado = { getItem: () => { throw new Error('bloqueado') }, setItem: () => { throw new Error('bloqueado') } }
    expect(leerCarrito(bloqueado)).toEqual([])
    expect(() => guardarCarrito([], bloqueado)).not.toThrow()
  })

  it('valida la cantidad según la unidad', () => {
    expect(cantidadValida('3', 'unidad')).toBe(3)
    expect(cantidadValida('1,5', 'unidad')).toBeNull()
    expect(cantidadValida('1,5', 'metro')).toBe(1.5)
    expect(cantidadValida('0', 'kg')).toBeNull()
    expect(cantidadValida('abc', 'kg')).toBeNull()
  })

  it('suma el total solo de productos publicados', () => {
    const productos = { 1: { price: '1500' }, 2: { price: 800 } }
    expect(totalEstimado([{ productId: 1, cantidad: 2 }, { productId: 2, cantidad: 1.5 }, { productId: 9, cantidad: 1 }], productos)).toBe(4200)
  })
})

describe('resumenCarrito', () => {
  const productos = { 1: { unit: 'unidad' }, 2: { unit: 'unidad' }, 3: { unit: 'metro' } }
  it('cuenta productos y unidades', () => {
    expect(resumenCarrito([{ productId: 1, cantidad: 2 }, { productId: 2, cantidad: 1 }], productos)).toBe('2 productos · 3 unidades')
    expect(resumenCarrito([{ productId: 1, cantidad: 1 }], productos)).toBe('1 producto · 1 unidad')
  })
  it('no suma unidades si hay algo por metro o sin cargar', () => {
    expect(resumenCarrito([{ productId: 1, cantidad: 2 }, { productId: 3, cantidad: 1.5 }], productos)).toBe('2 productos')
    expect(resumenCarrito([{ productId: 9, cantidad: 1 }], productos)).toBe('1 producto')
  })
})
