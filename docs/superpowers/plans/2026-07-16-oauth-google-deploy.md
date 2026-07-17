# OAuth con Google + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ Tasks 8 and 9 cannot be dispatched to an isolated subagent.** They require live interaction with external dashboards (Render, Vercel, Google Cloud Console) that only the user can access — a subagent has no browser and no access to the user's cloud accounts. Whoever executes this plan must run Tasks 8-9 inline, asking the user to perform dashboard actions and report back values (URLs, etc.), not via subagent dispatch.

**Goal:** Add Google login (Passport + `passport-google-oauth20`) and deploy the project — backend on Render, frontend on Vercel — per `docs/superpowers/specs/2026-07-16-oauth-google-deploy-design.md`.

**Architecture:** Backend gets a `googleId` field on `User` (password becomes conditionally required), a Passport Google strategy that auto-links by email, and two new stateless (JWT, no server session) routes (`/api/auth/google`, `/api/auth/google/callback`). The callback redirects to a new frontend route `/oauth-success?token=...` that finishes the login through `AuthContext`. Deploy reuses the existing monorepo as-is — Render and Vercel each point at a subdirectory (`server/`, `client/`) of the same repo, no repo split needed.

**Tech Stack:** Same as the rest of the project — Express/Mongoose/JWT on the backend (+ `passport`, `passport-google-oauth20`), React/React Router/Tailwind/`lucide-react`/`react-hot-toast` on the frontend.

## Global Constraints

- No automated test framework (same project-wide decision as prior plans). Verification is `npm run build` (frontend) / `curl` (backend) / a `node -e` script against the real `User` model per task, plus manual browser walkthroughs for anything OAuth- or deploy-related.
- All commits in Spanish, no `Co-Authored-By: Claude` (or similar) trailer.
- Work happens on a new branch `feature/oauth-deploy`, created from the tip of `feature/perfil-calendario` (Task 1, Step 0).
- CORS must accept both `localhost` (dev) and `process.env.CLIENT_ORIGIN` (prod) — this fix is required by the spec and is not present in the current `app.js`.
- Vinculación automática por email: if a Google login's email matches an existing password-based account, attach `googleId` to that existing account — never reject the login or create a duplicate user.
- Deploy follows the exact platform split from the spec: backend → Render, frontend → Vercel (not unified on one platform), per the explicit consigna wording.

---

### Task 1: Backend — `User` model: optional password for Google accounts

**Files:**
- Modify: `server/src/models/User.js`

**Interfaces:**
- Consumes: nothing new.
- Produces: `User` schema gains `googleId` (unique, sparse) and conditionally-required `password`. `comparePassword()` now safely returns `false` for password-less (Google-only) accounts instead of throwing, so `login()` in `authController.js` no longer 500s for them (no change needed in that file — the fix lives entirely in the schema method below). Task 2's Passport strategy relies on `googleId` existing on the schema.

- [ ] **Step 0: Create the branch**

```bash
git checkout -b feature/oauth-deploy
```

- [ ] **Step 1: Modify `server/src/models/User.js`**

```js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    googleId: { type: String, unique: true, sparse: true },
    password: {
      type: String,
      required: function requiredUnlessGoogle() {
        return !this.googleId;
      },
      minlength: 6,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

- [ ] **Step 2: Verify the schema change against the real database**

Run:
```bash
cd server && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const user = await User.create({
    googleId: 'plan-test-google-id-1',
    name: 'Google Test',
    email: 'oauthplantest@example.com',
  });
  console.log('created ok, password field is:', user.password);
  await mongoose.disconnect();
}).catch((err) => { console.error('FAILED:', err.message); process.exit(1); });
"
```
Expected: `created ok, password field is: undefined` (no `ValidationError` about `password` being required).

- [ ] **Step 3: Verify `login()` no longer 500s for a password-less account**

Run (background): `cd server && node server.js`

```bash
curl -s -i -m 5 -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"oauthplantest@example.com","password":"whatever"}'
```
Expected: `401` with `{"success":false,"message":"Invalid credentials"}` — not a `500`.

Stop the server, then clean up the test user:
```bash
cd server && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
mongoose.connect(process.env.MONGO_URI)
  .then(() => User.deleteOne({ email: 'oauthplantest@example.com' }))
  .then(() => mongoose.disconnect());
