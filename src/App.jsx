import { Navigate, Route, Routes } from 'react-router'
import AuthProvider from './auth/AuthProvider.jsx'
import Protegida from './auth/Protegida.jsx'
import { supabaseConfigurado } from './lib/supabase.js'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import Login from './pages/admin/Login.jsx'
import MarcasCategorias from './pages/admin/MarcasCategorias.jsx'
import Movimientos from './pages/admin/Movimientos.jsx'
import Pendiente from './pages/admin/Pendiente.jsx'
import Producto from './pages/admin/Producto.jsx'
import Productos from './pages/admin/Productos.jsx'
import RegistrarMovimiento from './pages/admin/RegistrarMovimiento.jsx'
import Tablero from './pages/admin/Tablero.jsx'
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
          <Route index element={<Tablero />} />
          <Route path="productos" element={<Productos />} />
          <Route
            path="productos/nuevo"
            element={
              <Protegida soloAdmin>
                <Producto />
              </Protegida>
            }
          />
          <Route path="productos/:id" element={<Producto />} />
          <Route path="movimientos" element={<Movimientos />} />
          <Route path="movimientos/nuevo" element={<RegistrarMovimiento />} />
          <Route
            path="marcas-categorias"
            element={
              <Protegida soloAdmin>
                <MarcasCategorias />
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
