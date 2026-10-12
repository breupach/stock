import { describe, expect, it } from 'vitest'
import { deltaDe, mensajeErrorMovimiento, validarConteo, validarMovimiento } from './movimientos.js'

const buje = { id: 1, unit: 'unidad', stock: 5 }
const barra = { id: 2, unit: 'metro', stock: 2.5 }
const base = { tipo: 'salida', cantidad: '2', motivo: '', producto: buje, rol: 'operador' }

describe('deltaDe', () => {
  it('aplica el signo de cada tipo', () => {
    expect(deltaDe('entrada', '3')).toBe(3)
    expect(deltaDe('salida', '3')).toBe(-3)
    expect(deltaDe('merma', '1,5')).toBe(-1.5)
    expect(deltaDe('ajuste', '-2')).toBe(-2)
  })

  it('devuelve null si la cantidad no sirve', () => {
    expect(deltaDe('salida', '')).toBeNull()
    expect(deltaDe('salida', '0')).toBeNull()
    expect(deltaDe('salida', '-1')).toBeNull()
    expect(deltaDe('entrada', 'abc')).toBeNull()
  })
})

describe('validarMovimiento', () => {
  it('acepta una salida normal', () => {
    expect(validarMovimiento(base)).toEqual({})
  })

  it('no deja vender más de lo que hay', () => {
    expect(validarMovimiento({ ...base, cantidad: '6' }).cantidad).toMatch(/No alcanza/)
  })

  it('exige enteros para unidades y permite decimales para metros', () => {
    expect(validarMovimiento({ ...base, cantidad: '1.5' }).cantidad).toMatch(/enteras/)
    expect(validarMovimiento({ ...base, producto: barra, cantidad: '1,5' })).toEqual({})
  })

  it('pide motivo para devolución, merma y ajuste', () => {
    for (const tipo of ['devolucion', 'merma', 'ajuste']) {
      expect(validarMovimiento({ ...base, tipo, cantidad: '1' }).motivo).toBeTruthy()
      expect(validarMovimiento({ ...base, tipo, cantidad: '1', motivo: 'Rotura' })).toEqual({})
    }
  })

  it('el ajuste acepta negativos; los demás no', () => {
    expect(validarMovimiento({ ...base, tipo: 'ajuste', cantidad: '-2', motivo: 'x' })).toEqual({})
    expect(validarMovimiento({ ...base, tipo: 'entrada', cantidad: '-2' }).cantidad).toBeTruthy()
  })

  it('el stock inicial es solo para el admin', () => {
    expect(validarMovimiento({ ...base, tipo: 'stock_inicial' }).tipo).toBeTruthy()
    expect(validarMovimiento({ ...base, tipo: 'stock_inicial', rol: 'admin' })).toEqual({})
  })

  it('pide producto', () => {
    expect(validarMovimiento({ ...base, producto: null }).producto).toBeTruthy()
  })
})

describe('validarConteo', () => {
  it('acepta cero y rechaza negativos o decimales en unidades', () => {
    expect(validarConteo({ contado: '0', producto: buje })).toEqual({})
    expect(validarConteo({ contado: '-1', producto: buje }).contado).toBeTruthy()
    expect(validarConteo({ contado: '2.5', producto: buje }).contado).toMatch(/enteras/)
    expect(validarConteo({ contado: '', producto: buje }).contado).toBeTruthy()
  })
})

describe('mensajeErrorMovimiento', () => {
  it('traduce los errores de la base', () => {
    expect(mensajeErrorMovimiento({ message: 'stock_insuficiente' })).toMatch(/No alcanza/)
    expect(mensajeErrorMovimiento({ message: 'movimiento_ya_revertido' })).toMatch(/ya fue revertido/)
    expect(mensajeErrorMovimiento({ message: 'raro' })).toMatch(/No se pudo/)
  })
})
