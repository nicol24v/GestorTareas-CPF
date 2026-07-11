# Frontend — Gestor de Tareas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a modern, elegant, minimalist React frontend (gray/blue palette) that consumes the already-implemented backend API, per `docs/superpowers/specs/2026-07-11-frontend-taskmanager-design.md`.

**Architecture:** Vite + React SPA. Three pages (`LoginPage`, `RegisterPage`, `DashboardPage`) behind React Router, a single `AuthContext` for session state, a `useTasks` hook centralizing task data/API calls, and a single `TaskFormModal` handling create/edit/view of a task (no separate detail screen).

**Tech Stack:** Vite, React 18, React Router, Axios, Tailwind CSS, `react-hot-toast`, `lucide-react`.

## Global Constraints

- JavaScript only, no TypeScript.
- Tailwind palette: slate (neutrals) + blue (primary accent); status/priority badges per spec (see Task 9).
- JWT stored in `localStorage`; Axios interceptor attaches it to every request and clears session + redirects to `/login` on a `401`.
- Form validation is manual (no react-hook-form or similar).
- No separate task-detail view — `TaskFormModal` covers create, edit, and viewing a task's fields.
- Logout is client-side only (clears context + `localStorage`, no backend call).
- `client/.env` holds `VITE_API_URL` and is gitignored; `.env.example` documents it.
- **No automated test framework** (same explicit decision as the backend). Verification per task is `npm run build` (catches syntax/import/resolution errors) plus, where noted, a `curl` against the running dev server. There is no browser-automation tool available in this environment, so the final task ends with an explicit manual browser checklist for the user to run themselves — this replaces an end-to-end automated test.
- Every `git commit` message must be written in Spanish, and must NOT include a `Co-Authored-By: Claude` (or any Claude/Anthropic) trailer.
- All work happens on the `feature/frontend` branch (already created).

---

### Task 1: Project scaffolding, Tailwind, and app shell

**Files:**
- Create: `client/package.json`
- Create: `client/vite.config.js`
- Create: `client/index.html`
- Create: `client/tailwind.config.js`
- Create: `client/postcss.config.js`
- Create: `client/.gitignore`
- Create: `client/.env.example`
- Create: `client/.env` (local only, gitignored)
- Create: `client/src/index.css`
- Create: `client/src/main.jsx`
- Create: `client/src/App.jsx`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: a running Vite dev server serving a placeholder `App` component. `src/main.jsx` mounts `<BrowserRouter>` and `<Toaster>` — every later task's routes/pages render inside this shell. `src/index.css` establishes the Tailwind base (`bg-slate-50 text-slate-900 font-sans` on `body`) that all components build on.

- [ ] **Step 1: Create `client/package.json`**

```json
{
  "name": "gestor-tareas-client",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "axios": "^1.7.4",
    "lucide-react": "^0.446.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-hot-toast": "^2.4.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create `client/vite.config.js`**

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
```

- [ ] **Step 3: Create `client/index.html`**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
      rel="stylesheet"
    />
    <title>Gestor de Tareas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create `client/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 5: Create `client/postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 6: Create `client/.gitignore`**

```
node_modules/
dist/
.env
```

- [ ] **Step 7: Create `client/.env.example`**

```
VITE_API_URL=http://localhost:5000/api
```

- [ ] **Step 8: Create `client/.env`**

```
VITE_API_URL=http://localhost:5000/api
```

This points at the backend built in the previous plan; no secrets involved, so this file can be created directly (still gitignored for consistency with `server/.env`).

- [ ] **Step 9: Create `client/src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-slate-50 text-slate-900 font-sans;
}
```

- [ ] **Step 10: Create `client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 11: Create `client/src/App.jsx`**

```jsx
function App() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <h1 className="text-2xl font-semibold text-slate-900">Gestor de Tareas</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 12: Install dependencies**

Run: `cd client && npm install`
Expected: completes without errors, creates `node_modules/` and `package-lock.json`.

- [ ] **Step 13: Verify the build and dev server**

Run: `cd client && npm run build`
Expected: ends with `✓ built in ...` and no errors, produces `client/dist/`.

Run: `cd client && npm run dev` (background)
Run: `curl -s -m 5 http://localhost:5173/ | head -c 300`
Expected: HTTP 200 with HTML containing `<div id="root"></div>` and the `main.jsx` script tag.
Stop the dev server after verifying.

- [ ] **Step 14: Commit**

```bash
cd client
git add package.json vite.config.js index.html tailwind.config.js postcss.config.js .gitignore .env.example src/index.css src/main.jsx src/App.jsx
git commit -m "chore: iniciar proyecto React con Vite y Tailwind"
```