"
```

- [ ] **Step 4: Commit**

```bash
cd server
git add src/models/User.js
git commit -m "feat: permitir password opcional en User para cuentas de Google"
```

---

### Task 2: Backend — install Passport and register the Google strategy

**Files:**
- Modify: `server/package.json` (via `npm install`)
- Create: `server/src/config/passport.js`
- Modify: `server/.env.example`

**Interfaces:**
- Consumes: `User` model (`googleId`, Task 1).
- Produces: a registered Passport strategy named `'google'` on the shared `passport` singleton. Task 3's routes call `passport.authenticate('google', ...)` by this name.

- [ ] **Step 1: Install dependencies**

```bash
cd server && npm install passport passport-google-oauth20
```

- [ ] **Step 2: Add placeholder Google env vars (real values come in Task 6)**

Append to `server/.env.example`:

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

Copy the same three lines into your local `server/.env`, for now with dummy values so the strategy can be constructed (`OAuth2Strategy` throws at require-time if `clientID`/`clientSecret` are empty):

```
GOOGLE_CLIENT_ID=placeholder-id
GOOGLE_CLIENT_SECRET=placeholder-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

- [ ] **Step 3: Create `server/src/config/passport.js`**

```js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        let user = await User.findOne({ googleId: profile.id });

        if (!user && email) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            await user.save();
          }
        }

        if (!user) {
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email,
          });
        }

        done(null, user);
      } catch (err) {
        done(err);
      }
    }
  )
);

module.exports = passport;
```

- [ ] **Step 4: Verify the strategy registers without throwing**

```bash
cd server && node -e "
require('dotenv').config();
const passport = require('./src/config/passport');
console.log('google strategy registered:', !!passport._strategy('google'));
"
```
Expected: `google strategy registered: true`.

- [ ] **Step 5: Commit**

```bash
cd server
git add package.json package-lock.json src/config/passport.js .env.example
git commit -m "feat: agregar passport y estrategia de Google OAuth"
```

---

### Task 3: Backend — OAuth routes, `app.js` wiring, CORS fix

**Files:**
- Modify: `server/src/controllers/authController.js`
- Modify: `server/src/routes/authRoutes.js`
- Modify: `server/src/app.js`

**Interfaces:**
- Consumes: `passport` strategy `'google'` (Task 2), `signToken()` (already in `authController.js`).
- Produces: `GET /api/auth/google`, `GET /api/auth/google/callback`. The frontend (Task 4/5) redirects the browser to the first and lands on `/oauth-success?token=...` from the second.

- [ ] **Step 1: Modify `server/src/controllers/authController.js`** — add `googleCallback`, export it

```js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
}

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const user = await User.create({ name, email, password });
    const token = signToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid credentials', 401));
    }
    const token = signToken(user._id);
    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!user) return next(new AppError('User not found', 404));
    res.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    if (!user || !(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect', 401));
    }
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  } catch (err) {
    next(err);
  }
}

function googleCallback(req, res) {
  const token = signToken(req.user._id);
  res.redirect(`${process.env.CLIENT_ORIGIN}/oauth-success?token=${token}`);
}

module.exports = { register, login, me, updateProfile, changePassword, googleCallback };
```

- [ ] **Step 2: Modify `server/src/routes/authRoutes.js`**

```js
const express = require('express');
const passport = require('passport');
const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  googleCallback,
} = require('../controllers/authController');
const {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
} = require('../middleware/validators/authValidators');
const handleValidation = require('../middleware/validators/handleValidation');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', registerValidation, handleValidation, register);
router.post('/login', loginValidation, handleValidation, login);
router.get('/me', auth, me);
router.put('/me', auth, updateProfileValidation, handleValidation, updateProfile);
router.put('/password', auth, changePasswordValidation, handleValidation, changePassword);

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

module.exports = router;
```

- [ ] **Step 3: Modify `server/src/app.js`** — register the strategy, init Passport, fix CORS

