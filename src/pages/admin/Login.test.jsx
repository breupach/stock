import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const signInWithPassword = vi.fn()
const signOut = vi.fn()
let perfilActivo = true

vi.mock('../../lib/supabase.js', () => ({
  supabaseConfigurado: true,
  supabase: {
    auth: { signInWithPassword: (...a) => signInWithPassword(...a), signOut: () => signOut() },
    from: () => ({
      // El perfil (eq + maybeSingle) y la configuración del negocio (sin filtros).
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { active: perfilActivo } }) }),
        then: (resolver) => Promise.resolve({ data: [] }).then(resolver),
      }),
    }),
  },
}))

const { default: Login } = await import('./Login.jsx')

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <Routes>
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<p>Panel</p>} />
      </Routes>
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Usuario'), { target: { value: 'Juan' } })
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'secreta123' } })
  fireEvent.click(screen.getByRole('button', { name: 'Ingresar' }))
}

beforeEach(() => {
  signInWithPassword.mockReset()
  signOut.mockReset()
  perfilActivo = true
})

describe('Login', () => {
  it('ingresa con el email interno del usuario y va al panel', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    renderizar()
    expect(await screen.findByText('Panel')).toBeInTheDocument()
    expect(signInWithPassword).toHaveBeenCalledWith({ email: 'juan@usuarios.interno', password: 'secreta123' })
  })

  it('muestra un error claro si la contraseña es incorrecta', async () => {
    signInWithPassword.mockResolvedValue({ data: {}, error: { status: 400 } })
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos.')
  })

  it('saca al usuario desactivado', async () => {
    signInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    perfilActivo = false
    renderizar()
    expect(await screen.findByRole('alert')).toHaveTextContent('Tu usuario no tiene acceso al panel.')
    expect(signOut).toHaveBeenCalled()
  })
})
