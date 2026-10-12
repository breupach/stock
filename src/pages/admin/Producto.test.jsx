import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../../auth/contexto.js'

const PRODUCTO = {
  id: 7, sku: 'BUJ-1', name: 'Buje de bronce', brand_id: null, model: null, year: null, category_id: null,
  description: null, unit: 'unidad', cost: 900, price: 1500, stock: 3, min_stock: 2, active: true, visible: true,
}

const insertar = vi.fn()

// Imita el encadenado de supabase-js: cada método devuelve la consulta y al final se espera.
function consulta(tabla) {
  const resultado = {
    brands: { data: [{ id: 1, name: 'Acme' }] },
    categories: { data: [] },
    products: { data: PRODUCTO },
    product_photos: { data: [] },
    price_changes: { data: [] },
    profiles: { data: [] },
  }[tabla]
  const q = {
    then: (ok, mal) => Promise.resolve({ error: null, ...resultado }).then(ok, mal),
  }
  for (const m of ['select', 'order', 'eq', 'maybeSingle', 'single', 'update']) q[m] = () => q
  q.insert = (fila) => {
    insertar(fila)
    return q
  }
  return q
}

vi.mock('../../lib/supabase.js', () => ({ supabase: { from: (t) => consulta(t), rpc: vi.fn() } }))

const { default: Producto } = await import('./Producto.jsx')

function mostrar(ruta, role) {
  return render(
    <AuthContext.Provider value={{ cargando: false, session: {}, perfil: { id: 'u', role } }}>
      <MemoryRouter initialEntries={[ruta]}>
        <Routes>
          <Route path="/admin/productos/nuevo" element={<Producto />} />
          <Route path="/admin/productos/:id" element={<Producto />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('Producto', () => {
  it('el operador ve los datos sin poder editarlos', async () => {
    mostrar('/admin/productos/7', 'operador')
    expect(await screen.findByDisplayValue('Buje de bronce')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument()
    expect(screen.queryByText('Agregar fotos')).not.toBeInTheDocument()
  })

  it('al crear, valida antes de guardar y no manda nada si faltan datos', async () => {
    mostrar('/admin/productos/nuevo', 'admin')
    fireEvent.click(await screen.findByRole('button', { name: 'Crear producto' }))
    expect(screen.getByText('Ingresá el código.')).toBeInTheDocument()
    expect(screen.getByText('Ingresá el precio.')).toBeInTheDocument()
    expect(insertar).not.toHaveBeenCalled()
  })
})
