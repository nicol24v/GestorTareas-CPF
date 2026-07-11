# Perfil y Calendario (diseño)

Fecha: 2026-07-11

## Contexto

Tercera fase del proyecto Gestor de Tareas. El backend y el frontend base (auth, CRUD de tareas,
dashboard con contadores y gráfica) ya están implementados y verificados. Este documento cubre dos
pantallas protegidas nuevas — **Perfil** y **Calendario** — pedidas para reforzar los puntos de la
consigna sobre navegación entre pantallas y para dar más superficie de CRUD/API REST más allá del
dashboard de tareas.

## Decisiones de alcance

- **Perfil edita:** nombre y contraseña. El email no es editable (es el identificador de login; no
  se agrega revalidación de unicidad ni reautenticación extra por email).
- **Cambio de contraseña** requiere `currentPassword` + `newPassword` (verificado contra el hash
  existente antes de permitir el cambio).
- **Navegación:** el sidebar oscuro del dashboard se convierte en la navegación principal de toda
  la zona protegida (Tareas / Calendario / Perfil), usando `NavLink` para resaltar la pantalla
  activa.
- **Filtros de estado/prioridad:** se mueven del sidebar a una barra horizontal encima del listado,
  dentro de la propia pantalla de Tareas — el sidebar queda limpio, solo con navegación.
- **Calendario:** vista mensual, interacción por click-para-ver (no se listan tareas directo en la
  celda). Reutiliza `TaskFormModal` y `useTasks` ya existentes — no se crea un modelo ni estado
  paralelo para tareas.
- **Tareas sin `dueDate`** no aparecen en la grilla del calendario; se muestra una nota aparte con
  el conteo, para no ocultarlas silenciosamente.

## Arquitectura y estructura de carpetas

```
client/src/
├── components/
│   └── ProtectedLayout.jsx   # sidebar (nav: Tareas/Calendario/Perfil) + header + <Outlet/>
├── pages/
│   ├── DashboardPage.jsx      # ya no incluye sidebar/header, solo su contenido + barra de filtros
│   ├── CalendarPage.jsx       # nueva
│   └── ProfilePage.jsx        # nueva
```

`App.jsx` pasa a usar rutas anidadas bajo un único guard:

```jsx
<Route element={<ProtectedRoute><ProtectedLayout /></ProtectedRoute>}>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/calendar" element={<CalendarPage />} />
  <Route path="/profile" element={<ProfilePage />} />
</Route>
```

`ProtectedRoute` no cambia su API (sigue recibiendo `children`); simplemente ahora envuelve a
`ProtectedLayout`, que renderiza `<Outlet />` para la pantalla activa.

## Backend: nuevos endpoints de perfil

Extienden `authController.js` / `authRoutes.js` / `authValidators.js` (mismo patrón que los
endpoints existentes, sin archivos nuevos).

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| PUT | `/api/auth/me` | Sí | Actualiza `name` del usuario autenticado |
| PUT | `/api/auth/password` | Sí | Cambia contraseña: requiere `currentPassword` + `newPassword` |

- `PUT /me`: valida `name` no vacío (`express-validator`), actualiza el documento y devuelve
  `{ success: true, user: { id, name, email } }`.
- `PUT /password`: busca el usuario con `.select('+password')`, verifica `currentPassword` con
  `user.comparePassword()` — si no coincide, `401` con `AppError('Current password is incorrect')`.
  Valida `newPassword` con mínimo 6 caracteres. Si todo pasa, asigna la nueva contraseña y guarda
  (el hook `pre('save')` ya existente la re-hashea); responde
  `{ success: true, message: 'Password updated' }`.

## Frontend

### API

`client/src/api/authApi.js` gana dos funciones:

```js
updateProfile({ name })       // PUT /auth/me
changePassword({ currentPassword, newPassword })  // PUT /auth/password
```

### AuthContext

Gana un método `updateProfile(name)` que llama a la API y actualiza el `user` del contexto (para
que el nombre se refleje en el header/sidebar sin recargar). El cambio de contraseña no pasa por el
contexto — no modifica `user`, así que `ProfilePage` llama a `authApi.changePassword` directamente.

### ProtectedLayout

Sidebar oscuro (mismo estilo que el actual) con `NavLink` a:
- `/` — "Tareas" (ícono lista)
- `/calendar` — "Calendario" (ícono calendario)
- `/profile` — "Perfil" (ícono usuario)

Header blanco arriba (igual al actual): "Hola, {nombre}" + "Cerrar sesión". `<Outlet />` debajo para
la pantalla activa.

### ProfilePage

Dos formularios controlados independientes, validación manual en frontend, mismo patrón visual que
`LoginPage`/`RegisterPage`/`TaskFormModal`:

**Datos personales**
- `name` (editable), `email` (solo lectura, texto gris)
- Validación: `name` no vacío
- Guardar → `AuthContext.updateProfile(name)` → toast "Perfil actualizado"

**Cambiar contraseña**
- `currentPassword`, `newPassword`, `confirmPassword`
- Validación: `newPassword` ≥ 6 caracteres, `confirmPassword === newPassword` (solo cliente)
- Guardar → `authApi.changePassword(...)` → toast de éxito o el mensaje de error del backend (ej.
  "Current password is incorrect"); limpia los tres campos tras éxito

### CalendarPage

- Usa su propia instancia de `useTasks()` y trabaja con `allTasks` (sin filtrar).
- Grilla mensual: cabecera con mes/año + botones "◀" / "Hoy" / "▶"; días del mes anterior/siguiente
  que completan la grilla se muestran atenuados y sin interacción.
- Tareas agrupadas por `dueDate` (`YYYY-MM-DD`) en un `Map` para lookup por celda.
- Celda con tareas: punto azul + conteo. Día de hoy resaltado con borde/fondo azul.
- Click en un día con tareas → `Modal` (reutilizado) listando esas tareas como `TaskCard`
  (reutilizado); "editar" ahí abre `TaskFormModal` (reutilizado, mismo `onSubmit`/`updateTask` del
  hook) encima.
- Debajo de la grilla: nota discreta "`N` tareas sin fecha límite no se muestran aquí" cuando
  `N > 0`.

### DashboardPage (ajuste)

Pierde el `<aside>` (sidebar) y el `<header>` (ahora en `ProtectedLayout`). Gana una barra
horizontal con los selects de Estado/Prioridad (mismas opciones que antes) encima del título "Mis
tareas". Contadores, gráfica de distribución, modal de crear/editar y `useTasks` no cambian.

## Cobertura de la consigna

- **Componentes reutilizables:** `Modal`, `TaskFormModal`, `TaskCard`, `Button`, `Input` se
  reutilizan tal cual en las pantallas nuevas — no se duplican.
- **React Router:** rutas anidadas + `NavLink` para navegación activa entre 3 pantallas protegidas
  reales.
- **Consumo de API REST:** 2 endpoints nuevos consumidos con el mismo patrón (`api/authApi.js` →
  `AuthContext`/página) que los existentes.
- **Manejo de estados:** `AuthContext` ampliado; `useTasks` reutilizado sin duplicar lógica de
  fetch/estado entre Tareas y Calendario.
- **Formularios controlados y validados** (frontend y backend) en ambos formularios de Perfil.

## Fuera de alcance de este documento

- Edición de email — decisión explícita de no incluirla (ver "Decisiones de alcance").
- Recordatorios o notificaciones sobre fechas de vencimiento — no pedido por la consigna.
- Vista semanal/diaria del calendario — solo vista mensual, suficiente para el alcance académico.