---

### Task 2: Reusable UI primitives (Button, Input, Badge)

**Files:**
- Create: `client/src/components/Button.jsx`
- Create: `client/src/components/Input.jsx`
- Create: `client/src/components/Badge.jsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `Button` (`{ variant = 'primary' | 'outline', ...props }`), `Input` (`{ label, error, ...props }`), `Badge` (`{ color = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose', children }`). Every later page/component (Tasks 7, 9, 10) uses these instead of raw `<button>`/`<input>` markup.

- [ ] **Step 1: Create `client/src/components/Button.jsx`**

```jsx
const VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:text-slate-300',
};

function Button({ variant = 'primary', className = '', ...props }) {
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export default Button;
```

- [ ] **Step 2: Create `client/src/components/Input.jsx`**

```jsx
function Input({ label, error, id, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-rose-400' : 'border-slate-200'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}

export default Input;
```

- [ ] **Step 3: Create `client/src/components/Badge.jsx`**

```jsx
const COLORS = {
  slate: 'bg-slate-100 text-slate-600',
  blue: 'bg-blue-100 text-blue-700',
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
};

function Badge({ color = 'slate', children }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLORS[color]}`}>
      {children}
    </span>
  );
}

export default Badge;
```

- [ ] **Step 4: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors (these components aren't imported anywhere yet, so this only confirms no syntax errors).

- [ ] **Step 5: Commit**

```bash
cd client
git add src/components/Button.jsx src/components/Input.jsx src/components/Badge.jsx
git commit -m "feat: agregar componentes base Button, Input y Badge"
```

---

### Task 3: Generic Modal component

**Files:**
- Create: `client/src/components/Modal.jsx`

**Interfaces:**
- Consumes: `lucide-react` (`X` icon).
- Produces: `Modal` (`{ open, onClose, title, children }`) — a centered overlay dialog. `TaskFormModal` (Task 9) wraps its form in this.

- [ ] **Step 1: Create `client/src/components/Modal.jsx`**

```jsx
import { X } from 'lucide-react';

function Modal({ open, onClose, title, children }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default Modal;
```

- [ ] **Step 2: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

- [ ] **Step 3: Commit**

```bash
cd client
git add src/components/Modal.jsx
git commit -m "feat: agregar componente Modal reutilizable"
```

---

### Task 4: API client (Axios) and resource functions

**Files:**
- Create: `client/src/api/client.js`
- Create: `client/src/api/authApi.js`
- Create: `client/src/api/tasksApi.js`

**Interfaces:**
- Consumes: `VITE_API_URL` (Task 1).
- Produces: `apiClient` (configured Axios instance, exported default from `client.js`, with a `setAuthToken(token)` helper to set/clear the default `Authorization` header). `authApi.register/login/me`, `tasksApi.list/create/get/update/remove` — all return the Axios response's `data`. `AuthContext` (Task 5) and `useTasks` (Task 8) are the consumers.

- [ ] **Step 1: Create `client/src/api/client.js`**

```js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

export function onUnauthorized(callback) {
  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        callback();
      }
      return Promise.reject(error);
    }
  );
}

export default apiClient;
```

- [ ] **Step 2: Create `client/src/api/authApi.js`**

```js
import apiClient from './client';

export async function register({ name, email, password }) {
  const { data } = await apiClient.post('/auth/register', { name, email, password });
  return data;
}

export async function login({ email, password }) {
  const { data } = await apiClient.post('/auth/login', { email, password });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get('/auth/me');
  return data;
}
```

- [ ] **Step 3: Create `client/src/api/tasksApi.js`**

```js
import apiClient from './client';

export async function listTasks(filters = {}) {
  const { data } = await apiClient.get('/tasks', { params: filters });
  return data.tasks;
}

export async function createTask(payload) {
  const { data } = await apiClient.post('/tasks', payload);
  return data.task;
}

export async function updateTask(id, payload) {
  const { data } = await apiClient.put(`/tasks/${id}`, payload);
  return data.task;
}

