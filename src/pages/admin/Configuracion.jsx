import { useEffect, useState } from 'react'
import { olvidarConfiguracion } from '../../lib/configuracion.js'
import { supabase } from '../../lib/supabase.js'
import { linkWhatsApp } from '../../lib/whatsapp.js'

const campo = 'campo'

export default function Configuracion() {
  const [f, setF] = useState(null)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vigente = true
    supabase
      .from('settings')
      .select('key, value')
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) return setError('No se pudo cargar la configuración.')
        const s = Object.fromEntries(data.map((x) => [x.key, x.value]))
        setF({ nombre_negocio: s.nombre_negocio ?? '', whatsapp_numero: s.whatsapp_numero ?? '' })
      })
    return () => {
      vigente = false
    }
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    const digitos = f.whatsapp_numero.replace(/\D/g, '')
    if (f.whatsapp_numero.trim() && digitos.length < 10) {
      return setError('El número parece incompleto. Escribilo con código de país y de área, por ejemplo 54 9 11 1234 5678.')
    }
    setGuardando(true)
    const resultados = await Promise.all(
      Object.entries({ nombre_negocio: f.nombre_negocio.trim(), whatsapp_numero: digitos }).map(([key, value]) =>
        supabase.from('settings').update({ value }).eq('key', key),
      ),
    )
    setGuardando(false)
    if (resultados.some((r) => r.error)) return setError('No se pudo guardar. Probá de nuevo.')
    olvidarConfiguracion()
    setF({ ...f, whatsapp_numero: digitos })
    setAviso('Guardado.')
  }

  if (!f) return error ? <p className="text-sin-stock">{error}</p> : <p className="text-suave">Cargando…</p>
  const prueba = linkWhatsApp(f.whatsapp_numero, 'Prueba desde el panel')

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="titulo">Configuración</h1>
      <form onSubmit={guardar} noValidate className="tarjeta space-y-4">
        <label className="block">
          <span className="etiqueta">Nombre del negocio</span>
          <input className={campo} value={f.nombre_negocio} onChange={(e) => setF({ ...f, nombre_negocio: e.target.value })} />
          <span className="ayuda">Aparece arriba en el catálogo y en el saludo del mensaje.</span>
        </label>
        <label className="block">
          <span className="etiqueta">Número de WhatsApp</span>
          <input className={campo} inputMode="tel" placeholder="54 9 11 1234 5678" value={f.whatsapp_numero} onChange={(e) => setF({ ...f, whatsapp_numero: e.target.value })} />
          <span className="ayuda">
            Con código de país (54), el 9 de celular y el código de área, sin 0 ni 15. Si queda vacío, el carrito no muestra el botón de WhatsApp.
          </span>
        </label>
        {error && <p role="alert" className="text-[13px] text-sin-stock">{error}</p>}
        {aviso && <p role="status" className="text-[13px] text-disponible">{aviso}</p>}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={guardando} className="btn-accion">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
          {prueba && (
            <a href={prueba} target="_blank" rel="noopener noreferrer" className="enlace text-[13px]">
              Probar el número
            </a>
          )}
        </div>
      </form>
    </div>
  )
}
