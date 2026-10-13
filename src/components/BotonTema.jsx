import { useTema } from '../tema/contexto.js'

const Luna = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
)

const Sol = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)

// Luna en claro, sol en oscuro: un toque alterna. Por defecto va sobre el encabezado azul.
export default function BotonTema({ className = 'bg-white/15 text-white hover:bg-white/25 focus-visible:outline-white' }) {
  const { oscuro, alternar } = useTema()
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className={`grid h-9 w-9 shrink-0 place-items-center rounded-full focus-visible:outline-2 ${className}`}
    >
      {oscuro ? <Sol /> : <Luna />}
    </button>
  )
}
