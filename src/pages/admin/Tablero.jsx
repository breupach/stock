import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import EstadoStock from '../../components/EstadoStock.jsx'
import ListaMovimientos from '../../components/ListaMovimientos.jsx'
import { COLUMNAS_MOVIMIENTO } from '../../lib/consultasMovimientos.js'
import { calcularEstado } from '../../lib/estado.js'
import { formatearCantidad } from '../../lib/formato.js'
import { unidadPara } from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

// Cada cifra abre el listado de productos ya filtrado.
function Cifra({ titulo, valor, to, color = 'text-tinta', punto = false }) {
  return (
    <Link to={to} className="tarjeta p-3 hover:border-tinta">
      <p className="text-[13px] text-suave">{titulo}</p>
      <p className={`mt-0.5 flex items-center gap-2 text-2xl font-semibold tabular-nums ${color}`}>
        {valor}
        {punto && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-current" />}
      </p>
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
  if (!datos) return <p className="text-suave">Cargando…</p>

  const alertas = datos.productos.filter((p) => p.estado !== 'disponible')
  const sinStock = alertas.filter((p) => p.estado === 'sin_stock').length

  return (
    <div className="max-w-5xl space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="titulo">Tablero</h1>
        <Link to="/admin/movimientos/nuevo" className="btn-accion">
          Registrar movimiento
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2.5 md:gap-3">
        <Cifra titulo="Productos activos" valor={datos.productos.length} to="/admin/productos" />
        <Cifra titulo="Stock bajo" valor={alertas.length - sinStock} to="/admin/productos?filtro=bajo" color="text-ultimas" punto />
        <Cifra titulo="Sin stock" valor={sinStock} to="/admin/productos?filtro=sin_stock" color="text-sin-stock" punto />
      </div>

      <div className="grid items-start gap-4 md:gap-6 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="subtitulo">Para reponer</h2>
          {alertas.length === 0 ? (
            <p className="mt-2 text-[13px] text-suave">Todos los productos están por encima del mínimo.</p>
          ) : (
            <ul className="mt-1.5 divide-y divide-linea">
              {alertas.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <Link to={`/admin/productos/${p.id}`} className="grid min-w-0 hover:underline">
                    <span className="text-sm font-semibold">{p.name}</span>
                    <span className="font-mono text-[11px] text-suave">{p.sku}</span>
                  </Link>
                  <span className="flex shrink-0 flex-wrap items-center gap-2 text-[13px] tabular-nums">
                    {formatearCantidad(p.stock)} / mín. {formatearCantidad(p.min_stock)} {unidadPara(p.unit, p.min_stock)}
                    <EstadoStock estado={p.estado} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="tarjeta">
          <div className="flex items-baseline justify-between">
            <h2 className="subtitulo">Últimos movimientos</h2>
            <Link to="/admin/movimientos" className="enlace text-[13px]">Ver todos</Link>
          </div>
          <div className="mt-1">
            <ListaMovimientos movimientos={datos.movimientos} nombres={datos.nombres} vacio="Todavía no hay movimientos." />
          </div>
        </section>
      </div>
    </div>
  )
}
