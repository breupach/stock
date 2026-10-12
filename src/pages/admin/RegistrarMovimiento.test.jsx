import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/contexto.js'

const BUJE = { id: 7, sku: 'BUJ-1', name: 'Buje de bronce', unit: 'unidad', stock: 5, min_stock: 2, brands: null }
const rpc = vi.fn()

function consulta() {
  const q = { then: (ok, mal) => Promise.resolve({ data: [BUJE], error: null }).then(ok, mal) }
  for (const m of ['select', 'eq', 'order']) q[m] = () => q
  return q
}

vi.mock('../../lib/supabase.js', () => ({ supabase: { from: () => consulta(), rpc: (...a) => rpc(...a) } }))

const { default: RegistrarMovimiento } = await import('./RegistrarMovimiento.jsx')

function mostrar() {
  return render(
    <AuthContext.Provider value={{ cargando: false, session: {}, perfil: { id: 'u', role: 'operador' } }}>
      <MemoryRouter initialEntries={['/admin/movimientos/nuevo?producto=7']}>
        <Routes>
          <Route path="/admin/movimientos/nuevo" element={<RegistrarMovimiento />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RegistrarMovimiento', () => {
  beforeEach(() => rpc.mockReset())

  it('muestra el saldo antes y después y registra la salida', async () => {
    rpc.mockResolvedValue({ data: { balance_after: 3 }, error: null })
    mostrar()
    expect(await screen.findByText('Buje de bronce')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Stock inicial' })).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/Cantidad/), { target: { value: '2' } })
    expect(screen.getByText('Queda en', { exact: false })).toHaveTextContent('Queda en 3')

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimiento' }))
    expect(await screen.findByRole('status')).toHaveTextContent('queda con 3')
    expect(rpc).toHaveBeenCalledWith('registrar_movimiento', expect.objectContaining({ p_product_id: 7, p_type: 'salida', p_quantity: 2 }))
  })

  it('no envía una salida mayor al stock', async () => {
    mostrar()
    await screen.findByText('Buje de bronce')
    fireEvent.change(screen.getByLabelText(/Cantidad/), { target: { value: '9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimiento' }))
    expect(screen.getByText(/No alcanza el stock/)).toBeInTheDocument()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('muestra el error de la base si otro usuario se adelantó', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'stock_insuficiente' } })
    mostrar()
    await screen.findByText('Buje de bronce')
    fireEvent.change(screen.getByLabelText(/Cantidad/), { target: { value: '5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar movimiento' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/No alcanza el stock/)
  })
})
