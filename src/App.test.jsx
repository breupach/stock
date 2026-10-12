import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

vi.mock('./lib/supabase.js', () => ({ supabaseConfigurado: false, supabase: null }))

describe('App', () => {
  it('avisa si falta la configuración de Supabase', async () => {
    const { default: App } = await import('./App.jsx')
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getByText('Falta configurar Supabase')).toBeInTheDocument()
  })
})
