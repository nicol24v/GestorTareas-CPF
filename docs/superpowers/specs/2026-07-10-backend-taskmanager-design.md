# Backend — Gestor de Tareas (diseño)

Fecha: 2026-07-10

## Contexto

Proyecto académico: sistema web completo de gestión de tareas (Task Manager) que debe integrar
React, Node.js + Express, MongoDB, JWT, Postman y Git/GitHub. Este documento cubre el diseño del
**backend** únicamente. El frontend (React) se diseñará en una fase separada, una vez el backend
esté implementado y probado con Postman.

## Decisiones de alcance

- **Repositorio:** monorepo, un solo repo de GitHub con `server/` y `client/` como subcarpetas.
- **Entidades:** `User` (para autenticación) y `Task` (entidad principal del CRUD), con un campo
  extra `priority` en `Task` (baja/media/alta) más allá de lo mínimo pedido por la consigna.
- **Lenguaje:** JavaScript (sin TypeScript), para minimizar configuración dado el plazo académico.
- **Logout:** solo del lado del cliente (el frontend descarta el token guardado). No hay blacklist
  de tokens en el servidor — no lo pide la consigna y añadiría complejidad innecesaria.
- **Validación de entrada:** `express-validator` en todas las rutas que reciben body.
- **Expiración del JWT:** 24 horas.
- **Hash de contraseñas:** `bcryptjs`.

## Arquitectura y estructura de carpetas

```
GestorTareas-CF2/
├── server/
│   ├── src/
│   │   ├── config/          # conexión a MongoDB, variables de entorno
│   │   ├── models/          # User.js, Task.js (Mongoose schemas)
│   │   ├── controllers/     # authController.js, taskController.js
│   │   ├── routes/          # authRoutes.js, taskRoutes.js
│   │   ├── middleware/      # auth.js (verifica JWT), errorHandler.js, validators/
│   │   ├── utils/           # AppError.js, funciones auxiliares
│   │   └── app.js           # configuración de Express (middlewares globales, rutas)
│   ├── server.js            # punto de entrada, arranca el servidor
│   ├── .env.example
│   └── package.json
├── client/                  # (fase siguiente, fuera de alcance de este spec)
└── README.md
```

**Dependencias principales:** `express`, `mongoose`, `jsonwebtoken`, `bcryptjs`,
`express-validator`, `cors`, `dotenv`.

## Modelos de datos (Mongoose)

### User

```js
{
  name: String,       // required
  email: String,      // required, unique, formato de email validado
  password: String,   // required, hasheado con bcrypt antes de guardar, select: false
  timestamps: true
}
```

### Task

```js
{
  title: String,       // required
  description: String,
  status: String,      // enum ["pendiente", "en_progreso", "completada"], default "pendiente"
  priority: String,    // enum ["baja", "media", "alta"], default "media"
  dueDate: Date,
  owner: ObjectId,      // ref: "User", required
  timestamps: true
}
```

Reglas:
- El campo `password` nunca se devuelve en las respuestas de la API (`select: false` en el schema
  y excluido explícitamente en las queries que sí lo necesitan, como login).
- Toda consulta de `Task` se filtra por `owner: req.user.id` — cada usuario solo ve y modifica sus
  propias tareas. Esto también materializa la relación entre las colecciones `users` y `tasks`
  pedida en la consigna.

## API

### Auth (`/api/auth`)

| Método | Ruta        | Descripción                                                        | Auth requerida |
|--------|-------------|---------------------------------------------------------------------|-----------------|
| POST   | `/register` | Crea usuario, hashea password, devuelve JWT                        | No              |
| POST   | `/login`    | Valida credenciales, devuelve JWT                                  | No              |
| GET    | `/me`       | Devuelve el usuario autenticado (usado por el frontend al cargar)  | Sí              |

### Tasks (`/api/tasks`) — todas requieren JWT válido

| Método | Ruta   | Descripción                                                        |
|--------|--------|---------------------------------------------------------------------|
| GET    | `/`    | Lista tareas del usuario autenticado. Filtros opcionales por query string: `status`, `priority` |
| POST   | `/`    | Crea una tarea para el usuario autenticado                         |
| GET    | `/:id` | Obtiene una tarea (404 si no existe, 403 si no pertenece al usuario)|
| PUT    | `/:id` | Actualiza una tarea (mismas reglas de pertenencia)                 |
| DELETE | `/:id` | Elimina una tarea (mismas reglas de pertenencia)                   |

### Middleware de autenticación

Lee el header `Authorization: Bearer <token>`, verifica la firma y expiración con
`jsonwebtoken`. Si falta, es inválido o expiró, responde `401`. Adjunta `req.user = { id, ... }`
para que los controladores lo usen. Los controladores de `Task` comparan `task.owner` con
`req.user.id`; si no coinciden, responden `403`.

### Validación

`express-validator` en cada ruta que recibe body:
- Registro: `name` requerido, `email` con formato válido, `password` mínimo 6 caracteres.
- Login: `email` y `password` requeridos.
- Task (crear/actualizar): `title` requerido, `status` y `priority` deben estar dentro de su enum,
  `dueDate` (si se envía) debe ser una fecha válida.

Los errores de validación responden `400` con el detalle de los campos inválidos.

### Manejo de errores centralizado

Una clase `AppError` (statusCode + message) para errores esperados lanzados manualmente
(ej. "tarea no encontrada", "credenciales inválidas"). Un middleware `errorHandler` al final de la
cadena de Express captura cualquier error — de validación, de verificación JWT, de Mongoose, o un
`AppError` — y responde en un formato consistente:

```json
{ "success": false, "message": "...", "errors": [ "opcional, detalle por campo" ] }
```

## Fuera de alcance de este documento

- Diseño del frontend (React) — se hará en un spec separado una vez el backend esté funcionando y
  probado con Postman.
- Colección de Postman y README — se generan como parte de la implementación/entrega, no requieren
  diseño previo.
- Tests automatizados — no están pedidos por la consigna; la validación de endpoints se hace con
  Postman.
