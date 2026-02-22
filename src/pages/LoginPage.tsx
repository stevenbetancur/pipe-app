import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/store/auth.store';
import { toast } from '@/lib/toast';

const schema = z.object({
  email:    z.string().email('Email invalido'),
  password: z.string().min(1, 'Contrasena requerida'),
});

type FormValues = z.infer<typeof schema>;

const DEV_CREDS = { email: 'admin@pipe.local', password: 'Admin123*' };

const STEPS = [
  { label: 'Registro de pedidos',   desc: 'Captura y trazabilidad desde el origen' },
  { label: 'Maquila y tostion',     desc: 'Control de proceso y merma en tiempo real' },
  { label: 'Produccion y empaque',  desc: 'Flujo de salida y presentacion del producto' },
  { label: 'Facturacion y entrega', desc: 'Cierre de ciclo con documentacion completa' },
];

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth  = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } =
    useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async (values) => {
    setLoading(true);
    try {
      const { user, token } = await authService.login(values);
      setAuth(user, token);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg ?? 'Credenciales incorrectas o error de conexion');
    } finally {
      setLoading(false);
    }
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'inherit' }}>

      {/* ── Panel izquierdo (branding) ── */}
      <div style={{
        width: '420px', flexShrink: 0,
        background: 'linear-gradient(160deg, #0d1a14 0%, #0a1210 100%)',
        display: 'flex', flexDirection: 'column',
        padding: '48px 40px',
        position: 'relative', overflow: 'hidden',
      }} className="hidden lg:flex">

        {/* Glow decorativo */}
        <div style={{
          position: 'absolute', top: '-80px', left: '-80px',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,208,132,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '0', right: '0',
          width: '200px', height: '200px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,208,132,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '56px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #00D084, #00a86b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,208,132,0.3)',
          }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="1"  y="10" width="3" height="7" rx="1" fill="white" fillOpacity="0.9"/>
              <rect x="6"  y="6"  width="3" height="11" rx="1" fill="white"/>
              <rect x="11" y="2"  width="3" height="15" rx="1" fill="white" fillOpacity="0.7"/>
              <rect x="15" y="8"  width="2" height="9"  rx="1" fill="white" fillOpacity="0.5"/>
            </svg>
          </div>
          <span style={{ color: '#ffffff', fontWeight: 700, fontSize: '18px', letterSpacing: '-0.3px' }}>
            PIPE
          </span>
          <span style={{
            marginLeft: 'auto', fontSize: '10px', fontWeight: 600,
            color: '#00D084', border: '1px solid rgba(0,208,132,0.35)',
            borderRadius: '4px', padding: '2px 6px', letterSpacing: '1px',
          }}>
            V2
          </span>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: '40px' }}>
          <h2 style={{
            color: '#ffffff', fontSize: '28px', fontWeight: 700,
            lineHeight: 1.25, margin: '0 0 12px',
          }}>
            Gestion industrial<br />
            <span style={{ color: '#00D084' }}>integrada</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '13px', lineHeight: 1.6, margin: 0 }}>
            Trazabilidad completa desde el pedido hasta la entrega al cliente.
          </p>
        </div>

        {/* Pipeline steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <CheckCircle2 size={15} color="#00D084" style={{ marginTop: '2px', flexShrink: 0 }} />
              <div>
                <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: '13px', fontWeight: 600, margin: '0 0 2px' }}>
                  {step.label}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.38)', fontSize: '11.5px', margin: 0 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '40px' }}>
          PIPE © 2026 · Todos los derechos reservados
        </p>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px',
        background: 'var(--color-bg)',
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo mobile */}
          <div className="flex lg:hidden" style={{
            alignItems: 'center', gap: '10px', marginBottom: '36px', justifyContent: 'center',
          }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '9px',
              background: 'linear-gradient(135deg, #00D084, #00a86b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
                <rect x="1"  y="10" width="3" height="7" rx="1" fill="white" fillOpacity="0.9"/>
                <rect x="6"  y="6"  width="3" height="11" rx="1" fill="white"/>
                <rect x="11" y="2"  width="3" height="15" rx="1" fill="white" fillOpacity="0.7"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: '17px' }} className="text-[var(--color-tx-primary)]">
              PIPE
            </span>
          </div>

          {/* Encabezado */}
          <div style={{ marginBottom: '32px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}
                className="text-[var(--color-tx-primary)]">
              Bienvenido de nuevo
            </h1>
            <p style={{ fontSize: '13px', margin: 0, color: '#6b7280' }}>
              Ingresa tus credenciales para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={onSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email */}
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: '#6b7280', marginBottom: '6px', letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}>
                Correo electronico
              </label>
              <input
                type="email"
                placeholder="tu@empresa.com"
                autoComplete="email"
                autoFocus
                {...register('email')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 13px', borderRadius: '8px', fontSize: '14px',
                  border: errors.email ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-tx-primary)',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#00D084'; }}
                onBlur={e => { e.target.style.borderColor = errors.email ? '#ef4444' : 'var(--color-border)'; }}
              />
              {errors.email && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label style={{
                display: 'block', fontSize: '12px', fontWeight: 600,
                color: '#6b7280', marginBottom: '6px', letterSpacing: '0.4px',
                textTransform: 'uppercase',
              }}>
                Contrasena
              </label>
              <input
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register('password')}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '9px 13px', borderRadius: '8px', fontSize: '14px',
                  border: errors.password ? '1.5px solid #ef4444' : '1.5px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-tx-primary)',
                  outline: 'none', transition: 'border-color 0.15s',
                }}
                onFocus={e => { e.target.style.borderColor = '#00D084'; }}
                onBlur={e => { e.target.style.borderColor = errors.password ? '#ef4444' : 'var(--color-border)'; }}
              />
              {errors.password && (
                <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '10px 20px', marginTop: '4px',
                borderRadius: '8px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                background: loading ? '#00a86b' : '#00D084',
                color: '#fff', fontSize: '14px', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'background 0.15s, transform 0.1s',
                opacity: loading ? 0.8 : 1,
              }}
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Ingresando…</>
                : <><span>Ingresar</span><ArrowRight size={15} /></>
              }
            </button>
          </form>

          {/* Dev creds */}
          <div style={{
            marginTop: '28px', paddingTop: '20px',
            borderTop: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
          }}>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Demo
              </p>
              <p style={{ fontSize: '11px', fontFamily: 'monospace', color: '#9ca3af', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {DEV_CREDS.email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => { setValue('email', DEV_CREDS.email); setValue('password', DEV_CREDS.password); }}
              style={{
                padding: '6px 14px', borderRadius: '6px', border: '1.5px solid var(--color-border)',
                background: 'transparent', color: '#6b7280', fontSize: '12px', fontWeight: 500,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >
              Usar demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
