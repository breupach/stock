import { ETIQUETA_ESTADO } from '../lib/estado.js'

const COLORES = {
  disponible: 'bg-disponible/10 text-disponible',
  ultimas: 'bg-ultimas/10 text-ultimas',
  sin_stock: 'bg-sin-stock/10 text-sin-stock',
}

export default function EstadoStock({ estado }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${COLORES[estado] ?? ''}`}>
      {ETIQUETA_ESTADO[estado] ?? estado}
    </span>
  )
}
