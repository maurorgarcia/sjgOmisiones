# SJG Omisiones

Sistema de gestión de omisiones y errores de carga de fichaje para RRHH. Permite cargar errores manualmente, filtrar por estado/motivo/fecha, exportar a Excel y enviar reportes por correo.

## Requisitos

- Node.js 18+
- Cuenta Supabase (base de datos)
- Servidor SMTP para envío de correos

## Instalación

```bash
npm install
```

Crear archivo `.env.local` en la raíz (ver variables en `.env.example`).

## Variables de entorno

| Variable | Descripción |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (pública) de Supabase |
| `NEXTAUTH_SECRET` | Secreto para sesiones NextAuth (generar con `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | URL de la app (ej. `http://localhost:3000` en dev) |
| `SMTP_HOST` | Servidor SMTP |
| `SMTP_PORT` | Puerto (ej. 587) |
| `SMTP_USER` / `SMTP_PASS` | Credenciales SMTP |
| `SMTP_FROM` | Remitente del correo (opcional) |
| `CORREOS_DESTINO` | Destinatarios del reporte (separados por coma) |

## Desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Scripts

- `npm run dev` — Servidor de desarrollo
- `npm run build` — Build para producción
- `npm run start` — Servidor de producción
- `npm run lint` — Linter

## Estructura principal

- `src/app/` — Páginas (dashboard, carga, importar, login) y rutas API
- `src/components/` — Sidebar, Navbar, AppShell
- `src/lib/` — Supabase, Excel, email, constantes
- `src/types/` — Tipos TypeScript compartidos

## Roles

- **admin**: Puede cargar errores, importar empleados, editar/eliminar registros y enviar reportes.
- **viewer**: Solo puede ver la bandeja, filtrar, descargar Excel y marcar como resuelto/pendiente.

---

*Desarrollado por GDAI*
