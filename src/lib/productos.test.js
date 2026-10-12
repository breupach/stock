import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase.js', () => ({ supabase: null }))

const { medidasReducidas } = await import('./fotos.js')
const { aFilaProducto, aFormulario, FORMULARIO_VACIO, filtrarProductos, mensajeError, unidadPara, validarProducto } =
  await import('./productos.js')

const valido = { ...FORMULARIO_VACIO, sku: 'BUJ-1', name: 'Buje', price: '1500' }

describe('validarProducto', () => {
  it('acepta un producto mínimo', () => {
    expect(validarProducto(valido)).toEqual({})
  })

  it('exige código, nombre y precio', () => {
    expect(Object.keys(validarProducto(FORMULARIO_VACIO)).sort()).toEqual(['name', 'price', 'sku'])
  })

  it('rechaza números negativos o mal escritos y años fuera de rango', () => {
    const e = validarProducto({ ...valido, price: 'abc', cost: '-1', min_stock: '-2', year: '1850' })
    expect(e).toMatchObject({ price: expect.any(String), cost: expect.any(String), min_stock: expect.any(String), year: expect.any(String) })
  })

  it('pide stock inicial entero si se cuenta por unidad, solo al crear', () => {
    expect(validarProducto({ ...valido, stock_inicial: '1.5' }, { nuevo: true }).stock_inicial).toBeTruthy()
    expect(validarProducto({ ...valido, unit: 'metro', stock_inicial: '1,5' }, { nuevo: true })).toEqual({})
    expect(validarProducto({ ...valido, stock_inicial: '1.5' })).toEqual({})
  })
})

describe('aFilaProducto', () => {
  it('limpia textos, convierte números y nunca manda stock', () => {
    const fila = aFilaProducto({ ...valido, sku: ' BUJ-1 ', price: '1500,50', brand_id: '3', model: '  ', year: '2020', stock_inicial: '9' })
    expect(fila).toMatchObject({ sku: 'BUJ-1', price: 1500.5, brand_id: 3, model: null, year: 2020, category_id: null, cost: null, min_stock: 0 })
    expect(fila).not.toHaveProperty('stock')
    expect(fila).not.toHaveProperty('stock_inicial')
  })

  it('ida y vuelta con aFormulario', () => {
    const producto = { ...aFilaProducto(valido), id: 1, stock: 4 }
    expect(aFilaProducto(aFormulario(producto))).toEqual(aFilaProducto(valido))
  })
})

describe('filtrarProductos', () => {
  const lista = [
    { id: 1, sku: 'A1', name: 'Buje', stock: 10, min_stock: 2, active: true, brands: { name: 'Acme' } },
    { id: 2, sku: 'A2', name: 'Arandela', stock: 1, min_stock: 2, active: true },
    { id: 3, sku: 'A3', name: 'Perno', stock: 0, min_stock: 0, active: true },
    { id: 4, sku: 'A4', name: 'Viejo', stock: 0, min_stock: 0, active: false },
  ]
  const ids = (opciones) => filtrarProductos(lista, opciones).map((p) => p.id)

  it('oculta inactivos salvo que se pidan', () => {
    expect(ids()).toEqual([1, 2, 3])
    expect(ids({ inactivos: true })).toEqual([1, 2, 3, 4])
  })

  it('filtra por estado de stock', () => {
    expect(ids({ filtro: 'bajo' })).toEqual([2])
    expect(ids({ filtro: 'sin_stock' })).toEqual([3])
  })

  it('busca por nombre, código o marca sin importar mayúsculas', () => {
    expect(ids({ busqueda: 'acme' })).toEqual([1])
    expect(ids({ busqueda: 'a3' })).toEqual([3])
  })
})

describe('mensajeError', () => {
  it('traduce los errores conocidos', () => {
    expect(mensajeError({ code: '23505', message: 'duplicate key value violates unique constraint "products_sku_key"' })).toMatch(/código/)
    expect(mensajeError({ code: '23503', message: 'foreign key' })).toMatch(/productos que lo usan/)
    expect(mensajeError({ message: 'maximo_fotos' })).toMatch(/5 fotos/)
    expect(mensajeError({ message: 'otra cosa' })).toMatch(/No se pudo/)
  })
})

describe('medidasReducidas', () => {
  it('lleva el lado mayor a 1200 sin agrandar las chicas', () => {
    expect(medidasReducidas(4000, 3000)).toEqual({ ancho: 1200, alto: 900 })
    expect(medidasReducidas(1000, 2400)).toEqual({ ancho: 500, alto: 1200 })
    expect(medidasReducidas(800, 600)).toEqual({ ancho: 800, alto: 600 })
  })
})

describe('unidadPara', () => {
  it('usa singular solo para una unidad', () => {
    expect(unidadPara('unidad', '1')).toBe('unidad')
    expect(unidadPara('unidad', 20)).toBe('unidades')
    expect(unidadPara('metro', -1)).toBe('metro')
    expect(unidadPara('metro', 2.5)).toBe('metros')
    expect(unidadPara('kg', 0)).toBe('kilos')
  })
})
