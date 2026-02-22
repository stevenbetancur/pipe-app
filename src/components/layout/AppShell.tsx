import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard', subtitle: 'Vista general del ciclo productivo' },
  '/maquilas':   { title: 'Maquilas', subtitle: 'Registro y gestión de pedidos' },
  '/tostion':    { title: 'Tostión', subtitle: 'Trazabilidad del proceso de tostado' },
  '/produccion': { title: 'Producción', subtitle: 'Empaque, molido y control de calidad' },
  '/facturacion':{ title: 'Facturación', subtitle: 'Documentos y confirmación de entrega' },
  '/clientes':   { title: 'Clientes',  subtitle: 'Directorio de clientes' },
  '/usuarios':   { title: 'Usuarios',  subtitle: 'Gestión de accesos y roles' },
  '/horarios':   { title: 'Horarios',  subtitle: 'Plantillas de horario operativo' },
  '/maquinas':   { title: 'Máquinas',  subtitle: 'Inventario y estado de maquinaria' },
  '/usuarios':   { title: 'Usuarios', subtitle: 'Gestión de accesos y roles' },
  '/horarios':   { title: 'Horarios', subtitle: 'Plantillas de turnos' },
  '/maquinas':   { title: 'Máquinas', subtitle: 'Asignación de maquinaria' },
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const meta = PAGE_TITLES[location.pathname];

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-content">
        <Topbar
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
          title={meta?.title}
          subtitle={meta?.subtitle}
        />

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
