import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../auth/contexto.js'
import { agruparClave, imagenQr, RUTA_PASO } from '../../auth/codigo.js'
import CampoCodigo from '../../components/CampoCodigo.jsx'
import PantallaIngreso from '../../components/PantallaIngreso.jsx'
import { supabase } from '../../lib/supabase.js'
import { CODIGO_INCORRECTO } from './Codigo.jsx'

// Prepara un código nuevo. Antes borra los que quedaron a medio activar (por
// ejemplo, si alguien cerró esta pantalla sin terminar), porque Supabase no
// deja tener dos con el mismo nombre.
async function prepararCodigo(usuario) {
  const { data: lista } = await supabase.auth.mfa.listFactors()
  for (const f of lista?.all ?? []) {
    if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
  }
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Google Authenticator',
    issuer: `Stock · ${usuario}`,
  })
  if (error) throw error
  return { id: data.id, qr: imagenQr(data.totp.qr_code), clave: data.totp.secret }
}

function Paso({ numero, children }) {
  return (
    <li className="grid grid-cols-[22px_minmax(0,1fr)] items-start gap-2">
      <span aria-hidden="true" className="grid h-[22px] w-[22px] place-items-center rounded-full bg-tinta text-[11px] font-semibold text-superficie">
        {numero}
      </span>
      <div className="grid min-w-0 gap-2 text-[13px]">{children}</div>
    </li>
  )
}

// Primera vez de un administrador: activa Google Authenticator antes de entrar al panel.
export default function ActivarCodigo() {
  const { cargando, perfil, paso, refrescar } = useAuth()
  const location = useLocation()
  const [factor, setFactor] = useState(null)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const pedido = useRef(false)

  const debeActivar = !cargando && perfil && paso === 'activar'

  useEffect(() => {
    if (!debeActivar || pedido.current) return
    pedido.current = true
    prepararCodigo(perfil.username)
      .then(setFactor)
      .catch(() => setError('No se pudo preparar el código. Recargá la página para intentar de nuevo.'))
  }, [debeActivar, perfil])

  if (cargando) return <p className="p-6 text-suave">Cargando…</p>
  if (!perfil) return <Navigate to="/admin/login" replace />
  if (paso !== 'activar') return <Navigate to={paso ? RUTA_PASO[paso] : (location.state?.desde ?? '/admin')} replace state={location.state} />

  async function enviar(e) {
    e.preventDefault()
    setEnviando(true)
    setError(null)
    const { error: errorCodigo } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code: codigo })
    if (errorCodigo) {
      setError(CODIGO_INCORRECTO)
      setCodigo('')
      setEnviando(false)
      return
    }
    await refrescar()
  }

  return (
    <PantallaIngreso titulo="Activá el código de seguridad" arriba>
      <form onSubmit={enviar} className="tarjeta space-y-4">
        <p className="text-[13px] text-suave">
          Como sos administrador, vas a entrar con usuario, contraseña y un código del celular. Se hace una sola vez.
        </p>
        <ol className="grid gap-3">
          <Paso numero={1}>
            <p>
              Instalá <b>Google Authenticator</b> en tu celular.
            </p>
          </Paso>
          <Paso numero={2}>
            <p>
              Tocá <b>+</b> y escaneá este código.
            </p>
            {/* Fondo blanco también en modo oscuro, para que la cámara lo lea. */}
            <div className="h-28 w-28 rounded-lg border border-linea bg-white p-1.5">
              {factor && <img src={factor.qr} alt="Código QR para Google Authenticator" className="h-full w-full" />}
            </div>
            <span className="text-[11px] text-suave">Si no podés escanearlo, cargá esta clave:</span>
            <code className="justify-self-start rounded-md bg-foto px-2 py-1 font-mono text-[13px] tracking-wide break-all">
              {factor ? agruparClave(factor.clave) : '…'}
            </code>
          </Paso>
          <Paso numero={3}>
            <CampoCodigo etiqueta="Código de 6 números" valor={codigo} alCambiar={setCodigo} />
          </Paso>
        </ol>
        {error && (
          <p role="alert" className="text-[13px] text-sin-stock">
            {error}
          </p>
        )}
        <button type="submit" disabled={!factor || enviando || codigo.length !== 6} className="btn-accion w-full py-3 text-sm">
          {enviando ? 'Activando…' : 'Activar y entrar'}
        </button>
      </form>
    </PantallaIngreso>
  )
}
