import { Navigate, Route, Routes } from 'react-router'
import { supabaseConfigurado } from './lib/supabase.js'
import FaltaConfiguracion from './pages/FaltaConfiguracion.jsx'
import Catalogo from './pages/Catalogo.jsx'
import EnConstruccion from './pages/EnConstruccion.jsx'

export default function App() {
  if (!supabaseConfigurado) return <FaltaConfiguracion />

  return (
    <Routes>
      <Route path="/" element={<Catalogo />} />
      <Route path="/producto/:id" element={<EnConstruccion titulo="Ficha de producto" />} />
      <Route path="/carrito" element={<EnConstruccion titulo="Carrito" />} />
      <Route path="/admin/login" element={<EnConstruccion titulo="Ingreso" />} />
      <Route path="/admin/*" element={<EnConstruccion titulo="Panel administrativo" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
