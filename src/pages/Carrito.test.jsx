import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { CarritoContext } from '../carrito/contexto.js'

const PUBLICADOS = [
  { id: 1, name: 'Buje de bronce', brand_name: 'Acme', model: 'X2', unit: 'unidad', price: 1500, status: 'disponible' },
  { id: 2, name: 'Barra de acero', brand_name: null, model: null, unit: 'metro', price: 800, status: 'sin_stock' },
]
const SETTINGS = [
  { key: 'whatsapp_numero', value: '5491112345678' },
  { key: 'nombre_negocio', value: 'Tornería Sur' },
]

function consulta(tabla) {
  const data = { catalogo_publico: PUBLICADOS, settings: SETTINGS }[tabla] ?? []
  const q = { then: (ok, mal) => Promise.resolve({ data, error: null }).then(ok, mal) }
  for (const m of ['select', 'in', 'order', 'eq']) q[m] = () => q
  return q
}
const canal = { on: () => canal, subscribe: () => canal }

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: (t) => consulta(t),
    channel: () => canal,
    removeChannel: () => {},
    storage: { from: () => ({ getPublicUrl: (r) => ({ data: { publicUrl: r } }) }) },
  },
}))

const { default: Carrito } = await import('./Carrito.jsx')

function mostrar(items) {
  const valor = { items, agregar: vi.fn(), cambiar: vi.fn(), quitar: vi.fn(), vaciar: vi.fn() }
  render(
    <CarritoContext.Provider value={valor}>
      <MemoryRouter><Carrito /></MemoryRouter>
    </CarritoContext.Provider>,
  )
}

describe('Carrito', () => {
  it('arma el mensaje de WhatsApp con los productos publicados', async () => {
    mostrar([{ productId: 1, cantidad: 2 }, { productId: 2, cantidad: 1.5 }, { productId: 99, cantidad: 1 }])
    const boton = await screen.findByRole('link', { name: 'Consultar por WhatsApp' })
    const url = new URL(boton.getAttribute('href'))
    expect(url.origin + url.pathname).toBe('https://wa.me/5491112345678')
    const texto = url.searchParams.get('text')
    expect(texto).toContain('Hola Tornería Sur')
    expect(texto).toContain('2 × Buje de bronce · Acme · X2')
    expect(texto).toContain('1,5 × Barra de acero')
    expect(texto).not.toContain('99')
  })

  it('marca lo que se quedó sin stock y avisa lo que ya no está publicado', async () => {
    mostrar([{ productId: 2, cantidad: 1 }, { productId: 99, cantidad: 1 }])
    expect(await screen.findByText(/Se quedó sin stock/)).toBeInTheDocument()
    expect(screen.getByText(/ya no está publicado/)).toBeInTheDocument()
  })

  it('con el carrito vacío invita a ver el catálogo', () => {
    mostrar([])
    expect(screen.getByText(/Tu carrito está vacío/)).toBeInTheDocument()
  })
})
