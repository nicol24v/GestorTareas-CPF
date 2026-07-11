# Frontend — Gestor de Tareas (diseño)

Fecha: 2026-07-11

## Contexto

Segunda fase del proyecto académico Gestor de Tareas. El backend (Express + MongoDB + JWT) ya está
implementado y verificado manualmente (ver
`docs/superpowers/specs/2026-07-10-backend-taskmanager-design.md` y su plan de implementación).
Este documento cubre el diseño del **frontend en React**, que el usuario usará como base para
construir después el prototipo en Figma.

Requisito de estilo explícito del usuario: interfaz **moderna, elegante y minimalista**, **intuitiva
y comprensible**, en una paleta de **grises y azules**.

## Decisiones de alcance

- **Build tool:** Vite + React, JavaScript (sin TypeScript, consistente con el backend).
- **Estilos:** Tailwind CSS.
- **Routing:** React Router.
- **Cliente HTTP:** Axios, con instancia única configurada con interceptores.
- **Estado de autenticación:** React Context (`AuthContext`) + hooks, sin librería externa de estado.
- **Almacenamiento del JWT:** `localStorage`.
- **Íconos:** `lucide-react`.
- **Notificaciones:** `react-hot-toast`.
- **Validación de formularios:** manual (sin librería como react-hook-form) — alcanza para los
  campos actuales (título, fecha, enums de estado/prioridad).
- **Sin pantalla ni modal de detalle separado.** Un único `TaskFormModal` sirve para crear y editar;
  al hacer click en una tarea se abre en modo edición mostrando todos sus campos. Cumple el CRUD
  completo sin una pantalla adicional que mantener.
- **Logout solo en cliente:** limpia `AuthContext` + `localStorage` y redirige a `/login`, sin
  llamada al backend (coherente con la decisión ya tomada en el spec del backend).

## Arquitectura y estructura de carpetas

```
client/
├── src/
│   ├── api/                # cliente axios + funciones por recurso (authApi.js, tasksApi.js)
│   ├── context/             # AuthContext.jsx
│   ├── hooks/                # useTasks.js (encapsula fetch/estado de tareas)
│   ├── components/           # Button, Input, Modal, TaskCard, TaskFormModal, Badge, Toast...
│   ├── pages/                  # LoginPage.jsx, RegisterPage.jsx, DashboardPage.jsx
│   ├── routes/                 # ProtectedRoute.jsx
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── .env.example              # VITE_API_URL=http://localhost:5000/api
├── tailwind.config.js
└── package.json
```

**`useTasks.js`** centraliza `fetch`/`create`/`update`/`delete` de tareas y expone
`{ tasks, loading, error, createTask, updateTask, deleteTask, refetch, filters, setFilters }`,
usado tanto por `DashboardPage` como por `TaskFormModal` — evita duplicar la lógica de llamadas a
la API entre ambos.

## Páginas y rutas

| Ruta | Página | Acceso | Contenido |
|---|---|---|---|
| `/login` | `LoginPage` | Pública | Formulario email/password, link a registro |
| `/register` | `RegisterPage` | Pública | Formulario nombre/email/password, link a login |
| `/` | `DashboardPage` | Protegida | Sidebar de filtros (estado/prioridad) + lista de tareas + botón "Nueva tarea" que abre `TaskFormModal` |

Reglas:
- `ProtectedRoute` envuelve `/` — sin token válido en `AuthContext`, redirige a `/login`.
- Un usuario autenticado que visita `/login` o `/register` es redirigido a `/`.
- Al cargar la app, `AuthContext` lee el token de `localStorage` y llama a `GET /api/auth/me` para
  validar que sigue siendo válido antes de considerar al usuario autenticado; si falla, limpia el
  token y redirige a `/login`.
- Logout: botón en el header del dashboard, ver "Decisiones de alcance".

## Sistema visual

**Paleta** (clases de Tailwind, tonos slate + blue):
- Fondo: `slate-50` (general), `white` (tarjetas/paneles)
- Texto: `slate-900` (principal), `slate-500` (secundario/labels)
- Bordes: `slate-200`
- Acento primario: `blue-600` (botones principales, links, foco de inputs), hover `blue-700`
- Sidebar/header: `slate-800`/`slate-900` con texto claro

**Badges de estado:**
- `pendiente` → `slate-100` / `slate-600`
- `en_progreso` → `blue-100` / `blue-700`
- `completada` → `emerald-100` / `emerald-700` (único color fuera de la gama gris/azul, señal clara
  de "listo")

**Badges de prioridad:**
- `baja` → `slate-100` / `slate-500`
- `media` → `amber-100` / `amber-700`
- `alta` → `rose-100` / `rose-700`

**Tipografía:** Inter (Google Fonts), sans-serif.

**Estilo de componentes:** esquinas redondeadas (`rounded-lg`/`rounded-xl`), sombras suaves
(`shadow-sm`), espaciado generoso, botones sólidos azules para acciones primarias y outline gris
para secundarias/cancelar.

## Consumo de API, estados y feedback

**`api/client.js`:** instancia de Axios con `baseURL: import.meta.env.VITE_API_URL`.
- Interceptor de request: agrega `Authorization: Bearer <token>` desde `AuthContext`/`localStorage`.
- Interceptor de response: ante un `401`, limpia la sesión y redirige a `/login`.

**Estados en `DashboardPage`:** tres estados explícitos sobre `useTasks`.
- **loading:** `true` mientras se resuelve el `GET /api/tasks` inicial o un refetch por cambio de
  filtro — se muestra un skeleton/spinner.
- **error:** mensaje legible si la petición falla (ej. "No se pudieron cargar las tareas") — se
  muestra el mensaje con un botón "Reintentar".
- **data:** lista de tareas, o un estado vacío tipo "No tienes tareas todavía — crea la primera" si
  `tasks.length === 0`.

**Feedback con `react-hot-toast`:**
- Éxito: "Tarea creada", "Tarea actualizada", "Tarea eliminada", "Sesión iniciada".
- Error: mensaje de `error.response.data.message` devuelto por el backend (ej. "Invalid
  credentials", "email already in use"), o uno genérico ante fallas de red.

**Formularios controlados** (`LoginPage`, `RegisterPage`, `TaskFormModal`): estado local por input
vía `useState`, validación manual al submit, mensaje de error debajo de cada campo inválido.

## Fuera de alcance de este documento

- El diseño en Figma — lo hará el usuario manualmente, tomando como base esta implementación en
  React.
- Tests automatizados — mismo criterio que el backend: no están pedidos por la consigna.
