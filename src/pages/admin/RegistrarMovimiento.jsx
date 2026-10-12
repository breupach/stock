import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/contexto.js'
import { formatearCantidad } from '../../lib/formato.js'
import {
  aNumero,
  deltaDe,
  mensajeErrorMovimiento,
  TIPOS,
  validarConteo,
  validarMovimiento,
} from '../../lib/movimientos.js'
import { UNIDADES } from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

const campo = 'mt-1 block w-full rounded-md border border-stone-300 px-3 py-2'

function ElegirProducto({ productos, elegido, alElegir, error }) {
  const [busqueda, setBusqueda] = useState('')
  if (elegido) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-stone-300 bg-stone-50 px-3 py-2">
        <div>
          <p className="font-medium">{elegido.name}</p>
          <p className="text-sm text-stone-500">
            {[elegido.sku, elegido.brands?.name].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button type="button" className="text-sm text-marca underline" onClick={() => alElegir(null)}>
          Cambiar
        </button>
      </div>
    )
  }
  const q = busqueda.trim().toLowerCase()
  const coinciden = q
    ? productos.filter((p) => [p.name, p.sku, p.brands?.name].some((v) => v?.toLowerCase().includes(q))).slice(0, 8)
    : []
  return (
    <div>
      <input
        type="search"
        aria-label="Buscar producto"
        placeholder="Buscá por nombre, código o marca"
        className={campo}
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        autoFocus
      />
      {coinciden.length > 0 && (
        <ul className="mt-1 divide-y divide-stone-100 rounded-md border border-stone-200 bg-white">
          {coinciden.map((p) => (
            <li key={p.id}>
              <button type="button" className="w-full px-3 py-2 text-left hover:bg-stone-50" onClick={() => alElegir(p)}>
                {p.name} <span className="text-sm text-stone-500">{p.sku} · stock {formatearCantidad(p.stock)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q && coinciden.length === 0 && <p className="mt-1 text-sm text-stone-500">Ningún producto activo coincide.</p>}
      {error && <p className="mt-1 text-sm text-sin-stock">{error}</p>}
    </div>
  )
}

function Saldos({ producto, delta }) {
  if (!producto) return null
  const unidad = UNIDADES[producto.unit]?.toLowerCase()
  const despues = delta === null ? null : Number(producto.stock) + delta
  return (
    <div className="flex items-center gap-3 rounded-md bg-stone-100 px-3 py-2 text-sm">
      <span>Saldo actual <strong>{formatearCantidad(producto.stock)}</strong> {unidad}</span>
      <span aria-hidden="true">→</span>
      <span>
        Queda en{' '}
        <strong className={despues !== null && despues < 0 ? 'text-sin-stock' : ''}>
          {despues === null ? '—' : formatearCantidad(despues)}
        </strong>{' '}
        {unidad}
      </span>
    </div>
  )
}

export default function RegistrarMovimiento() {
  const { perfil } = useAuth()
  const [parametros] = useSearchParams()
  const [productos, setProductos] = useState(null)
  const [producto, setProducto] = useState(null)
  const [modo, setModo] = useState('movimiento')
  const [f, setF] = useState({ tipo: 'salida', cantidad: '', motivo: '', referencia: '', contado: '' })
  const [errores, setErrores] = useState({})
  const [error, setError] = useState(null)
  const [hecho, setHecho] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    let vigente = true
    supabase
      .from('products')
      .select('id, sku, name, unit, stock, min_stock, brands(name)')
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) return setError('No se pudieron cargar los productos.')
        setProductos(data)
        const id = Number(parametros.get('producto'))
        if (id) setProducto(data.find((p) => p.id === id) ?? null)
      })
    return () => {
      vigente = false
    }
  }, [parametros])

  const tipos = Object.entries(TIPOS).filter(([, t]) => !t.soloAdmin || perfil?.role === 'admin')
  const delta =
    modo === 'conteo'
      ? (aNumero(f.contado) ?? NaN) - Number(producto?.stock)
      : deltaDe(f.tipo, f.cantidad)

  async function enviar(e) {
    e.preventDefault()
    setError(null)
    setHecho(null)
    const errs =
      modo === 'conteo'
        ? validarConteo({ contado: f.contado, producto })
        : validarMovimiento({ tipo: f.tipo, cantidad: f.cantidad, motivo: f.motivo, producto, rol: perfil?.role })
    setErrores(errs)
    if (Object.keys(errs).length) return

    setEnviando(true)
    const { data, error } =
      modo === 'conteo'
        ? await supabase.rpc('registrar_conteo', {
            p_product_id: producto.id,
            p_contado: aNumero(f.contado),
            p_reason: f.motivo.trim() || 'Conteo físico',
          })
        : await supabase.rpc('registrar_movimiento', {
            p_product_id: producto.id,
            p_type: f.tipo,
            p_quantity: aNumero(f.cantidad),
            p_reason: f.motivo.trim() || null,
            p_reference: f.referencia.trim() || null,
          })
    setEnviando(false)
    if (error) return setError(mensajeErrorMovimiento(error))

    // registrar_conteo devuelve null cuando lo contado coincide con el saldo.
    const saldo = data?.balance_after ?? (modo === 'conteo' ? aNumero(f.contado) : producto.stock)
    setHecho(data ? `Listo. ${producto.name} queda con ${formatearCantidad(saldo)}.` : 'Lo contado coincide con el saldo: no hizo falta ajustar.')
    const actualizado = { ...producto, stock: saldo }
    setProducto(actualizado)
    setProductos(productos.map((p) => (p.id === producto.id ? actualizado : p)))
    setF({ ...f, cantidad: '', motivo: '', referencia: '', contado: '' })
  }

  const necesitaMotivo = modo === 'movimiento' && TIPOS[f.tipo]?.motivo

  return (
    <div className="max-w-xl space-y-4">
      <Link to="/admin/movimientos" className="text-sm text-marca underline">← Movimientos</Link>
      <h1 className="text-2xl font-semibold">Registrar movimiento</h1>

      <div className="flex gap-1" role="group" aria-label="Qué querés registrar">
        {[['movimiento', 'Movimiento'], ['conteo', 'Conteo físico']].map(([v, e]) => (
          <button
            key={v}
            type="button"
            aria-pressed={modo === v}
            onClick={() => { setModo(v); setErrores({}); setHecho(null); setError(null) }}
            className={`rounded-full border px-3 py-1.5 text-sm ${modo === v ? 'border-marca bg-marca text-white' : 'border-stone-300 bg-white'}`}
          >
            {e}
          </button>
        ))}
      </div>

      <form onSubmit={enviar} noValidate className="space-y-4 rounded-lg border border-stone-200 bg-white p-4">
        <div>
          <span className="text-sm font-medium">Producto</span>
          {productos === null && !error ? (
            <p className="mt-1 text-stone-500">Cargando…</p>
          ) : (
            <div className="mt-1">
              <ElegirProducto productos={productos ?? []} elegido={producto} alElegir={(p) => { setProducto(p); setHecho(null) }} error={errores.producto} />
            </div>
          )}
        </div>

        {modo === 'movimiento' ? (
          <>
            <label className="block">
              <span className="text-sm font-medium">Tipo</span>
              <select className={campo} value={f.tipo} onChange={set('tipo')}>
                {tipos.map(([v, t]) => <option key={v} value={v}>{t.etiqueta}</option>)}
              </select>
              <span className="mt-1 block text-sm text-stone-500">{TIPOS[f.tipo]?.ayuda}</span>
              {errores.tipo && <span className="mt-1 block text-sm text-sin-stock">{errores.tipo}</span>}
            </label>
            <label className="block">
              <span className="text-sm font-medium">
                Cantidad{producto && ` (${UNIDADES[producto.unit]?.toLowerCase()})`}
              </span>
              <input className={campo} inputMode="decimal" value={f.cantidad} onChange={set('cantidad')} />
              {errores.cantidad && <span className="mt-1 block text-sm text-sin-stock">{errores.cantidad}</span>}
            </label>
          </>
        ) : (
          <label className="block">
            <span className="text-sm font-medium">Cantidad contada</span>
            <input className={campo} inputMode="decimal" value={f.contado} onChange={set('contado')} />
            <span className="mt-1 block text-sm text-stone-500">Se registra un ajuste por la diferencia con el saldo.</span>
            {errores.contado && <span className="mt-1 block text-sm text-sin-stock">{errores.contado}</span>}
          </label>
        )}

        <label className="block">
          <span className="text-sm font-medium">Motivo{necesitaMotivo ? '' : ' (opcional)'}</span>
          <input className={campo} value={f.motivo} onChange={set('motivo')} placeholder={modo === 'conteo' ? 'Conteo físico' : ''} />
          {errores.motivo && <span className="mt-1 block text-sm text-sin-stock">{errores.motivo}</span>}
        </label>
        {modo === 'movimiento' && (
          <label className="block">
            <span className="text-sm font-medium">Referencia (opcional)</span>
            <input className={campo} value={f.referencia} onChange={set('referencia')} placeholder="N.º de remito, factura o pedido" />
          </label>
        )}

        <Saldos producto={producto} delta={Number.isFinite(delta) ? delta : null} />

        {error && <p role="alert" className="text-sm text-sin-stock">{error}</p>}
        {hecho && <p role="status" className="text-sm text-disponible">{hecho}</p>}
        <button type="submit" disabled={enviando} className="rounded-md bg-marca px-4 py-2.5 font-medium text-white disabled:opacity-60">
          {enviando ? 'Registrando…' : modo === 'conteo' ? 'Registrar conteo' : 'Confirmar movimiento'}
        </button>
      </form>
    </div>
  )
}
