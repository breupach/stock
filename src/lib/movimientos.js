// Tipos de movimiento, en el mismo orden y con las mismas reglas que
// public.registrar_movimiento en la base.
export const TIPOS = {
  entrada: { etiqueta: 'Entrada', signo: 1, ayuda: 'Compra o producción terminada' },
  salida: { etiqueta: 'Salida', signo: -1, ayuda: 'Venta o entrega' },
  devolucion: { etiqueta: 'Devolución', signo: 1, motivo: true, ayuda: 'Un cliente devuelve mercadería' },
  merma: { etiqueta: 'Merma', signo: -1, motivo: true, ayuda: 'Rotura, pérdida o descarte' },
  ajuste: { etiqueta: 'Ajuste', signo: 0, motivo: true, ayuda: 'Corrección: positiva suma, negativa resta' },
  stock_inicial: { etiqueta: 'Stock inicial', signo: 1, soloAdmin: true, ayuda: 'Primera carga del producto' },
}

export const ETIQUETA_TIPO = Object.fromEntries(Object.entries(TIPOS).map(([k, t]) => [k, t.etiqueta]))

const numero = (v) => {
  const t = (v ?? '').toString().trim().replace(',', '.')
  return t === '' ? null : Number(t)
}

// Cuánto cambia el saldo; null si la cantidad todavía no es válida.
export function deltaDe(tipo, cantidad) {
  const n = numero(cantidad)
  if (n === null || Number.isNaN(n) || n === 0) return null
  const signo = TIPOS[tipo]?.signo
  if (signo === 0) return n
  return n > 0 ? signo * n : null
}

// Devuelve { campo: mensaje } con lo que falta o está mal; vacío si se puede enviar.
export function validarMovimiento({ tipo, cantidad, motivo, producto, rol }) {
  const errores = {}
  if (!producto) errores.producto = 'Elegí un producto.'
  const t = TIPOS[tipo]
  if (!t || (t.soloAdmin && rol !== 'admin')) errores.tipo = 'Elegí un tipo de movimiento.'

  const n = numero(cantidad)
  if (n === null || Number.isNaN(n)) errores.cantidad = 'Ingresá la cantidad.'
  else if (n === 0) errores.cantidad = 'La cantidad no puede ser cero.'
  else if (t && t.signo !== 0 && n < 0) errores.cantidad = 'La cantidad debe ser mayor a cero.'
  else if (producto?.unit === 'unidad' && !Number.isInteger(n)) errores.cantidad = 'Este producto se cuenta por unidades enteras.'

  if (t?.motivo && !(motivo ?? '').trim()) errores.motivo = 'Este tipo de movimiento necesita un motivo.'

  const delta = deltaDe(tipo, cantidad)
  if (!errores.cantidad && producto && delta !== null && Number(producto.stock) + delta < 0) {
    errores.cantidad = `No alcanza el stock: hay ${Number(producto.stock)}.`
  }
  return errores
}

export function validarConteo({ contado, producto }) {
  const errores = {}
  if (!producto) errores.producto = 'Elegí un producto.'
  const n = numero(contado)
  if (n === null || Number.isNaN(n)) errores.contado = 'Ingresá lo que contaste.'
  else if (n < 0) errores.contado = 'Lo contado no puede ser negativo.'
  else if (producto?.unit === 'unidad' && !Number.isInteger(n)) errores.contado = 'Este producto se cuenta por unidades enteras.'
  return errores
}

export const aNumero = numero

const MENSAJES = {
  stock_insuficiente: 'No alcanza el stock. Otra persona puede haber registrado un movimiento recién: revisá el saldo.',
  cantidad_entera: 'Este producto se cuenta por unidades enteras.',
  motivo_obligatorio: 'Este movimiento necesita un motivo.',
  cantidad_invalida: 'La cantidad no es válida.',
  producto_inexistente: 'Ese producto no existe.',
  producto_inactivo: 'El producto está inactivo: activalo antes de registrar movimientos.',
  movimiento_ya_revertido: 'Ese movimiento ya fue revertido.',
  movimiento_es_reversion: 'Una reversión no se puede revertir. Registrá un movimiento nuevo.',
  movimiento_inexistente: 'Ese movimiento no existe.',
  no_autorizado: 'No tenés permiso para hacer esto.',
}

export function mensajeErrorMovimiento(error) {
  if (!error) return null
  const m = error.message ?? ''
  const clave = Object.keys(MENSAJES).find((k) => m.includes(k))
  if (clave) return MENSAJES[clave]
  if (error.code === '42501') return MENSAJES.no_autorizado
  return 'No se pudo registrar el movimiento. Probá de nuevo.'
}
