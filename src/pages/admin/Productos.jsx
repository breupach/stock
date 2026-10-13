import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../../auth/contexto.js'
import EstadoStock from '../../components/EstadoStock.jsx'
import { fotoPrincipal } from '../../lib/catalogo.js'
import { calcularEstado } from '../../lib/estado.js'
import { formatearCantidad, formatearPrecio } from '../../lib/formato.js'
import { urlFoto } from '../../lib/fotos.js'
import { filtrarProductos, unidadPara } from '../../lib/productos.js'
import { supabase } from '../../lib/supabase.js'

const FILTROS = [
  { valor: 'todos', etiqueta: 'Todos' },
  { valor: 'bajo', etiqueta: 'Stock bajo' },
  { valor: 'sin_stock', etiqueta: 'Sin stock' },
]

const Saldo = ({ p }) => (
  <span className="tabular-nums">
    {formatearCantidad(p.stock)} <span className="text-suave">{unidadPara(p.unit, p.stock)}</span>
  </span>
)

const insignia = 'mr-1.5 rounded bg-foto px-1.5 py-px align-middle text-[11px] font-medium text-suave'
const Marcas = ({ p }) => (
  <>
    {!p.active && <span className={insignia}>Inactivo</span>}
    {p.active && !p.visible && <span className={insignia}>Oculto</span>}
  </>
)

// Foto principal en chico, para distinguir piezas de nombre parecido.
const Miniatura = ({ ruta, tamano = 'h-11 w-11' }) => (
  <span className={`${tamano} block shrink-0 overflow-hidden rounded-md bg-foto`}>
    {ruta && <img src={urlFoto(ruta)} alt="" loading="lazy" className="h-full w-full object-cover" />}
  </span>
)

const aplicacion = (p) => [p.model, p.year].filter(Boolean).join(' · ')

export default function Productos() {
  const { perfil } = useAuth()
  const navegar = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const [productos, setProductos] = useState(null)
  const [fotos, setFotos] = useState({})
  const [error, setError] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const filtro = FILTROS.some((f) => f.valor === parametros.get('filtro')) ? parametros.get('filtro') : 'todos'
  const setFiltro = (valor) => setParametros(valor === 'todos' ? {} : { filtro: valor }, { replace: true })
  const [inactivos, setInactivos] = useState(false)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase
        .from('products')
        .select('id, sku, name, model, year, unit, price, stock, min_stock, active, visible, brands(name), categories(name)')
        .order('name'),
      supabase.from('product_photos').select('product_id, storage_path, sort_order'),
    ]).then(([{ data, error }, imagenes]) => {
      if (!vigente) return
      if (error) return setError('No se pudieron cargar los productos.')
      setProductos(data)
      setFotos(fotoPrincipal(imagenes.data ?? []))
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
        <h1 className="titulo">Productos</h1>
        {perfil?.role === 'admin' && (
          <Link to="/admin/productos/nuevo" className="btn-accion">
            Nuevo producto
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          aria-label="Buscar"
          placeholder="Buscar por nombre, código, marca…"
          className="campo mt-0 sm:w-72"
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
              className="ficha"
            >
              {f.etiqueta}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" className="accent-activo" checked={inactivos} onChange={(e) => setInactivos(e.target.checked)} />
          Mostrar inactivos
        </label>
      </div>

      {error && <p className="text-sin-stock">{error}</p>}
      {!error && productos === null && <p className="text-suave">Cargando…</p>}
      {productos && lista.length === 0 && (
        <p className="text-suave">{productos.length === 0 ? 'Todavía no hay productos.' : 'Ningún producto coincide.'}</p>
      )}

      {lista.length > 0 && (
        <>
          {/* Celular: lista con foto */}
          <ul className="tarjeta divide-y divide-linea px-3 py-0.5 md:hidden">
            {lista.map((p) => (
              <li key={p.id}>
                <Link to={`/admin/productos/${p.id}`} className="flex items-center gap-2.5 py-2.5">
                  <Miniatura ruta={fotos[p.id]} />
                  <span className="grid min-w-0 flex-1 gap-px">
                    <span className="text-sm leading-snug font-semibold"><Marcas p={p} />{p.name}</span>
                    <span className="truncate font-mono text-[11px] text-suave">
                      {[p.sku, p.brands?.name].filter(Boolean).join(' · ')}
                    </span>
                    <EstadoStock estado={calcularEstado(p.stock, p.min_stock)} />
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-0.5">
                    <span className="text-[17px] font-semibold text-tinta tabular-nums">{formatearPrecio(p.price)}</span>
                    <span className="text-[13px]"><Saldo p={p} /></span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <table className="hidden w-full overflow-hidden rounded-lg border border-linea bg-superficie text-[13px] md:table">
            <thead className="border-b border-linea bg-papel text-left text-[11px] font-semibold tracking-wider text-suave uppercase">
              <tr>
                <th className="w-13 py-2.5 pl-3"><span className="sr-only">Foto</span></th>
                <th className="px-3 py-2.5">Código</th>
                <th className="px-3 py-2.5">Producto</th>
                <th className="px-3 py-2.5">Marca</th>
                <th className="px-3 py-2.5">Categoría</th>
                <th className="px-3 py-2.5 text-right">Stock</th>
                <th className="px-3 py-2.5">Estado</th>
                <th className="px-3 py-2.5 text-right">Precio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-linea">
              {lista.map((p) => (
                <tr key={p.id} onClick={() => abrir(p.id)} className="cursor-pointer hover:bg-papel">
                  <td className="py-2 pl-3"><Miniatura ruta={fotos[p.id]} tamano="h-9 w-9" /></td>
                  <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap">{p.sku}</td>
                  <td className="px-3 py-2">
                    <Marcas p={p} />
                    <Link to={`/admin/productos/${p.id}`} className="text-sm font-semibold hover:underline">{p.name}</Link>
                    {aplicacion(p) && <span className="block font-mono text-[11px] text-suave">{aplicacion(p)}</span>}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px]">{p.brands?.name ?? '—'}</td>
                  <td className="px-3 py-2">{p.categories?.name ?? '—'}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap"><Saldo p={p} /></td>
                  <td className="px-3 py-2"><EstadoStock estado={calcularEstado(p.stock, p.min_stock)} /></td>
                  <td className="px-3 py-2 text-right text-sm font-semibold whitespace-nowrap text-tinta tabular-nums">{formatearPrecio(p.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
