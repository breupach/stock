import { calcularEstado } from './estado.js'

export const UNIDADES = {
  unidad: 'Unidad',
  metro: 'Metro',
  kg: 'Kilo',
}

export const FORMULARIO_VACIO = {
  sku: '',
  name: '',
  brand_id: '',
  model: '',
  year: '',
  category_id: '',
  description: '',
  unit: 'unidad',
  cost: '',
  price: '',
  min_stock: '0',
  active: true,
  visible: true,
  stock_inicial: '',
}

const texto = (v) => (v ?? '').toString().trim()
const opcional = (v) => texto(v) || null
const numero = (v) => (texto(v) === '' ? null : Number(texto(v).replace(',', '.')))

// Pasa una fila de products a los valores (todos texto) que usa el formulario.
export function aFormulario(producto) {
  const f = { ...FORMULARIO_VACIO }
  for (const k of Object.keys(f)) {
    const v = producto[k]
    if (v === null || v === undefined) continue
    f[k] = typeof v === 'boolean' ? v : String(v)
  }
  return f
}

// Devuelve { campo: mensaje } con los errores del formulario; vacío si está bien.
export function validarProducto(f, { nuevo = false } = {}) {
  const errores = {}
  if (!texto(f.sku)) errores.sku = 'Ingresá el código.'
  if (!texto(f.name)) errores.name = 'Ingresá el nombre.'

  const precio = numero(f.price)
  if (precio === null) errores.price = 'Ingresá el precio.'
  else if (!(precio >= 0)) errores.price = 'El precio no puede ser negativo.'

  const costo = numero(f.cost)
  if (costo !== null && !(costo >= 0)) errores.cost = 'El costo no puede ser negativo.'

  const minimo = numero(f.min_stock)
  if (minimo !== null && !(minimo >= 0)) errores.min_stock = 'El mínimo no puede ser negativo.'

  const anio = numero(f.year)
  if (anio !== null && !(Number.isInteger(anio) && anio >= 1900 && anio <= 2100)) {
    errores.year = 'Año entre 1900 y 2100.'
  }

  if (nuevo) {
    const inicial = numero(f.stock_inicial)
    if (inicial !== null) {
      if (!(inicial >= 0)) errores.stock_inicial = 'El stock inicial no puede ser negativo.'
      else if (f.unit === 'unidad' && !Number.isInteger(inicial)) {
        errores.stock_inicial = 'Este producto se cuenta por unidades enteras.'
      }
    }
  }
  return errores
}

// Convierte el formulario en la fila que se guarda. Nunca incluye stock:
// el saldo solo cambia con movimientos.
export function aFilaProducto(f) {
  return {
    sku: texto(f.sku),
    name: texto(f.name),
    brand_id: f.brand_id ? Number(f.brand_id) : null,
    model: opcional(f.model),
    year: numero(f.year),
    category_id: f.category_id ? Number(f.category_id) : null,
    description: opcional(f.description),
    unit: f.unit,
    cost: numero(f.cost),
    price: numero(f.price),
    min_stock: numero(f.min_stock) ?? 0,
    active: Boolean(f.active),
    visible: Boolean(f.visible),
  }
}

export const stockInicial = (f) => numero(f.stock_inicial) ?? 0

// filtro: 'todos' | 'bajo' (últimas unidades) | 'sin_stock'
export function filtrarProductos(lista, { busqueda = '', filtro = 'todos', inactivos = false } = {}) {
  const q = busqueda.trim().toLowerCase()
  return lista.filter((p) => {
    if (!inactivos && !p.active) return false
    const estado = calcularEstado(p.stock, p.min_stock)
    if (filtro === 'bajo' && estado !== 'ultimas') return false
    if (filtro === 'sin_stock' && estado !== 'sin_stock') return false
    if (!q) return true
    return [p.sku, p.name, p.model, p.brands?.name, p.categories?.name]
      .some((v) => v && v.toLowerCase().includes(q))
  })
}

// Traduce los errores de Supabase/Postgres a un mensaje para el usuario.
export function mensajeError(error) {
  if (!error) return null
  const m = error.message ?? ''
  if (error.code === '23505' && m.includes('sku')) return 'Ya existe un producto con ese código.'
  if (error.code === '23505') return 'Ya existe uno con ese nombre.'
  if (error.code === '23503') return 'No se puede borrar porque hay productos que lo usan.'
  if (m.includes('maximo_fotos')) return 'Un producto admite hasta 5 fotos.'
  if (m.includes('cantidad_entera')) return 'Este producto se cuenta por unidades enteras.'
  if (error.code === '42501' || m.includes('no_autorizado')) return 'No tenés permiso para hacer esto.'
  return 'No se pudo guardar. Probá de nuevo.'
}
