import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import ListaMovimientos from '../../components/ListaMovimientos.jsx'
import { COLUMNAS_MOVIMIENTO, marcarRevertidos } from '../../lib/consultasMovimientos.js'
import { ETIQUETA_TIPO } from '../../lib/movimientos.js'
import { supabase } from '../../lib/supabase.js'

const LIMITE = 200
const campo = 'campo py-1.5'
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
        <h1 className="titulo">Movimientos</h1>
        <Link to="/admin/movimientos/nuevo" className="btn-accion">
          Registrar movimiento
        </Link>
      </div>

      <div className="tarjeta grid grid-cols-2 gap-3 p-3 sm:grid-cols-5">
        <label className="col-span-2 sm:col-span-1">
          <span className="text-[11px] font-semibold tracking-wider text-suave uppercase">Producto</span>
          <select className={campo} value={filtros.producto} onChange={set('producto')}>
            <option value="">Todos</option>
            {opciones.productos.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold tracking-wider text-suave uppercase">Tipo</span>
          <select className={campo} value={filtros.tipo} onChange={set('tipo')}>
            <option value="">Todos</option>
            {Object.entries(ETIQUETA_TIPO).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold tracking-wider text-suave uppercase">Usuario</span>
          <select className={campo} value={filtros.usuario} onChange={set('usuario')}>
            <option value="">Todos</option>
            {opciones.usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>
        <label>
          <span className="text-[11px] font-semibold tracking-wider text-suave uppercase">Desde</span>
          <input type="date" className={campo} value={filtros.desde} onChange={set('desde')} />
        </label>
        <label>
          <span className="text-[11px] font-semibold tracking-wider text-suave uppercase">Hasta</span>
          <input type="date" className={campo} value={filtros.hasta} onChange={set('hasta')} />
        </label>
        {hayFiltros && (
          <button type="button" className="enlace col-span-2 justify-self-start text-[13px] sm:col-span-5" onClick={() => setFiltros(FILTROS_VACIOS)}>
            Limpiar filtros
          </button>
        )}
      </div>

      {error && <p className="text-sin-stock">{error}</p>}
      {!error && movimientos === null && <p className="text-suave">Cargando…</p>}
      {movimientos && (
        <section className="tarjeta py-1">
          <ListaMovimientos
            movimientos={movimientos}
            nombres={nombres}
            alCambiar={() => setVersion((v) => v + 1)}
            vacio={hayFiltros ? 'Ningún movimiento coincide con los filtros.' : 'Todavía no hay movimientos.'}
          />
          {movimientos.length === LIMITE && (
            <p className="py-2 text-[11px] text-suave">Se muestran los últimos {LIMITE}. Usá los filtros para ver más atrás.</p>
          )}
        </section>
      )}
    </div>
  )
}
