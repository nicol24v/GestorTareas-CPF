# Gestor de Tareas

Sistema web de gestión de tareas — proyecto académico. Backend REST API con Node.js, Express,
MongoDB y autenticación JWT. (El frontend en React se documentará por separado cuando se implemente.)

## Estructura

- `server/` — API REST (Express + MongoDB + JWT)
- `client/` — Frontend React (próxima fase)
- `docs/superpowers/specs/` — documentos de diseño
- `docs/superpowers/plans/` — planes de implementación

## Backend — cómo correrlo

1. `cd server`
2. `npm install`
3. Copiar `.env.example` a `.env` y completar `MONGO_URI` (tu cluster de MongoDB Atlas) y `JWT_SECRET`.
4. `npm start` (o `npm run dev` para reinicio automático al guardar cambios)
5. La API queda disponible en `http://localhost:5000/api`

## Endpoints

### Auth (`/api/auth`)
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/register` | No | Registra un usuario, devuelve JWT |
| POST | `/login` | No | Inicia sesión, devuelve JWT |
| GET | `/me` | Sí | Devuelve el usuario autenticado |

### Tasks (`/api/tasks`) — todas requieren `Authorization: Bearer <token>`
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/` | Lista las tareas del usuario (filtros opcionales `?status=` y `?priority=`) |
| POST | `/` | Crea una tarea |
| GET | `/:id` | Obtiene una tarea propia |
| PUT | `/:id` | Actualiza una tarea propia |
| DELETE | `/:id` | Elimina una tarea propia |

## Postman

Importar `server/postman/GestorTareas.postman_collection.json` en Postman. Ejecutar primero
"Login" (o "Register") para que el token se guarde automáticamente en la variable de colección
`token`; el resto de los requests lo usan automáticamente.

## Autenticación

- El logout es solo del lado del cliente: se descarta el token guardado, no hay endpoint de
  servidor para esto.
- El token JWT expira a las 24 horas.
