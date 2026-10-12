import { useEffect, useState } from 'react'
import Encabezado from '../components/Encabezado.jsx'
import EstadoStock from '../components/EstadoStock.jsx'
import { formatearPrecio } from '../lib/formato.js'
import { supabase } from '../lib/supabase.js'

// Versión inicial: lista el catálogo público para comprobar la conexión con Supabase.
// Filtros, fotos y tiempo real llegan en la etapa del catálogo.
export default function Catalogo() {
  const [productos, setProductos] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('catalogo_publico')
      .select('id, name, brand_name, model, price, status')
      .order('name')
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setProductos(data)
      })
  }, [])

  return (
    <>
      <Encabezado />
      <main className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="mb-4 text-2xl font-semibold">Catálogo</h1>
        {error && <p className="text-sin-stock">No se pudo cargar el catálogo: {error}</p>}
        {!error && productos === null && <p className="text-stone-500">Cargando…</p>}
        {productos?.length === 0 && <p className="text-stone-500">Todavía no hay productos.</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productos?.map((p) => (
            <li key={p.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-stone-500">{[p.brand_name, p.model].filter(Boolean).join(' · ')}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-semibold">{formatearPrecio(p.price)}</span>
                <EstadoStock estado={p.status} />
              </div>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
