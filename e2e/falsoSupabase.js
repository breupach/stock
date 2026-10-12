// Supabase falso para las pruebas de punta a punta. Atiende, desde el navegador,
// lo que la app le pide a Supabase: lecturas de tablas (PostgREST), las funciones
// de movimientos, el login y el canal en vivo (Realtime). Así las pruebas corren
// sin red y sin tocar la base real.
export const URL_SUPABASE = 'http://supabase.e2e.test'

const ADMIN = { id: '00000000-0000-0000-0000-000000000001', username: 'admin', name: 'Brian', role: 'admin', active: true }
export const CONTRASENA = 'clave-de-prueba'

function datosIniciales() {
  const productos = [
    { id: 1, sku: 'BUJ-001', name: 'Buje de bronce', brand_id: 1, brand_name: 'Fiat', model: '128', year: '1980', category_id: 1, category_name: 'Bujes', unit: 'unidad', price: '12500.00', stock: '20', min_stock: '5', active: true, visible: true, description: 'Buje torneado en bronce SAE 64.' },
    { id: 2, sku: 'EJE-010', name: 'Eje de transmisión', brand_id: 2, brand_name: 'Ford', model: 'Falcon', year: null, category_id: 2, category_name: 'Ejes', unit: 'unidad', price: '98000.00', stock: '2', min_stock: '3', active: true, visible: true, description: null },
    { id: 3, sku: 'CAÑ-100', name: 'Caño de acero', brand_id: null, brand_name: null, model: null, year: null, category_id: 3, category_name: 'Materiales', unit: 'metro', price: '4300.50', stock: '0', min_stock: '10', active: true, visible: true, description: null },
  ]
  return {
    productos,
    fotos: [],
    movimientos: [],
    settings: [
      { key: 'nombre_negocio', value: 'Tornería Reupach' },
      { key: 'whatsapp_numero', value: '5493415551234' },
    ],
  }
}

const calcularEstado = (p) => (Number(p.stock) <= 0 ? 'sin_stock' : Number(p.stock) <= Number(p.min_stock) ? 'ultimas' : 'disponible')

// Filtros de PostgREST que usa la app: eq e in.
function filtrar(filas, parametros) {
  let resultado = filas
  for (const [campo, valor] of parametros) {
    if (['select', 'order', 'limit', 'offset'].includes(campo)) continue
    const [op, ...resto] = valor.split('.')
    const arg = resto.join('.')
    if (op === 'eq') resultado = resultado.filter((f) => String(f[campo]) === arg)
    if (op === 'in') {
      const lista = arg.replace(/^\(|\)$/g, '').split(',')
      resultado = resultado.filter((f) => lista.includes(String(f[campo])))
    }
  }
  const limite = Number(parametros.get('limit'))
  return limite ? resultado.slice(0, limite) : resultado
}

const sinStock = ({ stock: _s, min_stock: _m, active: _a, published: _v, ...resto }) => resto

function tabla(db, nombre) {
  switch (nombre) {
    case 'catalogo_publico':
      return db.productos.filter((p) => p.active && p.visible).map((p) => ({ ...sinStock(p), status: calcularEstado(p) }))
    case 'products':
      return db.productos.map((p) => ({ ...p, brands: p.brand_name ? { name: p.brand_name } : null }))
    case 'product_photos':
      return db.fotos
    case 'settings':
      return db.settings
    case 'profiles':
      return [ADMIN]
    case 'stock_movements':
      return [...db.movimientos].reverse()
    case 'brands':
      return [{ id: 1, name: 'Fiat' }, { id: 2, name: 'Ford' }]
    case 'categories':
      return [{ id: 1, name: 'Bujes' }, { id: 2, name: 'Ejes' }, { id: 3, name: 'Materiales' }]
    default:
      return []
  }
}

const SIGNO = { entrada: 1, salida: -1, ajuste_positivo: 1, ajuste_negativo: -1, devolucion: 1 }

