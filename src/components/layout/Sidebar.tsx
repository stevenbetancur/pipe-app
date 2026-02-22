import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FlaskConical, Factory, FileText,
  Users, Clock, Cpu, LogOut, Package,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/store/auth.store';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: string;
}

interface NavGroup {
  id: string;
  title: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    id: 'pipeline',
    title: 'Flujo de trabajo',
    items: [
      { to: '/dashboard',  label: 'Dashboard',   icon: <LayoutDashboard size={15} /> },
      { to: '/maquilas',   label: 'Maquilas',    icon: <Package size={15} /> },
      { to: '/tostion',    label: 'Tostión',     icon: <FlaskConical size={15} /> },
      { to: '/produccion', label: 'Producción',  icon: <Factory size={15} /> },
      { to: '/facturacion',label: 'Facturación', icon: <FileText size={15} /> },
    ],
  },
  {
    id: 'admin',
    title: 'Administración',
    items: [
      { to: '/clientes', label: 'Clientes', icon: <Users size={15} /> },
      { to: '/horarios', label: 'Horarios', icon: <Clock size={15} />, roles: ['admin'] },
      { to: '/maquinas', label: 'Máquinas', icon: <Cpu size={15} />, roles: ['admin'] },
      { to: '/usuarios', label: 'Usuarios', icon: <Users size={15} />, roles: ['admin'] },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredGroups = navGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !item.roles || (user?.role && item.roles.includes(user.role))
    ),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Overlay mobile */}
      <div
        className={cn('sidebar-overlay', open && 'open')}
        onClick={onClose}
      />

      <aside className={cn('sidebar', open && 'open')}>
        {/* Logo */}
        <div className="px-5 pt-6 pb-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            {/* Logomark */}
            <div className="relative w-9 h-9 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D084] to-[#00A86B] flex items-center justify-center shadow-lg shadow-[#00D084]/20">
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="4" width="4" height="12" rx="2" fill="#0F1419" opacity="0.9"/>
                  <rect x="8" y="7" width="4" height="9" rx="2" fill="#0F1419" opacity="0.9"/>
                  <rect x="14" y="2" width="4" height="14" rx="2" fill="#0F1419" opacity="0.9"/>
                </svg>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00D084] border-2 border-[#0F1419]" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-bold text-base leading-tight tracking-wide">PIPE</p>
              <p className="text-white/35 text-[10px] leading-tight tracking-wider uppercase">Industrial Suite</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.id}>
              <div className="flex items-center gap-2 px-3 mb-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                  {group.title}
                </p>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <div className="space-y-0.5">
                {group.items.map((item, idx) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn('nav-item group/item', isActive && 'active')
                    }
                  >
                    <span className="opacity-70 group-[.active]/item:opacity-100 transition-opacity">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {group.id === 'pipeline' && idx > 0 && (
                      <span className="text-[9px] font-bold tabular-nums text-white/20 group-[.active]/item:text-[#00D084]/60">
                        {String(idx).padStart(2, '0')}
                      </span>
                    )}
                    {item.badge && (
                      <span className="text-[9px] font-bold bg-[#00D084] text-[#0F1419] px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer — usuario */}
        <div className="px-4 py-4 border-t border-white/5">
          {user && (
            <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-white/5 transition-colors group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white/15 to-white/5 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                <span className="text-xs font-bold text-white/80">
                  {user.name?.charAt(0).toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-white/80 text-xs font-semibold truncate leading-tight">{user.name}</p>
                <p className="text-white/30 text-[10px] truncate leading-tight capitalize">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="p-1.5 rounded-md text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
