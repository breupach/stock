import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import AgregarAlCarrito from '../components/AgregarAlCarrito.jsx'
import Encabezado from '../components/Encabezado.jsx'
import EstadoStock from '../components/EstadoStock.jsx'
import { useEstadosEnVivo } from '../hooks/useEstadosEnVivo.js'
import { formatearPrecio } from '../lib/formato.js'
import { urlFoto } from '../lib/fotos.js'
import { UNIDADES } from '../lib/productos.js'
import { supabase } from '../lib/supabase.js'

function Galeria({ fotos, nombre }) {
  const [actual, setActual] = useState(0)
  if (fotos.length === 0) {
    return <div className="flex aspect-[4/3] items-center md:aspect-square justify-center rounded-lg bg-stone-100 text-stone-400">Sin foto</div>
  }
  return (
    <div>
      <img src={urlFoto(fotos[actual].storage_path)} alt={nombre} className="aspect-square w-full rounded-lg border border-stone-200 bg-white object-contain" />
      {fotos.length > 1 && (
        <ul className="mt-2 flex gap-2">
          {fotos.map((f, i) => (
            <li key={f.id}>
              <button
                type="button"
                aria-label={`Ver foto ${i + 1}`}
                aria-pressed={i === actual}
                onClick={() => setActual(i)}
                className={`block h-16 w-16 overflow-hidden rounded-md border-2 ${i === actual ? 'border-marca' : 'border-transparent'}`}
              >
                <img src={urlFoto(f.storage_path)} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function FichaProducto() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [producto, setProducto] = useState(null)
  const [fotos, setFotos] = useState([])
  const [estadoCarga, setEstadoCarga] = useState('cargando')
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let vigente = true
    Promise.all([
      supabase
        .from('catalogo_publico')
        .select('id, sku, name, brand_name, model, year, category_name, description, unit, price, status')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('product_photos').select('id, storage_path, sort_order').eq('product_id', id).order('sort_order'),
    ]).then(([p, f]) => {
      if (!vigente) return
      if (p.error) return setEstadoCarga('error')
      if (!p.data) return setEstadoCarga('no_existe')
      setProducto(p.data)
      setFotos(f.data ?? [])
      setEstadoCarga('listo')
    })
    return () => {
      vigente = false
    }
  }, [id, version])

  const alCambiar = useCallback((_, estado) => setProducto((p) => (p ? { ...p, status: estado } : p)), [])
  useEstadosEnVivo({ productoId: id, alCambiar, alReconectar: () => setVersion((v) => v + 1) })

  const volver = () => (window.history.length > 1 ? navegar(-1) : navegar('/'))

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <button type="button" onClick={volver} className="mb-4 text-sm text-marca underline">
          ← Volver al catálogo
        </button>
        {estadoCarga === 'cargando' && <p className="text-stone-500">Cargando…</p>}
        {estadoCarga === 'error' && <p className="text-sin-stock">No se pudo cargar el producto. Probá recargar la página.</p>}
        {estadoCarga === 'no_existe' && (
          <p className="text-stone-500">
            Este producto ya no está publicado. <Link to="/" className="text-marca underline">Ver el catálogo</Link>
          </p>
        )}
        {producto && estadoCarga === 'listo' && (
          <div className="grid gap-6 md:grid-cols-2">
            <Galeria fotos={fotos} nombre={producto.name} />
            <div>
              <h1 className="text-2xl font-semibold">{producto.name}</h1>
              <p className="mt-1 text-stone-500">
                {[producto.brand_name, producto.model, producto.year].filter(Boolean).join(' · ')}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-semibold">{formatearPrecio(producto.price)}</span>
                {producto.unit !== 'unidad' && (
                  <span className="text-stone-500">por {UNIDADES[producto.unit]?.toLowerCase()}</span>
                )}
                <EstadoStock estado={producto.status} />
              </div>
              {producto.description && <p className="mt-4 whitespace-pre-line">{producto.description}</p>}
              <AgregarAlCarrito producto={producto} />
              <dl className="mt-6 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                <dt className="text-stone-500">Código</dt>
                <dd>{producto.sku}</dd>
                {producto.category_name && (
                  <>
                    <dt className="text-stone-500">Categoría</dt>
                    <dd>{producto.category_name}</dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
