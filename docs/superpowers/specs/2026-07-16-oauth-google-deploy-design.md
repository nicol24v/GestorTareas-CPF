# OAuth con Google + Deploy (diseño)

Fecha: 2026-07-16

## Contexto

Cuarta fase del proyecto Gestor de Tareas. El backend (CRUD Mongoose + auth JWT completa) y el
frontend (login/registro/dashboard/calendario/perfil) ya están implementados y verificados. Este
documento cubre lo que falta de la consigna: **login con Google (OAuth)** y **despliegue** del
proyecto (frontend en Vercel, backend en Render).

## Decisiones de alcance

- **Vinculación de cuentas:** si un usuario inicia sesión con Google y su email ya existe como
  cuenta registrada con password, se **vincula automáticamente** (se le agrega `googleId` a esa
  cuenta existente); no se crea una cuenta duplicada ni se rechaza el login.
- **Flujo OAuth:** redirect clásico de Passport (`passport-google-oauth20`), no Google Identity
  Services / popup. Es el paquete que pide literalmente la consigna y el más simple de documentar.
- **Sin sesiones de servidor:** Passport se usa con `session: false` — el resultado sigue siendo un
  JWT stateless, igual que login/register normales. No se agrega `express-session`.
- **Deploy:** backend en **Render** (Web Service, Root Directory `server`), frontend en **Vercel**
  (Root Directory `client`) — se sigue la consigna al pie de la letra en vez de unificar todo en
  Render, aunque el repo es uno solo (monorepo) y ambas plataformas soportan apuntar a un
  subdirectorio sin necesidad de separar repositorios.
- **Orden de trabajo:** primero se implementa y prueba OAuth en local, después se actualiza el
  README, y al final se ejecuta el deploy real (Render → Vercel → ajustar `CLIENT_ORIGIN` en Render
  → ajustar redirect URI en Google Console).

## Backend: Google OAuth

### Modelo `User`

Se agrega:

```js
googleId: { type: String, unique: true, sparse: true }
```

`password` deja de ser `required: true` fijo y pasa a:

```js
password: {
  type: String,
  required: function () { return !this.googleId; },
  minlength: 6,
  select: false,
}
```

Esto permite usuarios creados solo vía Google, sin password.

### Estrategia Passport (`server/src/config/passport.js`, nuevo)

```js
passport.use(new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
  },
  async (accessToken, refreshToken, profile, done) => {
    // 1. Busca por googleId
    // 2. Si no existe, busca por email (profile.emails[0].value)
    //    - Si existe: agrega googleId a ese usuario y lo guarda (vinculación automática)
    //    - Si no existe: crea un usuario nuevo con name/email/googleId, sin password
    // 3. done(null, user)
  }
));
```

Sin `serializeUser`/`deserializeUser` (no hay sesión de servidor que mantener).

### Rutas nuevas (`authRoutes.js`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/auth/google` | Inicia el flujo (`passport.authenticate('google', { scope: ['profile', 'email'], session: false })`) |
| GET | `/api/auth/google/callback` | Callback de Google (`session: false`); genera JWT con el `signToken()` ya existente en `authController.js` y redirige a `${CLIENT_ORIGIN}/oauth-success?token=<jwt>` |

### `app.js`

- `app.use(passport.initialize())`.
- **Fix necesario:** el CORS actual (`LOCALHOST_ORIGIN` regex hardcodeada) solo permite localhost.
  Se amplía para aceptar también `process.env.CLIENT_ORIGIN` (la URL de Vercel en producción); si
  no, el frontend desplegado no podrá llamar a la API desplegada.

### Variables nuevas (`server/.env.example`)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

## Frontend

### Botón de login

En `LoginPage` y `RegisterPage`, un botón "Iniciar sesión con Google" que hace:

```js
window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
```

### `OAuthSuccessPage.jsx` (nueva, ruta pública `/oauth-success`)

- Lee `token` de `useSearchParams()`.
- Llama a un método nuevo `loginWithToken(token)` en `AuthContext`: guarda el token
  (`setAuthToken` + `localStorage`), pide `fetchMe()`, y hace `persistSession({ token, user })`.
- Si no hay token en la URL o falla `fetchMe()`, redirige a `/login`.
- Si tiene éxito, redirige a `/`.

`App.jsx` gana una ruta pública más:

```jsx
<Route path="/oauth-success" element={<OAuthSuccessPage />} />
```

## Deploy

### Backend en Render

- **Root Directory:** `server`
- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:** `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (URL de
  Vercel), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  (`https://<servicio>.onrender.com/api/auth/google/callback`). `PORT` no se configura manualmente
  — Render la inyecta y `server.js` ya usa `process.env.PORT`.

### Frontend en Vercel

- **Root Directory:** `client`
- Framework autodetectado (Vite): Build `npm run build`, Output `dist`.
- **`client/vercel.json`** (nuevo) con rewrite para que las rutas de `react-router-dom`
  (`/calendar`, `/profile`, etc.) no den 404 al refrescar:

  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

- **Environment Variable:** `VITE_API_URL` = URL pública del backend en Render + `/api`.

### Google Cloud Console (guía en el README)

- Crear proyecto → pantalla de consentimiento OAuth (External, modo Testing) → Credenciales →
  OAuth Client ID tipo "Web application".
- **Authorized redirect URIs:** ambas a la vez —
  `http://localhost:5000/api/auth/google/callback` (dev) y la URL de producción en Render.

### Secuencia de deploy

1. Crear Web Service en Render con las 4 variables ya existentes + las 3 de Google (una vez
   creadas las credenciales) → tomar la URL pública del backend.
2. Crear proyecto en Vercel con `VITE_API_URL` apuntando a esa URL de Render → tomar la URL pública
   del frontend.
3. Volver a Render y actualizar `CLIENT_ORIGIN` con la URL final de Vercel.
4. Volver a Google Cloud Console y agregar el redirect URI de producción.

## Cobertura de la consigna

- **Sesión 3 completa:** `passport` + `passport-google-oauth20`, login con Gmail probado end to
  end, deploy de frontend en Vercel y backend en Render.
- **README actualizado** con instrucciones de Google Console, variables nuevas de entorno, y pasos
  de deploy — cumple el entregable de documentación de instalación/ejecución.

## Fuera de alcance de este documento

- Login con otros proveedores OAuth (Facebook, GitHub, etc.) — no pedido por la consigna.
- Desvincular una cuenta de Google ya vinculada — no pedido; una vez vinculada, se mantiene.
- CI/CD (deploy automático en cada push más allá del auto-deploy nativo de Render/Vercel al
  detectar push a la rama conectada) — no pedido por la consigna.
