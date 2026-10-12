import { ETIQUETA_ESTADO } from '../lib/estado.js'

const COLORES = {
  disponible: 'text-disponible',
  ultimas: 'text-ultimas',
  sin_stock: 'text-sin-stock',
}

export default function EstadoStock({ estado }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium whitespace-nowrap ${COLORES[estado] ?? ''}`}>
      <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full bg-current" />
      {ETIQUETA_ESTADO[estado] ?? estado}
    </span>
  )
}
