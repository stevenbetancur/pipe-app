# PIPE — Frontend

> Aplicación web para la gestión industrial integrada del proceso de café: desde el registro del pedido hasta la entrega al cliente.

---

## Stack tecnológico

| Tecnología | Versión | Rol |
|---|---|---|
| [React](https://react.dev) | 19.2 | UI library |
| [Vite](https://vitejs.dev) | 7.3 | Build tool / dev server |
| [TypeScript](https://typescriptlang.org) | 5.9 | Tipado estático |
| [Tailwind CSS](https://tailwindcss.com) | 4.2 | Estilos utilitarios |
| [React Router](https://reactrouter.com) | 7.13 | Enrutamiento SPA |
| [TanStack Query](https://tanstack.com/query) | 5.90 | Server state / caché de datos |
| [Zustand](https://zustand-demo.pmnd.rs) | 5.0 | Estado global (auth, tema) |
| [React Hook Form](https://react-hook-form.com) | 7.71 | Manejo de formularios |
| [Zod](https://zod.dev) | 4.3 | Validación de esquemas |
| [Axios](https://axios-http.com) | 1.13 | Cliente HTTP |
| [Radix UI](https://www.radix-ui.com) | ≥1.x | Componentes accesibles |
| [Framer Motion](https://www.framer.com/motion) | 12.34 | Animaciones |
| [Lucide React](https://lucide.dev) | 0.575 | Iconos |

---

## Estructura del proyecto

```
pipe-app/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/          # ProtectedRoute
│   │   ├── layout/        # AppShell, Sidebar, Topbar
│   │   └── ui/            # Modal, FormField, KpiCard, StatusBadge...
│   ├── lib/               # http.ts (Axios), cn.ts, toast.ts
│   ├── pages/             # Una página por módulo del pipeline
│   ├── services/          # Capa de acceso a la API REST
│   ├── store/             # auth.store.ts, theme.store.ts (Zustand)
│   ├── types/             # Tipos e interfaces compartidos
│   ├── App.tsx            # Definición de rutas
│   └── index.css          # Tokens de diseño y clases Tailwind
├── .env
├── vite.config.ts
└── tsconfig.json
```

---

## Prerequisitos

- **Node.js** ≥ 20
- **npm** ≥ 10
- Backend **pipe-back** corriendo en `http://localhost:4000`

---

## Configuración local

```bash
# 1. Clonar el repositorio
git clone https://github.com/stevenbetancur/pipe-web.git
cd pipe-web

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env
# Editar .env:
#   VITE_API_URL=http://localhost:4000

# 4. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:5173
```

---

## Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compilación de producción (`dist/`) |
| `npm run preview` | Previsualizar el build de producción |
| `npm run lint` | Análisis estático con ESLint |

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_API_URL` | URL base del backend | `http://localhost:4000` |

---

## Módulos de la aplicación

| Ruta | Módulo | Descripción |
|---|---|---|
| `/dashboard` | Dashboard | KPIs del pipeline y próximas entregas |
| `/maquilas` | Maquilas | Registro y control de pedidos en maquila |
| `/tostion` | Tostión | Proceso de tostión y merma |
| `/produccion` | Producción | Empaque, presentación y salida |
| `/facturacion` | Facturación | Generación y gestión de facturas |
| `/clientes` | Clientes | CRUD de clientes |
| `/usuarios` | Usuarios | Gestión de usuarios y roles |
| `/horarios` | Horarios | Configuración de turnos |
| `/maquinas` | Máquinas | Inventario de maquinaria |

**Roles disponibles:** `admin` · `operario` · `facturacion`

---

## Deploy en producción

### Build estático (Nginx / Apache)

```bash
npm run build
# Archivos generados en dist/
```

Configurar Nginx para SPA:

```nginx
server {
    listen 80;
    root /var/www/pipe-web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000/;
    }
}
```

### Variables de entorno en producción

Editar `.env` antes del build o pasar las variables al pipeline de CI/CD:

```bash
VITE_API_URL=https://api.tudominio.com
```

> `VITE_*` se embebe en el bundle en tiempo de build — no incluir secretos.

---

## Credenciales demo

| Campo | Valor |
|---|---|
| Email | `admin@pipe.local` |
| Contraseña | `Admin123*` |

---

## Licencia

Propiedad de **PIPE** © 2026. Todos los derechos reservados.


This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
