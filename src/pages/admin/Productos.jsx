import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../../auth/contexto.js'
import EstadoStock from '../../components/EstadoStock.jsx'
import { calcularEstado } from '../../lib/estado.js'
import { formatearCantidad, formatearPrecio } from '../../lib/formato.js'
import { filtrarProductos, UNIDADES } from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

const FILTROS = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'bajo', etiqueta: 'Stock bajo' },
  { valor: 'sin_stock', etiqueta: 'Sin stock' },
]

const Saldo = ({ p }) => (
  <>
    {formatearCantidad(p.stock)} <span className="text-stone-500">{UNIDADES[p.unit]?.toLowerCase()}</span>
  </>
)

const Marcas = ({ p }) => (
  <>
    {!p.active && <span className="mr-2 rounded bg-stone-200 px-1.5 text-xs">Inactivo</span>}
    {p.active && !p.visible && <span className="mr-2 rounded bg-stone-200 px-1.5 text-xs">Oculto</span>}
  </>
)

export default function Productos() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [inactivos, setInactivos] = useState(false)

  useEffect(() => {
    let vigente = true
    supabase
      .from('products')
      .select('id, sku, name, model, unit, price, stock, min_stock, active, visible, brands(name), categories(name)')
      .order('name')
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) setError('No se pudieron cargar los productos.')
        else setProductos(data)
      })
    return () => {
      vigente = false
    }
  }, [])

  const lista = productos ? filtrarProductos(productos, { busqueda, filtro, inactivos }) : []
  const abrir = (id) => navegar(`/admin/productos/${id}`)

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Productos</h1>
        {perfil?.role === 'admin' && (
          <Link to="/admin/productos/nuevo" className="rounded-md bg-marca px-4 py-2.5 font-medium text-white">
            Nuevo producto
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar por nombre, código, marca…"
          className="w-full rounded-md border border-stone-300 px-3 py-2 sm:w-72"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <div className="flex gap-1" role="group" aria-label="Filtrar por stock">
          {FILTROS.map((f) => (
            <button
              key={f.valor}
              type="button"
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
              className={`rounded-full border px-3 py-1.5 text-sm ${filtro === f.valor ? 'border-marca bg-marca text-white' : 'border-stone-300 bg-white'}`}
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      {error && <p className="text-sin-stock">{error}</p>}
      {!error && productos === null && <p className="text-stone-500">Cargando…</p>}
      {productos && lista.length === 0 && (
        <p className="text-stone-500">{productos.length === 0 ? 'Todavía no hay productos.' : 'Ningún producto coincide.'}</p>
      )}

      {lista.length > 0 && (
        <>
          {/* Celular: tarjetas */}
          <ul className="space-y-2 md:hidden">
            {lista.map((p) => (
              <li key={p.id}>
                <Link to={`/admin/productos/${p.id}`} className="block rounded-lg border border-stone-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium"><Marcas p={p} />{p.name}</p>
                      <p className="text-sm text-stone-500">
                        {[p.sku, p.brands?.name, p.model].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <EstadoStock estado={calcularEstado(p.stock, p.min_stock)} />
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span><Saldo p={p} /></span>
                    <span className="font-semibold">{formatearPrecio(p.price)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <table className="hidden w-full overflow-hidden rounded-lg border border-stone-200 bg-white text-sm md:table">
            <thead className="bg-stone-100 text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Producto</th>
                <th className="px-3 py-2 font-medium">Marca</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 text-right font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Estado</th>
                <th className="px-3 py-2 text-right font-medium">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {lista.map((p) => (
                <tr key={p.id} onClick={() => abrir(p.id)} className="cursor-pointer hover:bg-stone-50">
                  <td className="px-3 py-2 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-2">
                    <Marcas p={p} />
                    <Link to={`/admin/productos/${p.id}`} className="font-medium hover:underline">{p.name}</Link>
                    {p.model && <span className="text-stone-500"> · {p.model}</span>}
                  </td>
                  <td className="px-3 py-2">{p.brands?.name ?? '—'}</td>
                  <td className="px-3 py-2">{p.categories?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-right"><Saldo p={p} /></td>
                  <td className="px-3 py-2"><EstadoStock estado={calcularEstado(p.stock, p.min_stock)} /></td>
                  <td className="px-3 py-2 text-right font-medium">{formatearPrecio(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
