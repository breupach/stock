import { useConfiguracion } from '../hooks/useConfiguracion.js'
import BotonTema from './BotonTema.jsx'

// Marco de las pantallas de ingreso al panel: nombre del negocio, título y botón de tema.
// `arriba` alinea el contenido arriba en lugar de centrarlo, para pantallas largas.
export default function PantallaIngreso({ titulo, arriba = false, children }) {
  const config = useConfiguracion()
  return (
    <main className={`relative mx-auto flex min-h-dvh max-w-sm flex-col gap-3.5 px-4 ${arriba ? 'pt-14 pb-8' : 'justify-center'}`}>
      <div className="absolute top-3 right-3">
        <BotonTema className="border border-linea bg-superficie text-tinta hover:border-tinta focus-visible:outline-tinta" />
      </div>
      <div>
        {config?.nombre_negocio && <p className="text-[13px] text-suave">{config.nombre_negocio}</p>}
        <h1 className="titulo">{titulo}</h1>
      </div>
      {children}
    </main>
  )
}
