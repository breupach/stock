import { Navigate, Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider.jsx'
import Protegida from './auth/Protegida.jsx'
import { supabaseConfigurado } from './lib/supabase.js'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Login from './pages/admin/Login.jsx'
import Pendiente from './pages/admin/Pendiente.jsx'
import Usuarios from './pages/admin/Usuarios.jsx'
import Catalogo from './pages/Catalogo.jsx'
import EnConstruccion from './pages/EnConstruccion.jsx'
import FaltaConfiguracion from './pages/FaltaConfiguracion.jsx'

export default function App() {
  if (!supabaseConfigurado) return <FaltaConfiguracion />

  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Catalogo />} />
        <Route path="/producto/:id" element={<EnConstruccion titulo="Ficha de producto" />} />
        <Route path="/carrito" element={<EnConstruccion titulo="Carrito" />} />
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <Protegida>
              <AdminLayout />
            </Protegida>
          }
        >
          <Route index element={<Pendiente titulo="Tablero" />} />
          <Route path="productos" element={<Pendiente titulo="Productos" />} />
          <Route path="movimientos" element={<Pendiente titulo="Movimientos" />} />
          <Route
            path="marcas-categorias"
            element={
              <Protegida soloAdmin>
                <Pendiente titulo="Marcas y categorías" />
              </Protegida>
            }
          />
          <Route
            path="usuarios"
            element={
              <Protegida soloAdmin>
                <Usuarios />
              </Protegida>
            }
          />
          <Route
            path="configuracion"
            element={
              <Protegida soloAdmin>
                <Pendiente titulo="Configuración" />
              </Protegida>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
