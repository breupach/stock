import { describe, expect, it } from 'vitest'
import { calcularEstado } from './estado.js'
import { formatearCantidad, formatearPrecio } from './formato.js'
import { emailDeUsuario, usuarioValido } from './usuario.js'
import { armarMensaje, linkWhatsApp } from './whatsapp.js'

describe('calcularEstado', () => {
  it('sigue la misma regla que la base', () => {
    expect(calcularEstado(0, 2)).toBe('sin_stock')
    expect(calcularEstado(2, 2)).toBe('ultimas')
    expect(calcularEstado('3.000', '2.000')).toBe('disponible')
  })
})

describe('formato', () => {
  it('muestra pesos argentinos sin mencionar impuestos', () => {
    expect(formatearPrecio(1500)).toMatch(/\$\s?1\.500/)
    expect(formatearPrecio('4300.5')).toMatch(/\$\s?4\.300,50$/)
    expect(formatearPrecio('12500.00')).toMatch(/\$\s?12\.500$/)
    expect(formatearPrecio(null)).toBe('—')
  })
  it('muestra cantidades con decimales solo si hacen falta', () => {
    expect(formatearCantidad('2.500')).toBe('2,5')
    expect(formatearCantidad(3)).toBe('3')
  })
})

describe('usuario', () => {
  it('arma un email interno a partir del nombre de usuario', () => {
    expect(emailDeUsuario('  Juan ')).toBe('juan@usuarios.interno')
  })
  it('acepta solo nombres simples', () => {
    expect(usuarioValido('juan.perez')).toBe(true)
    expect(usuarioValido('ju')).toBe(false)
    expect(usuarioValido('juan perez')).toBe(false)
  })
})

describe('whatsapp', () => {
  it('arma el mensaje con cantidad, nombre, marca y modelo', () => {
    const texto = armarMensaje(
      [{ name: 'Buje', brand_name: 'Acme', model: 'B-12', cantidad: 2 }],
      'Tornería Sur',
    )
    expect(texto).toBe('Hola Tornería Sur, quiero consultar por estos productos:\n- 2 × Buje · Acme · B-12')
  })
  it('limpia el número y codifica el texto', () => {
    expect(linkWhatsApp('+54 9 11 1234-5678', 'hola mundo')).toBe('https://wa.me/5491112345678?text=hola%20mundo')
    expect(linkWhatsApp('', 'x')).toBeNull()
  })
})
