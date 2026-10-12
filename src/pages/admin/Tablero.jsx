import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import EstadoStock from '../../components/EstadoStock.jsx'
import ListaMovimientos from '../../components/ListaMovimientos.jsx'
import { COLUMNAS_MOVIMIENTO } from '../../lib/consultasMovimientos.js'
import { calcularEstado } from '../../lib/estado.js'
import { formatearCantidad } from '../../lib/formato.js'
import { UNIDADES } from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

function Cifra({ titulo, valor, to, color = '' }) {
  return (
    <Link to={to} className="rounded-lg border border-stone-200 bg-white p-4 hover:border-stone-300">
      <p className="text-sm text-stone-500">{titulo}</p>
      <p className={`mt-1 text-3xl font-semibold ${color}`}>{valor}</p>
    </Link>
  )
}

export default function Tablero() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase.from('products').select('id, name, sku, unit, stock, min_stock').eq('active', true).order('name'),
      supabase.from('stock_movements').select(COLUMNAS_MOVIMIENTO).order('created_at', { ascending: false }).limit(10),
      supabase.from('profiles').select('id, name'),
    ]).then(([productos, movimientos, perfiles]) => {
      if (!vigente) return
      if (productos.error || movimientos.error) return setError('No se pudo cargar el tablero.')
      setDatos({
        productos: productos.data.map((p) => ({ ...p, estado: calcularEstado(p.stock, p.min_stock) })),
        movimientos: movimientos.data,
        nombres: Object.fromEntries((perfiles.data ?? []).map((p) => [p.id, p.name])),
      })
    })
    return () => {
      vigente = false
    }
  }, [version])

  // Si otra persona registra un movimiento, el tablero se actualiza solo.
  useEffect(() => {
    const canal = supabase
      .channel('tablero')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => setVersion((v) => v + 1))
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [])

  if (error) return <p className="text-sin-stock">{error}</p>
  if (!datos) return <p className="text-stone-500">Cargando…</p>

  const alertas = datos.productos.filter((p) => p.estado !== 'disponible')
  const sinStock = alertas.filter((p) => p.estado === 'sin_stock').length

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Tablero</h1>
        <Link to="/admin/movimientos/nuevo" className="rounded-md bg-marca px-4 py-2.5 font-medium text-white">
          Registrar movimiento
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Cifra titulo="Productos activos" valor={datos.productos.length} to="/admin/productos" />
        <Cifra titulo="Stock bajo" valor={alertas.length - sinStock} to="/admin/productos" color="text-ultimas" />
        <Cifra titulo="Sin stock" valor={sinStock} to="/admin/productos" color="text-sin-stock" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Para reponer</h2>
          {alertas.length === 0 ? (
            <p className="mt-2 text-sm text-stone-500">Todos los productos están por encima del mínimo.</p>
          ) : (
            <ul className="mt-2 divide-y divide-stone-100">
              {alertas.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2 py-2">
                  <Link to={`/admin/productos/${p.id}`} className="min-w-0 hover:underline">
                    {p.name} <span className="text-sm text-stone-500">{p.sku}</span>
                  </Link>
                  <span className="flex shrink-0 items-center gap-2 text-sm">
                    {formatearCantidad(p.stock)} / mín. {formatearCantidad(p.min_stock)} {UNIDADES[p.unit]?.toLowerCase()}
                    <EstadoStock estado={p.estado} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="font-semibold">Últimos movimientos</h2>
            <Link to="/admin/movimientos" className="text-sm text-marca underline">Ver todos</Link>
          </div>
          <div className="mt-1">
            <ListaMovimientos movimientos={datos.movimientos} nombres={datos.nombres} vacio="Todavía no hay movimientos." />
          </div>
        </section>
      </div>
    </div>
  )
}