const token = () => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
  const ahora = Math.floor(Date.now() / 1000)
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ADMIN.id, role: 'authenticated', exp: ahora + 3600, iat: ahora })}.firma`
}

const USUARIO = { id: ADMIN.id, aud: 'authenticated', role: 'authenticated', email: 'admin@usuarios.interno', app_metadata: {}, user_metadata: {} }

// Una imagen de 1x1 para las fotos.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

// Se instala en el contexto del navegador: todas las pestañas comparten la misma base.
export async function instalarSupabase(contexto) {
  const db = datosIniciales()
  const sockets = new Set()

  await contexto.route(`${URL_SUPABASE}/**`, async (route) => {
    const pedido = route.request()
    const url = new URL(pedido.url())
    const json = (cuerpo, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) })

    if (url.pathname.startsWith('/storage/')) return route.fulfill({ status: 200, contentType: 'image/png', body: PNG })

    if (url.pathname === '/auth/v1/token') {
      const { email, password } = pedido.postDataJSON()
      if (email !== USUARIO.email || password !== CONTRASENA) {
        return json({ code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400)
      }
      return json({ access_token: token(), token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: USUARIO })
    }
    if (url.pathname === '/auth/v1/user') return json(USUARIO)
    if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204 })

    if (url.pathname === '/rest/v1/rpc/registrar_movimiento') {
      const a = pedido.postDataJSON()
      const p = db.productos.find((x) => x.id === a.p_product_id)
      const saldo = Number(p.stock) + SIGNO[a.p_type] * a.p_quantity
      if (saldo < 0) return json({ code: 'P0001', message: 'stock insuficiente' }, 400)
      p.stock = String(saldo)
      const mov = { id: db.movimientos.length + 1, product_id: p.id, type: a.p_type, quantity: a.p_quantity, balance_after: saldo, reason: a.p_reason, reference: a.p_reference, user_id: ADMIN.id, created_at: new Date().toISOString(), reverses_id: null, products: { name: p.name, sku: p.sku, unit: p.unit } }
      db.movimientos.push(mov)
      for (const s of sockets) s.avisarEstado(p.id, calcularEstado(p))
      return json(mov)
    }

    if (url.pathname.startsWith('/rest/v1/')) {
      const nombre = url.pathname.slice('/rest/v1/'.length)
      if (pedido.method() !== 'GET') return json({ message: 'no soportado en las pruebas' }, 405)
      const filas = filtrar(tabla(db, nombre), url.searchParams)
      if ((pedido.headers().accept ?? '').includes('vnd.pgrst.object')) {
        return filas.length === 1 ? json(filas[0]) : json({ code: 'PGRST116', message: 'no rows' }, 406)
      }
      return json(filas)
    }
    return route.fulfill({ status: 404 })
  })

  // Realtime (protocolo Phoenix, formato de arreglos). Responde los "join" con
  // los filtros pedidos y manda los cambios de estado cuando hay un movimiento.
  await contexto.routeWebSocket(/\/realtime\/v1\/websocket/, (ws) => {
    const canales = new Map()
    let ultimoId = 0
    const socket = {
      avisarEstado(productId, status) {
        for (const [topico, ids] of canales) {
          ws.send(JSON.stringify([null, null, topico, 'postgres_changes', {
            ids,
            data: {
              type: 'UPDATE', schema: 'public', table: 'product_status', commit_timestamp: new Date().toISOString(),
              columns: [{ name: 'product_id', type: 'int8' }, { name: 'status', type: 'text' }],
              record: { product_id: productId, status }, old_record: { product_id: productId },
            },
          }]))
        }
      },
    }
    sockets.add(socket)
    ws.onClose(() => sockets.delete(socket))
    ws.onMessage((crudo) => {
      const [joinRef, ref, topico, evento, payload] = JSON.parse(crudo)
      const ok = (response = {}) => ws.send(JSON.stringify([joinRef, ref, topico, 'phx_reply', { status: 'ok', response }]))
      if (evento === 'phx_join') {
        const filtros = (payload.config?.postgres_changes ?? []).map((f) => ({ ...f, id: ++ultimoId }))
        canales.set(topico, filtros.map((f) => f.id))
        ok({ postgres_changes: filtros })
      } else if (evento === 'phx_leave') {
        canales.delete(topico)
        ok()
      } else {
        ok()
      }
    })
  })

  return db
}

export async function ingresarComoAdmin(page) {
  await page.goto('/admin/login')
  await page.getByLabel('Usuario').fill('admin')
  await page.getByLabel('Contraseña').fill(CONTRASENA)
  await page.getByRole('button', { name: 'Ingresar' }).click()
}
