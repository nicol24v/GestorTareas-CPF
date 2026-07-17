# Gestor de Tareas

Sistema web de gestión de tareas — proyecto académico. Backend REST API con Node.js, Express,
MongoDB y autenticación JWT, y frontend en React con Vite y Tailwind CSS.

## Estructura

- `server/` — API REST (Express + MongoDB + JWT)
- `client/` — Frontend React (Vite + Tailwind)
- `docs/superpowers/specs/` — documentos de diseño
- `docs/superpowers/plans/` — planes de implementación

## Backend — cómo correrlo

1. `cd server`
2. `npm install`
3. Copiar `.env.example` a `.env` y completar `MONGO_URI` (tu cluster de MongoDB Atlas) y `JWT_SECRET`.
4. `npm start` (o `npm run dev` para reinicio automático al guardar cambios)
5. La API queda disponible en `http://localhost:5000/api`

### Datos de ejemplo (seed)

`npm run seed` crea (o recrea) un usuario de demostración con tareas de ejemplo, sin tocar otras
cuentas ya existentes en la base de datos:

- Usuario: `demo@gestortareas.com` / `demo123456`
- 8 tareas de ejemplo repartidas entre los tres estados y las tres prioridades

### Login con Google (OAuth)

1. En [Google Cloud Console](https://console.cloud.google.com/), crear un proyecto y configurar
   la pantalla de consentimiento OAuth (External, modo Testing alcanza — agregar tu cuenta de
   Gmail como "Test user").
2. Crear una credencial OAuth Client ID de tipo "Web application", agregando como
   "Authorized redirect URI": `http://localhost:5000/api/auth/google/callback` (y la URL de
   producción una vez desplegado, ver sección de Despliegue).
3. Completar en `server/.env`: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
4. Si el email de la cuenta de Google coincide con una cuenta ya registrada por password, se
   vincula automáticamente (no se crea una cuenta duplicada).

## Endpoints

### Auth (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | No | Registra un usuario, devuelve JWT |
| POST | `/login` | No | Inicia sesión, devuelve JWT |
| GET | `/me` | Sí | Devuelve el usuario autenticado |
| PUT | `/me` | Sí | Actualiza el nombre del usuario autenticado |
| PUT | `/password` | Sí | Cambia la contraseña (requiere `currentPassword` y `newPassword`) |
| GET | `/google` | No | Inicia el login con Google (redirige a Google) |
| GET | `/google/callback` | No | Callback de Google; genera JWT y redirige al frontend a `/oauth-success?token=...` |

### Tasks (`/api/tasks`) — todas requieren `Authorization: Bearer <token>`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista las tareas del usuario (filtros opcionales `?status=` y `?priority=`) |
| POST | `/` | Crea una tarea |
| GET | `/:id` | Obtiene una tarea propia |
| PUT | `/:id` | Actualiza una tarea propia |
| DELETE | `/:id` | Elimina una tarea propia |

## Frontend — cómo correrlo

1. `cd client`
2. `npm install`
3. Copiar `.env.example` a `.env` (por defecto ya apunta a `http://localhost:5000/api`).
4. `npm run dev`
5. Abrir `http://localhost:5173` (requiere que el backend también esté corriendo)

### Páginas

| Ruta | Descripción |
|---|---|
| `/login` | Inicio de sesión |
| `/register` | Registro de usuario |
| `/` | Dashboard: contadores y gráfica de distribución por estado, filtros por estado/prioridad, listado de tareas, crear/editar tareas en un modal |
| `/calendar` | Vista mensual de tareas por fecha límite; click en un día abre sus tareas para editarlas |
| `/profile` | Editar nombre y cambiar contraseña |
| `/oauth-success` | Recibe el token tras el login con Google y termina de iniciar sesión (no se navega manualmente) |

## Postman

Importar `server/postman/GestorTareas.postman_collection.json` en Postman. Ejecutar primero
"Login" (o "Register") para que el token se guarde automáticamente en la variable de colección
`token`; el resto de los requests lo usan automáticamente.

## Autenticación

- El logout es solo del lado del cliente: se descarta el token guardado, no hay endpoint de
  servidor para esto.
- El token JWT expira a las 24 horas.

## Despliegue

### Backend en Render

1. Dashboard de Render → "New +" → "Web Service" → conectar el repo de GitHub.
2. **Root Directory:** `server`
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. Environment Variables: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (se completa
   en el paso 3 de abajo, después de desplegar el frontend), `GOOGLE_CLIENT_ID`,
   `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (`https://<tu-servicio>.onrender.com/api/auth/google/callback`).
   `PORT` no se configura — Render la inyecta automáticamente.

### Frontend en Vercel

1. Dashboard de Vercel → "Add New" → "Project" → importar el mismo repo de GitHub.
2. **Root Directory:** `client` (Vercel autodetecta Vite: build `npm run build`, output `dist`).
3. Environment Variable: `VITE_API_URL` = URL pública del backend en Render + `/api`
   (ej. `https://gestor-tareas-api.onrender.com/api`).

### Pasos finales (después de tener ambas URLs públicas)

1. En Render, actualizar `CLIENT_ORIGIN` con la URL final de Vercel (ej.
   `https://gestor-tareas.vercel.app`) — necesario para que el CORS del backend acepte al
   frontend desplegado.
2. En Google Cloud Console → Credentials → tu OAuth Client ID, agregar a "Authorized redirect
   URIs" la URL de producción: `https://<tu-servicio>.onrender.com/api/auth/google/callback`.
