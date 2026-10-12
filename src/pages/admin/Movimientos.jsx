import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ListaMovimientos from '../../components/ListaMovimientos.jsx'
import { COLUMNAS_MOVIMIENTO, marcarRevertidos } from '../../lib/consultasMovimientos.js'
import { ETIQUETA_TIPO } from '../../lib/movimientos.js'
import { supabase } from '../../lib/supabase.js'

const LIMITE = 200
const campo = 'mt-1 block w-full rounded-md border border-stone-300 px-2 py-1.5 text-sm'
const FILTROS_VACIOS = { producto: '', tipo: '', usuario: '', desde: '', hasta: '' }

// Fecha local (aaaa-mm-dd) a instante ISO; `finDelDia` toma el día siguiente a las 0 h.
function inicioDeDia(fecha, finDelDia = false) {
  const [a, m, d] = fecha.split('-').map(Number)
  return new Date(a, m - 1, d + (finDelDia ? 1 : 0)).toISOString()
}

export default function Movimientos() {
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const [opciones, setOpciones] = useState({ productos: [], usuarios: [] })
  const [movimientos, setMovimientos] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  const set = (k) => (e) => setFiltros({ ...filtros, [k]: e.target.value })

  useEffect(() => {
    Promise.all([
      supabase.from('products').select('id, name').order('name'),
      supabase.from('profiles').select('id, name').order('name'),
    ]).then(([p, u]) => setOpciones({ productos: p.data ?? [], usuarios: u.data ?? [] }))
  }, [])

  useEffect(() => {
    let vigente = true
    let q = supabase
      .from('stock_movements')
      .select(COLUMNAS_MOVIMIENTO)
      .order('created_at', { ascending: false })
      .limit(LIMITE)
    if (filtros.producto) q = q.eq('product_id', filtros.producto)
    if (filtros.tipo) q = q.eq('type', filtros.tipo)
    if (filtros.usuario) q = q.eq('user_id', filtros.usuario)
    if (filtros.desde) q = q.gte('created_at', inicioDeDia(filtros.desde))
    if (filtros.hasta) q = q.lt('created_at', inicioDeDia(filtros.hasta, true))
    q.then(async ({ data, error }) => {
      if (!vigente) return
      if (error) return setError('No se pudieron cargar los movimientos.')
      const conMarca = await marcarRevertidos(data)
      if (vigente) {
        setError(null)
        setMovimientos(conMarca)
      }
    })
    return () => {
      vigente = false
    }
  }, [filtros, version])

  const nombres = Object.fromEntries(opciones.usuarios.map((u) => [u.id, u.name]))
  const hayFiltros = Object.values(filtros).some(Boolean)

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Movimientos</h1>
        <Link to="/admin/movimientos/nuevo" className="rounded-md bg-marca px-4 py-2.5 font-medium text-white">
          Registrar movimiento
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-lg border border-stone-200 bg-white p-3 sm:grid-cols-5">
        <label className="col-span-2 sm:col-span-1">
          <span className="text-xs font-medium">Producto</span>
          <select className={campo} value={filtros.producto} onChange={set('producto')}>
            <option value="">Todos</option>
            {opciones.productos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-medium">Tipo</span>
          <select className={campo} value={filtros.tipo} onChange={set('tipo')}>
            <option value="">Todos</option>
            {Object.entries(ETIQUETA_TIPO).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-medium">Usuario</span>
          <select className={campo} value={filtros.usuario} onChange={set('usuario')}>
            <option value="">Todos</option>
            {opciones.usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-xs font-medium">Desde</span>
          <input type="date" className={campo} value={filtros.desde} onChange={set('desde')} />
        </label>
        <label>
          <span className="text-xs font-medium">Hasta</span>
          <input type="date" className={campo} value={filtros.hasta} onChange={set('hasta')} />
        </label>
        {hayFiltros && (
          <button type="button" className="col-span-2 justify-self-start text-sm text-marca underline sm:col-span-5" onClick={() => setFiltros(FILTROS_VACIOS)}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <p className="text-sin-stock">{error}</p>}
      {!error && movimientos === null && <p className="text-stone-500">Cargando…</p>}
      {movimientos && (
        <section className="rounded-lg border border-stone-200 bg-white px-4 py-2">
          <ListaMovimientos
            movimientos={movimientos}
            nombres={nombres}
            alCambiar={() => setVersion((v) => v + 1)}
            vacio={hayFiltros ? 'Ningún movimiento coincide con los filtros.' : 'Todavía no hay movimientos.'}
          />
          {movimientos.length === LIMITE && (
            <p className="py-2 text-sm text-stone-500">Se muestran los últimos {LIMITE}. Usá los filtros para ver más atrás.</p>
          )}
        </section>
      )}
    </div>
  )
}
