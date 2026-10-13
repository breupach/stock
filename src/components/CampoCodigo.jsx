import { limpiarCodigo } from '../auth/codigo.js'

// Campo de 6 números: teclado numérico en el celular, acepta pegar y ofrece el
// código que el celular haya copiado.
export default function CampoCodigo({ etiqueta, valor, alCambiar }) {
  return (
    <label className="block">
      <span className="etiqueta">{etiqueta}</span>
      <input
        className="campo py-2.5 text-center font-mono text-2xl tracking-[0.3em] md:text-2xl"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]{6}"
        maxLength={7}
        value={valor}
        onChange={(e) => alCambiar(limpiarCodigo(e.target.value))}
        required
      />
    </label>
  )
}
