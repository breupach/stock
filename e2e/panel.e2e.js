import { expect, test } from '@playwright/test'
import { CODIGO, CONTRASENA, ingresarComoAdmin, instalarSupabase } from './falsoSupabase.js'

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

async function ingresarConContrasena(page) {
  await page.goto('/admin')
  await page.getByLabel('Usuario').fill('admin')
  await page.getByLabel('Contraseña').fill(CONTRASENA)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}

test('el admin ingresa el código de seguridad después de la contraseña', async ({ page }) => {
  await ingresarConContrasena(page)
  await expect(page).toHaveURL(/\/admin\/codigo$/)
  await expect(page.getByText('Stock · admin')).toBeVisible()

  await page.getByLabel('Código').fill('000000')
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page.getByRole('alert')).toHaveText('El código no es correcto. Fijate que sea el que se ve ahora en la app.')

  // Sin el código no se llega al panel aunque se escriba la dirección.
  await page.goto('/admin/productos')
  await expect(page).toHaveURL(/\/admin\/codigo$/)

  await page.getByLabel('Código').fill('123 456')
  await page.getByRole('button', { name: 'Verificar' }).click()
  await expect(page).toHaveURL(/\/admin\/productos$/)
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
})

test('"Volver" deja el código para después y vuelve al ingreso', async ({ page }) => {
  await ingresarConContrasena(page)
  await page.getByRole('button', { name: 'Volver' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('un admin sin código lo activa la primera vez', async ({ page, context }) => {
  await instalarSupabase(context, { sinCodigo: true })
  await ingresarConContrasena(page)
  await expect(page).toHaveURL(/\/admin\/activar-codigo$/)
  const qr = page.getByRole('img', { name: 'Código QR para Google Authenticator' })
  await expect(qr).toBeVisible()
  await expect.poll(() => qr.evaluate((img) => img.naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByText('JBSW Y3DP EHPK 3PXP')).toBeVisible()
  await page.getByLabel('Código de 6 números').fill(CODIGO)
  await page.getByRole('button', { name: 'Activar y entrar' }).click()
  await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()

  await page.goto('/admin/usuarios')
  await expect(page.getByText('Código de seguridad: activo')).toBeVisible()
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

test('en el celular se navega con la barra de abajo y el menú Más', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Solo en celular')
  await ingresarComoAdmin(page)
  await expect(page.getByRole('heading', { name: 'Tablero' })).toBeVisible()
  await page.getByRole('link', { name: 'Productos', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
  await page.getByRole('link', { name: 'Historial', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Movimientos' })).toBeVisible()

  await page.getByRole('button', { name: 'Más' }).click()
  const menu = page.getByRole('dialog', { name: 'Más opciones' })
  await expect(menu).toContainText('Brian')
  await menu.getByRole('link', { name: 'Usuarios' }).click()
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible()
  await expect(menu).toBeHidden()
})

test('las cifras del tablero abren el listado filtrado', async ({ page }) => {
  await ingresarComoAdmin(page)
  await page.getByRole('link', { name: /Sin stock/ }).click()
  await expect(page).toHaveURL(/filtro=sin_stock/)
  await expect(page.getByRole('button', { name: 'Sin stock' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Caño de acero').filter({ visible: true })).toBeVisible()
  await expect(page.getByText('Buje de bronce')).toHaveCount(0)
})

test('el modo oscuro también se aplica al panel', async ({ page }) => {
  await ingresarComoAdmin(page)
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).first().click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.goto('/')
  await expect(page.locator('html')).toHaveClass(/dark/)
})
