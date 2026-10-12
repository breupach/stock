import { expect, test } from '@playwright/test'
import { ingresarComoAdmin, instalarSupabase } from './falsoSupabase.js'

test.beforeEach(async ({ context }) => {
  await instalarSupabase(context)
})

test('el panel pide ingresar y rechaza una contraseña equivocada', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
  await page.getByLabel('Usuario').fill('admin')
  await page.getByLabel('Contraseña').fill('otra')
  await page.getByRole('button', { name: 'Ingresar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Usuario o contraseña incorrectos.')
})

test('ingresar, ver el tablero y registrar una salida', async ({ page }) => {
  await ingresarComoAdmin(page)
  await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()
  await expect(page.getByText('Para reponer').locator('..')).toContainText('Eje de transmisión')

  await page.getByRole('link', { name: 'Registrar movimiento' }).click()
  await page.getByLabel('Buscar producto').fill('buje')
  await page.getByRole('button', { name: /Buje de bronce/ }).click()
  await page.getByLabel('Cantidad').fill('5')
  await expect(page.getByText('Queda en')).toContainText('15')
  await page.getByRole('button', { name: 'Confirmar movimiento' }).click()
  await expect(page.getByRole('status')).toHaveText('Listo. Buje de bronce queda con 15.')
})

test('el catálogo se actualiza en vivo cuando se queda sin stock', async ({ page, context }) => {
  await page.goto('/')
  const eje = page.getByRole('listitem').filter({ hasText: 'Eje de transmisión' })
  await expect(eje).toContainText('Últimas unidades')

  // En otra pestaña, el panel registra la salida de las 2 que quedan.
  const panel = await context.newPage()
  await ingresarComoAdmin(panel)
  await panel.goto('/admin/movimientos/nuevo?producto=2')
  await panel.getByLabel('Cantidad').fill('2')
  await panel.getByRole('button', { name: 'Confirmar movimiento' }).click()
  await expect(panel.getByRole('status')).toContainText('queda con 0')

  await expect(eje).toContainText('Sin stock')
})

test('en el celular el menú del panel se abre y se cierra', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo en celular')
  await ingresarComoAdmin(page)
  await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Productos', exact: true })).toBeHidden()
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('link', { name: 'Productos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Movimientos', exact: true })).toBeHidden()
})
