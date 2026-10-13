import { describe, expect, it } from 'vitest'
import { agruparClave, imagenQr, limpiarCodigo, pasoPendiente } from './codigo.js'

const admin = { role: 'admin' }
const operador = { role: 'operador' }

describe('pasoPendiente', () => {
  it('pide el código al admin que lo tiene activado y todavía no lo ingresó', () => {
    expect(pasoPendiente(admin, { currentLevel: 'aal1', nextLevel: 'aal2' })).toBe('codigo')
  })

  it('pide activarlo al admin que no lo tiene', () => {
    expect(pasoPendiente(admin, { currentLevel: 'aal1', nextLevel: 'aal1' })).toBe('activar')
  })

  it('deja pasar al admin que ya lo ingresó y al operador sin código', () => {
    expect(pasoPendiente(admin, { currentLevel: 'aal2', nextLevel: 'aal2' })).toBeNull()
    expect(pasoPendiente(operador, { currentLevel: 'aal1', nextLevel: 'aal1' })).toBeNull()
    expect(pasoPendiente(null, null)).toBeNull()
  })
})

describe('formato del código', () => {
  it('deja solo los 6 números', () => {
    expect(limpiarCodigo('482 913')).toBe('482913')
    expect(limpiarCodigo('12-34-56-78')).toBe('123456')
  })

  it('agrupa la clave de a 4', () => {
    expect(agruparClave('JBSWY3DPEHPK3PXP')).toBe('JBSW Y3DP EHPK 3PXP')
  })

  it('codifica el SVG del QR para que un # no corte la imagen', () => {
    const src = imagenQr('data:image/svg+xml;utf-8,<svg fill="#000"></svg>')
    expect(src).toBe('data:image/svg+xml;charset=utf-8,%3Csvg%20fill%3D%22%23000%22%3E%3C%2Fsvg%3E')
  })
})
