import { test } from '@playwright/test'
import { ingresarComoAdmin, instalarSupabase } from './falsoSupabase.js'

// Capturas de todas las pantallas para revisarlas a ojo. Solo corre con CAPTURAS=1.
test.skip(!process.env.CAPTURAS, 'Solo con CAPTURAS=1')

test('capturas', async ({ page, context }, info) => {
  await instalarSupabase(context)
  const sacar = async (nombre) => {
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `test-results/capturas/${info.project.name}-${nombre}.png`, fullPage: true })
  }
  await page.goto('/'); await sacar('catalogo')
  await page.goto('/producto/1'); await sacar('ficha')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.goto('/producto/2'); await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await page.goto('/carrito'); await sacar('carrito')
  await page.goto('/admin/login'); await sacar('login')
  await ingresarComoAdmin(page)
  await page.getByRole('heading', { name: 'Tablero' }).waitFor()
  await sacar('tablero')
  for (const r of ['productos', 'productos/1', 'productos/nuevo', 'movimientos', 'movimientos/nuevo?producto=1', 'marcas-categorias', 'usuarios', 'configuracion']) {
    await page.goto(`/admin/${r}`)
    await sacar(r.replace(/[/?=]/g, '-'))
  }
})
