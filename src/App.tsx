import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AppShell } from '@/components/layout/AppShell';
import { UpdatePrompt } from '@/components/ui/UpdatePrompt';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { MaquilasPage } from '@/pages/MaquilasPage';
import { TostionPage } from '@/pages/TostionPage';
import { ProduccionPage } from '@/pages/ProduccionPage';
import { FacturacionPage } from '@/pages/FacturacionPage';
import { ClientesPage } from '@/pages/ClientesPage';
import { UsuariosPage } from '@/pages/UsuariosPage';
import { HorariosPage } from '@/pages/HorariosPage';
import { MaquinasPage } from '@/pages/MaquinasPage';
import { TriladoPage } from '@/pages/TriladoPage';

function NotFound() {
  return (
    <div className="page flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-3">
        <p className="text-5xl font-bold opacity-20">404</p>
        <p className="text-lg font-semibold text-[var(--color-tx-primary)]">Página no encontrada</p>
        <p className="text-sm text-[var(--color-tx-secondary)]">La ruta solicitada no existe en el sistema.</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <UpdatePrompt />
      <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<DashboardPage />} />
          <Route path="/maquilas"    element={<MaquilasPage />} />
          <Route path="/trillado"    element={<TriladoPage />} />
          <Route path="/tostion"     element={<TostionPage />} />
          <Route path="/produccion"  element={<ProduccionPage />} />
          <Route path="/facturacion" element={<FacturacionPage />} />
          <Route path="/clientes"    element={<ClientesPage />} />
          <Route path="/usuarios"    element={<UsuariosPage />} />
          <Route path="/horarios"    element={<HorariosPage />} />
          <Route path="/maquinas"    element={<MaquinasPage />} />
          <Route path="*"            element={<NotFound />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  );
}