export async function deleteTask(id) {
  await apiClient.delete(`/tasks/${id}`);
}
```

- [ ] **Step 4: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

- [ ] **Step 5: Commit**

```bash
cd client
git add src/api/client.js src/api/authApi.js src/api/tasksApi.js
git commit -m "feat: agregar cliente axios y funciones de la API de auth y tareas"
```

---

### Task 5: AuthContext

**Files:**
- Create: `client/src/context/AuthContext.jsx`

**Interfaces:**
- Consumes: `authApi` (Task 4), `setAuthToken`/`onUnauthorized` (Task 4).
- Produces: `AuthProvider` component and `useAuth()` hook returning `{ user, token, initializing, login(email, password), register(name, email, password), logout() }`. `ProtectedRoute` (Task 6) and the page components (Task 7) are the consumers.

- [ ] **Step 1: Create `client/src/context/AuthContext.jsx`**

```jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { login as loginApi, register as registerApi, fetchMe } from '../api/authApi';
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

  function logout() {
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ user, token, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors (not wired into `App.jsx` yet, so this only confirms no syntax errors).

- [ ] **Step 3: Commit**

```bash
cd client
git add src/context/AuthContext.jsx
git commit -m "feat: agregar AuthContext para sesion del usuario"
```

---

### Task 6: Routing skeleton (ProtectedRoute + App.jsx)

**Files:**
- Create: `client/src/routes/ProtectedRoute.jsx`
- Modify: `client/src/App.jsx`
- Modify: `client/src/main.jsx`

**Interfaces:**
- Consumes: `AuthProvider`/`useAuth` (Task 5).
- Produces: working routes `/login`, `/register`, `/` (the last two pages are placeholders until Task 7/10 fill them in). This task's `App.jsx` is the final shape of the routing logic — later tasks only change what each route renders.

- [ ] **Step 1: Create `client/src/routes/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
```

- [ ] **Step 2: Modify `client/src/App.jsx`**

```jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';

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
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
```

This references `LoginPage`, `RegisterPage`, `DashboardPage`, which don't exist yet — they're created as placeholder-free real components in Tasks 7 and 10. Create minimal placeholders now so the build succeeds, to be overwritten by those tasks:

`client/src/pages/LoginPage.jsx`:
```jsx
function LoginPage() {
  return <div className="p-8">Login (pendiente)</div>;
}

export default LoginPage;
```

`client/src/pages/RegisterPage.jsx`:
```jsx
function RegisterPage() {
  return <div className="p-8">Registro (pendiente)</div>;
}

export default RegisterPage;
```

`client/src/pages/DashboardPage.jsx`:
```jsx
function DashboardPage() {
  return <div className="p-8">Dashboard (pendiente)</div>;
}

export default DashboardPage;
```

- [ ] **Step 3: Modify `client/src/main.jsx`**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 4: Verify routing**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

Run: `cd client && npm run dev` (background)
Run: `curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:5173/`
Expected: `200`
Run: `curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:5173/login`
Expected: `200` (Vite serves `index.html` for any path; the app-shell HTML is identical, actual client-side routing is verified visually in Task 11)
Stop the dev server after verifying.

- [ ] **Step 5: Commit**

```bash
cd client
git add src/routes/ProtectedRoute.jsx src/App.jsx src/main.jsx src/pages/LoginPage.jsx src/pages/RegisterPage.jsx src/pages/DashboardPage.jsx
git commit -m "feat: agregar enrutamiento con rutas protegidas y publicas"
```

---

### Task 7: LoginPage and RegisterPage

**Files:**
- Modify: `client/src/pages/LoginPage.jsx`
- Modify: `client/src/pages/RegisterPage.jsx`

**Interfaces:**
- Consumes: `useAuth` (Task 5), `Button`/`Input` (Task 2).
- Produces: fully working login/register forms. No new exports consumed by later tasks — this is a leaf.

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
git commit -m "feat: implementar paginas de login y registro"
```

---

### Task 8: useTasks hook

**Files:**
- Create: `client/src/hooks/useTasks.js`

**Interfaces:**
- Consumes: `tasksApi` (Task 4).
- Produces: `useTasks()` returning `{ tasks, loading, error, filters, setFilters, createTask, updateTask, deleteTask, refetch }`. `DashboardPage` (Task 10) and `TaskFormModal` (Task 9, via props from `DashboardPage`) are the consumers.

- [ ] **Step 1: Create `client/src/hooks/useTasks.js`**

```js
import { useCallback, useEffect, useState } from 'react';
import * as tasksApi from '../api/tasksApi';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '' });

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value)
      );
      const data = await tasksApi.listTasks(activeFilters);
      setTasks(data);
    } catch {
      setError('No se pudieron cargar las tareas');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function createTask(payload) {
    const task = await tasksApi.createTask(payload);
    setTasks((prev) => [task, ...prev]);
    return task;
  }

  async function updateTask(id, payload) {
    const task = await tasksApi.updateTask(id, payload);
    setTasks((prev) => prev.map((t) => (t._id === id ? task : t)));
    return task;
  }

  async function deleteTask(id) {
    await tasksApi.deleteTask(id);
    setTasks((prev) => prev.filter((t) => t._id !== id));
  }

  return {
    tasks,
    loading,
    error,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
}
```

- [ ] **Step 2: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors (not wired into any page yet).

- [ ] **Step 3: Commit**

```bash
cd client
git add src/hooks/useTasks.js
git commit -m "feat: agregar hook useTasks para el estado de tareas"
```

---

### Task 9: TaskCard and TaskFormModal

**Files:**
- Create: `client/src/components/TaskCard.jsx`
- Create: `client/src/components/TaskFormModal.jsx`

**Interfaces:**
- Consumes: `Badge` (Task 2), `Modal`/`Button`/`Input` (Tasks 2–3).
- Produces: `TaskCard` (`{ task, onEdit, onDelete }`) and `TaskFormModal` (`{ open, onClose, onSubmit, initialTask }` — `initialTask` is `null` for create, a task object for edit). `DashboardPage` (Task 10) is the consumer of both.

- [ ] **Step 1: Create `client/src/components/TaskCard.jsx`**

```jsx
import { Pencil, Trash2 } from 'lucide-react';
import Badge from './Badge';

const STATUS_LABELS = { pendiente: 'Pendiente', en_progreso: 'En progreso', completada: 'Completada' };
const STATUS_COLORS = { pendiente: 'slate', en_progreso: 'blue', completada: 'emerald' };
const PRIORITY_LABELS = { baja: 'Baja', media: 'Media', alta: 'Alta' };
const PRIORITY_COLORS = { baja: 'slate', media: 'amber', alta: 'rose' };

function TaskCard({ task, onEdit, onDelete }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium text-slate-900">{task.title}</h3>
        {task.description && <p className="text-sm text-slate-500">{task.description}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={STATUS_COLORS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
          <Badge color={PRIORITY_COLORS[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
          {task.dueDate && (
            <span className="text-xs text-slate-400">
              Vence: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
          aria-label="Editar tarea"
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          onClick={() => onDelete(task)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
          aria-label="Eliminar tarea"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default TaskCard;
```

- [ ] **Step 2: Create `client/src/components/TaskFormModal.jsx`**

```jsx
import { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';

const EMPTY_FORM = { title: '', description: '', status: 'pendiente', priority: 'media', dueDate: '' };

function toFormState(task) {
  if (!task) return EMPTY_FORM;
  return {
    title: task.title || '',
    description: task.description || '',
    status: task.status || 'pendiente',
    priority: task.priority || 'media',
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
  };
}

function validate({ title }) {
  const errors = {};
  if (!title.trim()) errors.title = 'El título es requerido';
  return errors;
}

function TaskFormModal({ open, onClose, onSubmit, initialTask }) {
  const [form, setForm] = useState(toFormState(initialTask));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toFormState(initialTask));
      setErrors({});
    }
  }, [open, initialTask]);

  async function handleSubmit(event) {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const payload = { ...form, dueDate: form.dueDate || undefined };
      await onSubmit(payload);
      onClose();
    } catch {
      // el padre ya muestra un toast de error; el modal permanece abierto para reintentar
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={initialTask ? 'Editar tarea' : 'Nueva tarea'}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="title"
          label="Título"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={errors.title}
        />
        <div className="flex flex-col gap-1">
          <label htmlFor="description" className="text-sm font-medium text-slate-700">
            Descripción
          </label>
          <textarea
            id="description"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-sm font-medium text-slate-700">
              Estado
            </label>
            <select
              id="status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="priority" className="text-sm font-medium text-slate-700">
              Prioridad
            </label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
        <Input
          id="dueDate"
          label="Fecha límite"
          type="date"
          value={form.dueDate}
          onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default TaskFormModal;
```

- [ ] **Step 3: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

- [ ] **Step 4: Commit**

```bash
cd client
git add src/components/TaskCard.jsx src/components/TaskFormModal.jsx
git commit -m "feat: agregar TaskCard y TaskFormModal"
```

---

### Task 10: DashboardPage

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `useAuth` (Task 5), `useTasks` (Task 8), `TaskCard`/`TaskFormModal` (Task 9), `Button` (Task 2).
- Produces: the fully working dashboard — no new exports consumed elsewhere.

- [ ] **Step 1: Modify `client/src/pages/DashboardPage.jsx`**

```jsx
import { useState } from 'react';
import { LogOut, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Button from '../components/Button';

function DashboardPage() {
  const { user, logout } = useAuth();
  const { tasks, loading, error, filters, setFilters, createTask, updateTask, deleteTask, refetch } =
    useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  function openCreateModal() {
    setEditingTask(null);
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingTask(task);
    setModalOpen(true);
  }

  async function handleSubmit(payload) {
    try {
      if (editingTask) {
        await updateTask(editingTask._id, payload);
        toast.success('Tarea actualizada');
      } else {
        await createTask(payload);
        toast.success('Tarea creada');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'No se pudo guardar la tarea');
      throw err;
    }
  }

  async function handleDelete(task) {
    if (!window.confirm(`¿Eliminar la tarea "${task.title}"?`)) return;
    try {
      await deleteTask(task._id);
      toast.success('Tarea eliminada');
    } catch {
      toast.error('No se pudo eliminar la tarea');
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 bg-slate-900 p-6 text-slate-100 sm:flex">
        <h2 className="text-lg font-semibold">Gestor de Tareas</h2>
        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="mb-1 text-slate-400">Estado</p>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
            >
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En progreso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-slate-400">Prioridad</p>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-slate-100"
            >
              <option value="">Todas</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
            </select>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <span className="text-sm text-slate-500">Hola, {user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-rose-600"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </header>

        <main className="flex-1 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-900">Mis tareas</h1>
            <Button onClick={openCreateModal} className="flex items-center gap-1">
              <Plus size={16} /> Nueva tarea
            </Button>
          </div>

          {loading && <p className="text-slate-400">Cargando tareas...</p>}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}{' '}
              <button type="button" onClick={refetch} className="font-medium underline">
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && tasks.length === 0 && (
            <p className="text-slate-400">No tienes tareas todavía — crea la primera.</p>
          )}

          {!loading && !error && tasks.length > 0 && (
            <div className="flex flex-col gap-3">
              {tasks.map((task) => (
                <TaskCard key={task._id} task={task} onEdit={openEditModal} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </main>
      </div>

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        initialTask={editingTask}
      />
    </div>
  );
}

export default DashboardPage;
```

- [ ] **Step 2: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

- [ ] **Step 3: Commit**

```bash
cd client
git add src/pages/DashboardPage.jsx
git commit -m "feat: implementar DashboardPage con filtros, listado y modal de tareas"
```

---

### Task 11: End-to-end manual verification and README update

**Files:**
- Modify: `README.md` (repo root)

**Interfaces:**
- Consumes: the entire app built in Tasks 1–10 and the backend from the previous plan.
- Produces: documented setup instructions for the full stack; this is the final task.

- [ ] **Step 1: Start both servers**

Run (background): `cd server && node server.js`
Expected console: `MongoDB connected` then `Server listening on port 5000`.

Run (background): `cd client && npm run dev`
Expected console: a `Local: http://localhost:5173/` line.

- [ ] **Step 2: Confirm both are reachable**

Run: `curl -s -m 5 http://localhost:5000/api/health`
Expected: `{"success":true,"message":"API is running"}`

Run: `curl -s -o /dev/null -w "%{http_code}" -m 5 http://localhost:5173/`
Expected: `200`

- [ ] **Step 3: Manual browser walkthrough**

There is no browser-automation tool in this environment, so this step must be performed by opening `http://localhost:5173` in an actual browser (the user, or the `/run` skill if it can drive one). Walk through, in order:

1. Visit `/` while logged out → redirected to `/login`.
2. Go to `/register`, submit with a new email → toast "Cuenta creada", redirected to `/` (dashboard), header shows your name.
3. Click "Nueva tarea", submit with an empty title → inline error "El título es requerido", modal stays open.
4. Fill in a title, submit → toast "Tarea creada", modal closes, task appears in the list with `Pendiente`/`Media` badges.
5. Click the edit icon on the task, change status to "Completada", submit → toast "Tarea actualizada", badge updates to green "Completada".
6. Use the sidebar status filter to select "Completada" → only that task shows; switch back to "Todos" → it reappears.
7. Click the delete icon → confirm dialog → toast "Tarea eliminada", task disappears.
8. Click "Cerrar sesión" → redirected to `/login`, and visiting `/` directly redirects back to `/login` (session cleared).
9. Log back in with the same credentials → lands on `/` with the (now empty) task list, confirming the token round-trips through `localStorage` and `GET /api/auth/me`.

If any step doesn't match, note which one and stop — that's a real bug to fix before this task is considered done, not a plan issue.

- [ ] **Step 4: Stop both servers**

Stop the `client` dev server and the `server` process started in Step 1.

- [ ] **Step 5: Update `README.md`**

Add a "Frontend" section (after the existing "Backend — cómo correrlo" section, before "Postman"):

```markdown
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
| `/` | Dashboard: filtros por estado/prioridad, listado de tareas, crear/editar tareas en un modal |
```

Also update the top-of-file description to remove the "(se documentará por separado...)" note about the frontend, since it's now implemented.

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: documentar como correr el frontend"
```
