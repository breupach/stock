import { expect, test } from '@playwright/test'
import { instalarSupabase } from './falsoSupabase.js'

test.beforeEach(async ({ context }) => {
  await instalarSupabase(context)
})

test('el catálogo muestra estados y nunca cantidades', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Tornería Reupach' })).toBeVisible()

  const buje = page.getByRole('listitem').filter({ hasText: 'Buje de bronce' })
  await expect(buje).toContainText('Disponible')
  await expect(page.getByRole('listitem').filter({ hasText: 'Eje de transmisión' })).toContainText('Últimas unidades')
  await expect(page.getByRole('listitem').filter({ hasText: 'Caño de acero' })).toContainText('Sin stock')
  await expect(page.getByRole('main')).not.toContainText(/stock \d|\b20 unidades/i)
})

test('buscar y filtrar quedan en la dirección', async ({ page }) => {
  await page.goto('/')
  // Escribir rápido, letra por letra, como en un celular.
  await page.getByLabel('Buscar').pressSequentially('falcon')
  await expect(page.getByRole('listitem')).toHaveCount(1)
  await expect(page).toHaveURL(/q=falcon/)

  await page.getByLabel('Buscar').fill('')
  await page.getByLabel('Solo disponibles').check()
  await expect(page.getByRole('listitem')).toHaveCount(2)
  await page.getByRole('button', { name: 'Limpiar' }).click()
  await expect(page.getByRole('listitem')).toHaveCount(3)
})

test('del catálogo a WhatsApp: agregar, cambiar cantidad y consultar', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: /Buje de bronce/ }).click()
  await expect(page.getByRole('heading', { name: 'Buje de bronce' })).toBeVisible()
  await page.getByLabel('Cantidad').fill('3')
  await page.getByRole('button', { name: 'Agregar al carrito' }).click()
  await expect(page.getByRole('status')).toContainText('Tenés 3 en el carrito')

  await page.getByRole('link', { name: 'Ver carrito' }).click()
  await expect(page.getByRole('link', { name: 'Carrito (1)' })).toBeVisible()
  await expect(page.getByText('$ 37.500', { exact: false }).first()).toBeVisible()

  await page.getByLabel('Cantidad').fill('4')
  await page.getByLabel('Cantidad').press('Enter')
  await expect(page.getByText('Total estimado').locator('..')).toContainText('50.000')

  const enlace = page.getByRole('link', { name: 'Consultar por WhatsApp' })
  const href = await enlace.getAttribute('href')
  expect(href).toMatch(/^https:\/\/wa\.me\/5493415551234\?text=/)
  const texto = decodeURIComponent(href.split('text=')[1])
  expect(texto).toContain('Hola Tornería Reupach')
  expect(texto).toContain('- 4 × Buje de bronce · Fiat · 128')

  // El carrito sobrevive a recargar la página.
  await page.reload()
  await expect(page.getByRole('link', { name: 'Carrito (1)' })).toBeVisible()
})

test('un producto sin stock no se puede agregar', async ({ page }) => {
  await page.goto('/producto/3')
  await expect(page.getByRole('heading', { name: 'Caño de acero' })).toBeVisible()
  await expect(page.getByText('Sin stock por ahora')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar al carrito' })).toHaveCount(0)
})

test('nada se sale de la pantalla a lo ancho', async ({ page }) => {
  for (const ruta of ['/', '/producto/1', '/carrito']) {
    await page.goto(ruta)
    await page.waitForLoadState('networkidle')
    const desborde = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(desborde, ruta).toBeLessThanOrEqual(0)
  }
})
