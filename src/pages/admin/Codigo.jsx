import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'
import { salir } from '../../auth/acciones.js'
import { useAuth } from '../../auth/contexto.js'
import { RUTA_PASO } from '../../auth/codigo.js'
import CampoCodigo from '../../components/CampoCodigo.jsx'
import PantallaIngreso from '../../components/PantallaIngreso.jsx'
import { supabase } from '../../lib/supabase.js'

export const CODIGO_INCORRECTO = 'El código no es correcto. Fijate que sea el que se ve ahora en la app.'

// Segundo paso del ingreso de un administrador: el código de Google Authenticator.
export default function Codigo() {
  const { cargando, perfil, paso, refrescar } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (cargando) return <p className="p-6 text-suave">Cargando…</p>
  if (!perfil) return <Navigate to="/admin/login" replace />
  if (paso !== 'codigo') return <Navigate to={paso ? RUTA_PASO[paso] : (location.state?.desde ?? '/admin')} replace state={location.state} />

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.[0]
    const { error: errorCodigo } = factor
      ? await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo })
      : { error: true }
    if (errorCodigo) {
      setError(CODIGO_INCORRECTO)
      setCodigo('')
      setEnviando(false)
      return
    }
    await refrescar()
  }

  async function volver() {
    await salir()
    navigate('/admin/login', { replace: true })
  }

  return (
    <PantallaIngreso titulo="Código de seguridad">
      <form onSubmit={enviar} className="tarjeta space-y-4">
        <p className="text-[13px]">
          Abrí Google Authenticator en tu celular y escribí el código de 6 números de <b>Stock · {perfil.username}</b>.
        </p>
        <CampoCodigo etiqueta="Código" valor={codigo} alCambiar={setCodigo} />
        {error && (
          <p role="alert" className="text-[13px] text-sin-stock">
            {error}
          </p>
        )}
        <button type="submit" disabled={enviando || codigo.length !== 6} className="btn-accion w-full py-3 text-sm">
          {enviando ? 'Verificando…' : 'Verificar'}
        </button>
        <button type="button" onClick={volver} className="enlace mx-auto block text-[13px]">
          Volver
        </button>
      </form>
      <p className="text-center text-[11px] text-suave">¿Cambiaste o perdiste el celular? Pedile a otro administrador que te restablezca el código.</p>
    </PantallaIngreso>
  )
}
