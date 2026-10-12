import { describe, expect, it } from 'vitest'
import { guardarTema, leerTema, temaInicial } from './tema.js'

const almacen = (inicial = {}) => {
  const datos = { ...inicial }
  return { getItem: (k) => datos[k] ?? null, setItem: (k, v) => (datos[k] = v) }
}

describe('tema', () => {
  it('sin elección guardada sigue al sistema', () => {
    expect(temaInicial(almacen(), true)).toBe(true)
    expect(temaInicial(almacen(), false)).toBe(false)
  })

  it('la elección guardada gana sobre el sistema', () => {
    const a = almacen()
    guardarTema('claro', a)
    expect(temaInicial(a, true)).toBe(false)
    guardarTema('oscuro', a)
    expect(temaInicial(a, false)).toBe(true)
  })

  it('ignora valores raros y almacenamiento bloqueado', () => {
    expect(leerTema(almacen({ 'stock.tema': 'azul' }))).toBe(null)
    expect(leerTema({ getItem: () => { throw new Error('bloqueado') } })).toBe(null)
  })
})