```js
const express = require('express');
const cors = require('cors');
const passport = require('passport');
require('./config/passport');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

const LOCALHOST_ORIGIN = /^http:\/\/localhost:\d+$/;

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || LOCALHOST_ORIGIN.test(origin) || origin === process.env.CLIENT_ORIGIN) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
  })
);
app.use(express.json());
app.use(passport.initialize());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.use((req, res, next) => {
  next(new AppError(`Route ${req.originalUrl} not found`, 404));
});

app.use(errorHandler);

module.exports = app;
```

- [ ] **Step 4: Verify the route is wired (using the placeholder Google credentials from Task 2)**

Run (background): `cd server && node server.js`
Expected: starts without throwing (no "OAuth2Strategy requires..." error).

```bash
curl -s -i -m 5 http://localhost:5000/api/auth/google | head -20
```
Expected: `HTTP/1.1 302 Found` with a `Location: https://accounts.google.com/...` header (the redirect will fail past this point since the credentials are placeholders — that's expected and fixed for real in Task 6).

Confirm the existing localhost CORS behavior still works (regression check):
```bash
curl -s -i -m 5 -H "Origin: http://localhost:5173" http://localhost:5000/api/health | grep -i "access-control-allow-origin"
```
Expected: `Access-Control-Allow-Origin: http://localhost:5173`.

Stop the server after verifying.

- [ ] **Step 5: Commit**

```bash
cd server
git add src/controllers/authController.js src/routes/authRoutes.js src/app.js
git commit -m "feat: agregar rutas de login con Google y ajustar CORS para produccion"
```

---

### Task 4: Frontend — `AuthContext.loginWithToken` and `/oauth-success` route

**Files:**
- Modify: `client/src/context/AuthContext.jsx`
- Create: `client/src/pages/OAuthSuccessPage.jsx`
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `fetchMe()`, `setAuthToken()` (existing, unchanged).
- Produces: `useAuth().loginWithToken(token)`. Task 5's Google buttons don't call this directly — it's `OAuthSuccessPage` (this task) that does, after the backend redirect lands here.

- [ ] **Step 1: Modify `client/src/context/AuthContext.jsx`** — add `loginWithToken`

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  login as loginApi,
  register as registerApi,
  fetchMe,
  updateProfile as updateProfileApi,
} from '../api/authApi';
import { setAuthToken, onUnauthorized } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [initializing, setInitializing] = useState(true);

  function clearSession() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setAuthToken(null);
  }

  useEffect(() => {
    onUnauthorized(clearSession);
  }, []);

  useEffect(() => {
    async function restoreSession() {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setInitializing(false);
        return;
      }
      setAuthToken(storedToken);
      try {
        const { user: me } = await fetchMe();
        setUser(me);
        setToken(storedToken);
      } catch {
        clearSession();
      } finally {
        setInitializing(false);
      }
    }
    restoreSession();
  }, []);

  function persistSession({ token: newToken, user: newUser }) {
    localStorage.setItem('token', newToken);
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
  }

  async function login(email, password) {
    const data = await loginApi({ email, password });
    persistSession(data);
  }

  async function register(name, email, password) {
    const data = await registerApi({ name, email, password });
    persistSession(data);
  }

  async function loginWithToken(newToken) {
    setAuthToken(newToken);
    const { user: me } = await fetchMe();
    persistSession({ token: newToken, user: me });
  }

  async function updateProfile(name) {
    const { user: updatedUser } = await updateProfileApi({ name });
    setUser(updatedUser);
    return updatedUser;
  }

  function logout() {
    clearSession();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        initializing,
        login,
        register,
        loginWithToken,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Create `client/src/pages/OAuthSuccessPage.jsx`**

```jsx
import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

function OAuthSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;
    ranRef.current = true;

    async function run() {
      const token = searchParams.get('token');
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        await loginWithToken(token);
        toast.success('Sesión iniciada con Google');
        navigate('/', { replace: true });
      } catch {
        toast.error('No se pudo iniciar sesión con Google');
        navigate('/login', { replace: true });
      }
    }
    run();
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="flex min-h-screen items-center justify-center text-slate-400">
      Iniciando sesión...
    </div>
  );
}

export default OAuthSuccessPage;
```

(`ranRef` guards against React 18 `StrictMode` double-invoking the effect in dev, which would otherwise call `loginWithToken` — and the backend redirect it depends on — twice.)

- [ ] **Step 3: Modify `client/src/App.jsx`** — add the `/oauth-success` route

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import ProtectedLayout from './components/ProtectedLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import ProfilePage from './pages/ProfilePage';
import OAuthSuccessPage from './pages/OAuthSuccessPage';

function PublicOnlyRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/oauth-success" element={<OAuthSuccessPage />} />
      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

- [ ] **Step 4: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors. (The route can't be functionally tested yet without a real token — that happens in Task 6.)

- [ ] **Step 5: Commit**

```bash
cd client
git add src/context/AuthContext.jsx src/pages/OAuthSuccessPage.jsx src/App.jsx
git commit -m "feat: agregar loginWithToken y pagina de retorno de OAuth"
```

---

### Task 5: Frontend — "Continuar con Google" buttons

**Files:**
- Modify: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/pages/RegisterPage.jsx`

**Interfaces:**
- Consumes: `import.meta.env.VITE_API_URL` (existing env var, already used by `client/src/api/client.js`).
- Produces: no new exports — both are leaf pages; clicking the button does a full-page redirect to the backend, outside React Router.

- [ ] **Step 1: Modify `client/src/pages/LoginPage.jsx`**

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

function validate({ email, password }) {
  const errors = {};
  if (!email.trim()) errors.email = 'El email es requerido';
  if (!password) errors.password = 'La contraseña es requerida';
  return errors;
}

function redirectToGoogleLogin() {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await login(form.email, form.password);
      toast.success('Sesión iniciada');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo iniciar sesión');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Iniciar sesión</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">O</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={redirectToGoogleLogin}>
          Continuar con Google
        </Button>

        <p className="mt-4 text-center text-sm text-slate-500">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-blue-600 hover:underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
```

- [ ] **Step 2: Modify `client/src/pages/RegisterPage.jsx`**

```jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import Input from '../components/Input';

function validate({ name, email, password }) {
  const errors = {};
  if (!name.trim()) errors.name = 'El nombre es requerido';
  if (!email.trim()) errors.email = 'El email es requerido';
  if (password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres';
  return errors;
}

function redirectToGoogleLogin() {
  window.location.href = `${import.meta.env.VITE_API_URL}/auth/google`;
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Cuenta creada');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo crear la cuenta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-slate-900">Crear cuenta</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={errors.email}
          />
          <Input
            id="password"
            label="Contraseña"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            error={errors.password}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear cuenta'}
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">O</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <Button type="button" variant="outline" className="w-full" onClick={redirectToGoogleLogin}>
          Continuar con Google
        </Button>

        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
```

- [ ] **Step 3: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

- [ ] **Step 4: Commit**

```bash
cd client
git add src/pages/LoginPage.jsx src/pages/RegisterPage.jsx
git commit -m "feat: agregar boton de continuar con Google en login y registro"
```

---

### Task 6: Real Google Cloud Console credentials + local end-to-end test

**Files:**
- Modify: `README.md` (repo root)

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: documented Google Console setup; a verified-working local OAuth flow, including the auto-link-by-email behavior from the spec.

- [ ] **Step 1: Create the Google OAuth credentials**

In the [Google Cloud Console](https://console.cloud.google.com/):
1. Create a new project (or reuse one).
2. "APIs & Services" → "OAuth consent screen" → User type "External" → fill the required fields → publishing status "Testing" is fine for this project → under "Test users", add your own Gmail address (required while in Testing mode, or Google will refuse to let that account complete the flow).
3. "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID" → Application type "Web application".
4. Under "Authorized redirect URIs" add: `http://localhost:5000/api/auth/google/callback`.
5. Copy the generated **Client ID** and **Client secret**.

- [ ] **Step 2: Set the real credentials locally**

In `server/.env`, replace the placeholder values from Task 2 with the real ones:

```
GOOGLE_CLIENT_ID=<tu client id real>
GOOGLE_CLIENT_SECRET=<tu client secret real>
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

- [ ] **Step 3: Manual browser test — new Google account**

Run (background): `cd server && node server.js`
Run (background): `cd client && npm run dev`

Open `http://localhost:5173/login` in a real browser, click "Continuar con Google", and log in with a Gmail account whose email has **never** been registered in this app before.

Expected: redirected back to `http://localhost:5173/` logged in, dashboard shows an empty task list for a brand-new user, and the header shows the Google account's name.

- [ ] **Step 4: Manual browser test — vinculación automática por email**

1. Log out.
2. Register a normal email/password account via `/register` using the **same email** as a Google account you control but haven't used with Google login on this app yet (or delete/reset the `googleId` on an existing test user first — see the cleanup script in Task 1, Step 4, adapted to `updateOne({ email }, { $unset: { googleId: 1 } })` if needed).
3. Log out, then click "Continuar con Google" and log in with that same Gmail account.

Expected: you land on the dashboard as the **same account** (same name, same tasks) you registered in step 2 — not a second, empty account. Confirm directly against the database:

```bash
cd server && node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
mongoose.connect(process.env.MONGO_URI)
  .then(() => User.findOne({ email: '<el email que usaste>' }))
  .then((u) => { console.log('googleId set:', !!u.googleId); return mongoose.disconnect(); });
"
```
Expected: `googleId set: true`.

Stop both servers after verifying.

- [ ] **Step 5: Update `README.md`** — add Google OAuth documentation

Add a new subsection right after the existing "### Datos de ejemplo (seed)" subsection (before "## Endpoints"):

```markdown
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
```

Add these two rows to the existing "### Auth (`/api/auth`)" table:

```markdown
| GET | `/google` | No | Inicia el login con Google (redirige a Google) |
| GET | `/google/callback` | No | Callback de Google; genera JWT y redirige al frontend a `/oauth-success?token=...` |
```

Add this row to the existing "### Páginas" table:

```markdown
| `/oauth-success` | Recibe el token tras el login con Google y termina de iniciar sesión (no se navega manualmente) |
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: documentar login con Google y sus endpoints"
```

---

### Task 7: Deploy prep — `vercel.json` and README deploy section

**Files:**
- Create: `client/vercel.json`
- Modify: `README.md` (repo root)

**Interfaces:**
- Consumes: nothing new.
- Produces: a static rewrite rule Vercel reads at build/serve time (no code consumes this directly); a documented deploy runbook that Tasks 8-9 follow.

- [ ] **Step 1: Create `client/vercel.json`**

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

(Without this, refreshing the browser on a client-side route like `/calendar` or `/profile` on Vercel returns a 404 — Vercel doesn't know about `react-router-dom`'s routes by default.)

- [ ] **Step 2: Update `README.md`** — add a "## Despliegue" section

Add this new section at the end of `README.md`, after the existing "## Autenticación" section:

```markdown
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
```

- [ ] **Step 3: Verify the frontend still builds with the new file present**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors (a `vercel.json` with no matching build-time hook doesn't affect the Vite build).

- [ ] **Step 4: Commit**

```bash
git add client/vercel.json README.md
git commit -m "docs: agregar guia de despliegue y config de rewrites para Vercel"
```

---

### Task 8: Deploy the backend to Render

> **⚠️ Live/manual task — run inline with the user, not via subagent dispatch.** Render's dashboard has no CLI-free non-interactive equivalent for first-time service creation; the user must click through it in their own account.

**Files:** none — this task is operational only.

**Interfaces:**
- Consumes: `server/` as committed through Task 6 (Task 7's changes are frontend/docs-only and don't affect the backend deploy).
- Produces: a public backend URL, needed as `VITE_API_URL` input for Task 9.

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feature/oauth-deploy
```

- [ ] **Step 2: Create the Render Web Service**

Ask the user to, in the Render dashboard: "New +" → "Web Service" → select the `GestorTareas-CPF` repo → branch `feature/oauth-deploy` (or `main`, per the user's call, once this branch is merged) → Root Directory `server` → Build Command `npm install` → Start Command `npm start`.

- [ ] **Step 3: Set environment variables**

Ask the user to add, in the service's "Environment" tab: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN` (temporarily `http://localhost:5173` — updated for real in Task 9), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` (`https://<el-nombre-que-eligio>.onrender.com/api/auth/google/callback` — the exact hostname is only known once Render assigns it, so this may need a second edit after the first deploy).

- [ ] **Step 4: Verify the deployed backend**

Ask the user for the public URL Render assigned (shown at the top of the service dashboard), then run:

```bash
curl -s -m 10 https://<url-que-dio-render>/api/health
```
Expected: `{"success":true,"message":"API is running"}`.

```bash
curl -s -m 10 -X POST https://<url-que-dio-render>/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Deploy Test","email":"deploytest@example.com","password":"secret123"}'
```
Expected: `201` with a `token` and `user` in the response — confirms `MONGO_URI` is correctly wired in production. Ask the user to delete this test user afterward the same way as Task 1's cleanup script, pointed at the production `MONGO_URI` (or just leave it — it's a throwaway account with no real data).

- [ ] **Step 5: Record the URL**

No commit needed for this task — keep the Render URL handy for Task 9.

---

### Task 9: Deploy the frontend to Vercel, finalize CORS and Google redirect URI, production smoke test

> **⚠️ Live/manual task — run inline with the user, not via subagent dispatch.** Same reasoning as Task 8: Vercel project creation and Google Console edits happen in the user's own accounts.

**Files:** none — this task is operational only.

**Interfaces:**
- Consumes: the Render URL from Task 8.
- Produces: a public frontend URL; a fully working production deployment with Google login enabled.

- [ ] **Step 1: Create the Vercel project**

Ask the user to, in the Vercel dashboard: "Add New" → "Project" → import the same repo → Root Directory `client` → confirm the autodetected Vite build settings.

- [ ] **Step 2: Set the frontend environment variable**

Ask the user to add, in the project's Environment Variables: `VITE_API_URL` = `https://<url-que-dio-render>/api` (from Task 8).

Deploy. Ask the user for the public URL Vercel assigned.

- [ ] **Step 3: Update `CLIENT_ORIGIN` on Render**

Ask the user to go back to the Render service's Environment tab and set `CLIENT_ORIGIN` to the Vercel URL from Step 2 (e.g. `https://gestor-tareas.vercel.app`, no trailing slash). Render redeploys automatically on env var change.

- [ ] **Step 4: Update the Google OAuth redirect URI**

Ask the user to go to Google Cloud Console → Credentials → the OAuth Client ID → "Authorized redirect URIs" → add `https://<url-que-dio-render>/api/auth/google/callback` (keep the `localhost` one too — both can coexist).

If `GOOGLE_CALLBACK_URL` on Render was still pointing at `localhost` from Task 8 Step 3 (because the Render hostname wasn't known yet), ask the user to update it now to the real `https://<url-que-dio-render>/api/auth/google/callback` and confirm this matches exactly what was just added to Google Console (Google rejects the callback if these don't match character-for-character).

- [ ] **Step 5: Production smoke test**

```bash
curl -s -m 10 https://<url-que-dio-render>/api/health
curl -s -o /dev/null -w "%{http_code}\n" -m 10 https://<url-que-dio-vercel>/
```
Expected: health JSON `{"success":true,...}`; frontend `200`.

Manual browser walkthrough at the Vercel URL:
1. Register a new account with email/password → lands on the dashboard.
2. Log out, log back in with email/password → works.
3. Log out, click "Continuar con Google", log in with a real Gmail account → redirected back to the Vercel URL's dashboard, logged in (confirms `CLIENT_ORIGIN`, CORS, and the Google redirect URI are all correctly wired end-to-end in production).
4. Refresh the browser while on `/calendar` and on `/profile` → both still render (not a 404) — confirms `client/vercel.json`'s rewrite is working.
5. Create a task, edit it, delete it → confirms the deployed backend and frontend talk to each other correctly, not just auth.

If any step doesn't match, note which one and stop — that's a bug to fix (likely a mismatched URL or a stale env var), not a plan issue.

- [ ] **Step 6: Done**

No further commit needed — this task only touched external dashboard configuration, all of which is already documented in Task 7's README section for future reference.
