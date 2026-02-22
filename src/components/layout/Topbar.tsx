import { Menu, Moon, Sun, LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  });
}

function getInitial(name?: string, email?: string): string {
  const src = name ?? email ?? '?';
  return src.charAt(0).toUpperCase();
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  operario: 'Operario',
  facturacion: 'Facturación',
};

export function Topbar({ onMenuClick, title, subtitle }: TopbarProps) {
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      {/* Hamburguesa mobile */}
      <button
        className="btn btn-icon btn-ghost lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu size={18} />
      </button>

      {/* Título + fecha */}
      <div className="flex-1 min-w-0">
        {title && (
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-semibold text-[var(--color-tx-primary)] leading-tight truncate">
              {title}
            </h1>
            {subtitle && (
              <span className="text-xs text-[var(--color-tx-secondary)] hidden sm:block">
                — {subtitle}
              </span>
            )}
          </div>
        )}
        <p className="text-[11px] text-[var(--color-tx-secondary)] capitalize hidden md:block leading-tight mt-0.5">
          {getDateLabel()}
        </p>
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-1.5">
        {/* Notificaciones (decorativo) */}
        <button
          className="btn btn-icon btn-ghost relative"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#00D084]" />
        </button>

        {/* Theme toggle */}
        <button
          className="btn btn-icon btn-ghost"
          onClick={toggle}
          aria-label="Cambiar tema"
          title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
        >
          {theme === 'dark'
            ? <Sun size={15} className="text-amber-400" />
            : <Moon size={15} />
          }
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-[var(--color-border)] mx-1" />

        {/* User section */}
        <div className="flex items-center gap-2">
          {/* Avatar con inicial */}
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-[#00D084] bg-[#00D084]/15 ring-1 ring-[#00D084]/30 select-none shrink-0">
            {getInitial(user?.name, user?.email)}
          </div>

          {/* Nombre y rol */}
          <div className="hidden sm:block min-w-0">
            <p className="text-xs font-semibold leading-tight text-[var(--color-tx-primary)] truncate max-w-[120px]">
              {user?.name ?? user?.email}
            </p>
            <p className="text-[10px] text-[var(--color-tx-secondary)] leading-tight">
              {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            </p>
          </div>

          {/* Logout */}
          <button
            className="btn btn-icon btn-ghost text-[var(--color-tx-secondary)] hover:text-red-500"
            onClick={handleLogout}
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
