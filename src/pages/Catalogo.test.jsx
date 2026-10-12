import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

const CATALOGO = [
  { id: 1, name: 'Buje de bronce', sku: 'BUJ-1', brand_id: 1, brand_name: 'Acme', unit: 'unidad', price: 1500, status: 'disponible' },
  { id: 2, name: 'Barra de acero', sku: 'BAR-1', brand_id: null, brand_name: null, unit: 'metro', price: 800, status: 'sin_stock' },
]

let escuchar = null
const canal = {
  on: (_tipo, _filtro, cb) => {
    escuchar = cb
    return canal
  },
  subscribe: () => canal,
}

function consulta(tabla) {
  const data = tabla === 'catalogo_publico' ? CATALOGO : []
  const q = { then: (ok, mal) => Promise.resolve({ data, error: null }).then(ok, mal) }
  for (const m of ['select', 'order', 'eq']) q[m] = () => q
  return q
}

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: (t) => consulta(t),
    channel: () => canal,
    removeChannel: () => {},
    storage: { from: () => ({ getPublicUrl: (r) => ({ data: { publicUrl: r } }) }) },
  },
}))

const { default: Catalogo } = await import('./Catalogo.jsx')

const tarjeta = (nombre) => screen.getByText(nombre).closest('a')

describe('Catálogo', () => {
  it('muestra precio y estado, nunca la cantidad', async () => {
    render(<MemoryRouter><Catalogo /></MemoryRouter>)
    await screen.findByText('Buje de bronce')
    expect(within(tarjeta('Buje de bronce')).getByText('Disponible')).toBeInTheDocument()
    expect(within(tarjeta('Barra de acero')).getByText('/ metro')).toBeInTheDocument()
  })

  it('filtra por "solo disponibles"', async () => {
    render(<MemoryRouter><Catalogo /></MemoryRouter>)
    await screen.findByText('Barra de acero')
    fireEvent.click(screen.getByLabelText('Solo disponibles'))
    expect(screen.queryByText('Barra de acero')).not.toBeInTheDocument()
    expect(screen.getByText('Buje de bronce')).toBeInTheDocument()
  })

  it('actualiza el estado en vivo cuando cambia el stock', async () => {
    render(<MemoryRouter><Catalogo /></MemoryRouter>)
    await screen.findByText('Buje de bronce')
    act(() => escuchar({ new: { product_id: 1, status: 'ultimas' } }))
    expect(within(tarjeta('Buje de bronce')).getByText('Últimas unidades')).toBeInTheDocument()
  })
})
