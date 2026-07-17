# Perfil y Calendario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two protected screens — Perfil and Calendario — plus the shared navigation layout that makes them reachable, per `docs/superpowers/specs/2026-07-11-perfil-calendario-design.md`.

**Architecture:** Two new backend endpoints (`PUT /api/auth/me`, `PUT /api/auth/password`) reusing the existing auth stack. On the frontend, a `ProtectedLayout` (sidebar nav + header + `<Outlet/>`) replaces the sidebar/header that used to live inside `DashboardPage`, and two new pages (`CalendarPage`, `ProfilePage`) are added as sibling routes. Both new pages reuse existing components (`Modal`, `TaskFormModal`, `TaskCard`, `Button`, `Input`) and the existing `useTasks` hook — no parallel data layer.

**Tech Stack:** Same as the rest of the project — Express/Mongoose/JWT on the backend, React/React Router/Tailwind/`lucide-react`/`react-hot-toast` on the frontend.

## Global Constraints

- No automated test framework (same project-wide decision as prior plans). Verification is `npm run build` (frontend) / `curl` (backend) per task, plus a manual browser checklist in the final task.
- All commits in Spanish, no `Co-Authored-By: Claude` (or similar) trailer.
- Work happens on the already-created `feature/perfil-calendario` branch.
- Email is never editable (see spec's "Decisiones de alcance").
- Reuse existing components/hooks — do not fork `TaskFormModal`, `Modal`, `TaskCard`, or `useTasks`.

---

### Task 1: Backend — profile update and password change endpoints

**Files:**
- Modify: `server/src/middleware/validators/authValidators.js`
- Modify: `server/src/controllers/authController.js`
- Modify: `server/src/routes/authRoutes.js`

**Interfaces:**
- Consumes: `User` model (`comparePassword`, pre-save hash hook — already exist), `AppError`, `handleValidation`, `auth` middleware.
- Produces: `PUT /api/auth/me` → `{ success: true, user: { id, name, email } }`. `PUT /api/auth/password` → `{ success: true, message: 'Password updated' }`. The frontend's `authApi.js` (Task 2) is the consumer.

- [ ] **Step 1: Modify `server/src/middleware/validators/authValidators.js`**

```js
const { body } = require('express-validator');

const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const updateProfileValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
];

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  changePasswordValidation,
};
```

- [ ] **Step 2: Modify `server/src/controllers/authController.js`**

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

module.exports = { register, login, me, updateProfile, changePassword };
```

- [ ] **Step 3: Modify `server/src/routes/authRoutes.js`**

```js
const express = require('express');
const {
  register,
  login,
  me,
  updateProfile,
  changePassword,
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

module.exports = router;
```

- [ ] **Step 4: Verify the new endpoints**

Run: `cd server && node server.js` (background)

Register a throwaway test user and update their profile:
```bash
TOKEN=$(curl -s -m 5 -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Perfil Test","email":"perfiltest@example.com","password":"secret123"}' | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).token))")

curl -s -m 5 -X PUT http://localhost:5000/api/auth/me \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Perfil Actualizado"}'
```
Expected: `200` with `{"success":true,"user":{"id":"...","name":"Perfil Actualizado","email":"perfiltest@example.com"}}`

Wrong current password:
```bash
curl -s -i -m 5 -X PUT http://localhost:5000/api/auth/password \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"currentPassword":"wrongpass","newPassword":"newpass123"}'
```
Expected: `401` with `{"success":false,"message":"Current password is incorrect"}`

Correct current password, then log in with the new one:
```bash
curl -s -m 5 -X PUT http://localhost:5000/api/auth/password \
  -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" \
  -d '{"currentPassword":"secret123","newPassword":"newpass123"}'

curl -s -m 5 -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"perfiltest@example.com","password":"newpass123"}'
```
Expected: the password-change call returns `200` with `{"success":true,"message":"Password updated"}`; the subsequent login returns `200` with a fresh token.

Stop the server after verifying.

- [ ] **Step 5: Commit**

```bash
cd server
git add src/middleware/validators/authValidators.js src/controllers/authController.js src/routes/authRoutes.js
git commit -m "feat: agregar endpoints para actualizar perfil y cambiar contrasena"
```

---

### Task 2: Frontend — authApi and AuthContext additions

**Files:**
- Modify: `client/src/api/authApi.js`
- Modify: `client/src/context/AuthContext.jsx`

**Interfaces:**
- Consumes: `PUT /api/auth/me`, `PUT /api/auth/password` (Task 1).
- Produces: `authApi.updateProfile({ name })`, `authApi.changePassword({ currentPassword, newPassword })`. `AuthContext`'s `useAuth()` gains `updateProfile(name)`, consumed by `ProfilePage` (Task 5).

- [ ] **Step 1: Modify `client/src/api/authApi.js`**

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

export async function updateProfile({ name }) {
  const { data } = await apiClient.put('/auth/me', { name });
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await apiClient.put('/auth/password', { currentPassword, newPassword });
  return data;
}
```

- [ ] **Step 2: Modify `client/src/context/AuthContext.jsx`**

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
      value={{ user, token, initializing, login, register, logout, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 3: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors (not wired into any page yet).

- [ ] **Step 4: Commit**

```bash
cd client
git add src/api/authApi.js src/context/AuthContext.jsx
git commit -m "feat: agregar updateProfile y changePassword al cliente de auth"
```

---

### Task 3: ProtectedLayout, nested routing, and placeholder pages

**Files:**
- Create: `client/src/components/ProtectedLayout.jsx`
- Create: `client/src/pages/CalendarPage.jsx` (placeholder, overwritten in Task 6)
- Create: `client/src/pages/ProfilePage.jsx` (placeholder, overwritten in Task 5)
- Modify: `client/src/App.jsx`

**Interfaces:**
- Consumes: `useAuth` (Task 2 additions don't change this shape), `ProtectedRoute` (unchanged, still takes `children`).
- Produces: `ProtectedLayout` — sidebar nav (`NavLink` to `/`, `/calendar`, `/profile`) + header + `<Outlet/>`. This is the shell every protected page (Tasks 4, 5, 6) now renders inside — none of them render their own sidebar/header anymore.

- [ ] **Step 1: Create `client/src/components/ProtectedLayout.jsx`**

```jsx
import { NavLink, Outlet } from 'react-router-dom';
import { ListTodo, Calendar, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Tareas', icon: ListTodo, end: true },
  { to: '/calendar', label: 'Calendario', icon: Calendar, end: false },
  { to: '/profile', label: 'Perfil', icon: User, end: false },
];

function ProtectedLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-56 shrink-0 flex-col gap-6 bg-slate-900 p-6 text-slate-100 sm:flex">
        <h2 className="text-lg font-semibold">Gestor de Tareas</h2>
        <nav className="flex flex-col gap-1 text-sm">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-lg px-3 py-2 transition-colors ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
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
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default ProtectedLayout;
```

- [ ] **Step 2: Create `client/src/pages/CalendarPage.jsx`**

```jsx
function CalendarPage() {
  return <div>Calendario (pendiente)</div>;
}

export default CalendarPage;
```

- [ ] **Step 3: Create `client/src/pages/ProfilePage.jsx`**

```jsx
function ProfilePage() {
  return <div>Perfil (pendiente)</div>;
}

export default ProfilePage;
```

- [ ] **Step 4: Modify `client/src/App.jsx`**

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

- [ ] **Step 5: Verify routing**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

Run: `cd client && npm run dev` (background)
```bash
curl -s -o /dev/null -w "/: %{http_code}\n" -m 5 http://localhost:5173/
curl -s -o /dev/null -w "/calendar: %{http_code}\n" -m 5 http://localhost:5173/calendar
curl -s -o /dev/null -w "/profile: %{http_code}\n" -m 5 http://localhost:5173/profile
```
Expected: all three print `200` (Vite serves the SPA shell for any path; actual per-route rendering is confirmed visually in Task 7).
Stop the dev server after verifying.

- [ ] **Step 6: Commit**

```bash
cd client
git add src/components/ProtectedLayout.jsx src/pages/CalendarPage.jsx src/pages/ProfilePage.jsx src/App.jsx
git commit -m "feat: agregar ProtectedLayout con navegacion y rutas de calendario y perfil"
```

---

### Task 4: DashboardPage — move sidebar/header into ProtectedLayout, add filter bar

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

**Interfaces:**
- Consumes: `useTasks` (unchanged), `StatCard`/`StatusBarChart`/`TaskCard`/`TaskFormModal`/`Button` (unchanged).
- Produces: no new exports — this is a leaf page rendered inside `ProtectedLayout`'s `<Outlet/>`.

- [ ] **Step 1: Modify `client/src/pages/DashboardPage.jsx`**

```jsx
import { useState } from 'react';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Button from '../components/Button';
import StatCard from '../components/StatCard';
import StatusBarChart from '../components/StatusBarChart';

function DashboardPage() {
  const {
    tasks,
    allTasks,
    loading,
    error,
    filters,
    setFilters,
    createTask,
    updateTask,
    deleteTask,
    refetch,
  } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const stats = {
    total: allTasks.length,
    pendiente: allTasks.filter((t) => t.status === 'pendiente').length,
    en_progreso: allTasks.filter((t) => t.status === 'en_progreso').length,
    completada: allTasks.filter((t) => t.status === 'completada').length,
  };

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
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pendientes" value={stats.pendiente} />
        <StatCard label="En progreso" value={stats.en_progreso} color="blue" />
        <StatCard label="Completadas" value={stats.completada} color="emerald" />
      </div>

      <div className="mb-6">
        <StatusBarChart tasks={allTasks} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Mis tareas</h1>
        <Button onClick={openCreateModal} className="flex items-center gap-1">
          <Plus size={16} /> Nueva tarea
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
        >
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendiente</option>
          <option value="en_progreso">En progreso</option>
          <option value="completada">Completada</option>
        </select>
        <select
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 shadow-sm"
        >
          <option value="">Todas las prioridades</option>
          <option value="baja">Baja</option>
          <option value="media">Media</option>
          <option value="alta">Alta</option>
        </select>
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
git commit -m "refactor: mover sidebar/header a ProtectedLayout y agregar barra de filtros en Tareas"
```

---

### Task 5: ProfilePage

**Files:**
- Modify: `client/src/pages/ProfilePage.jsx`

**Interfaces:**
- Consumes: `useAuth` (`user`, `updateProfile` — Task 2), `changePassword` from `authApi` (Task 2), `Button`/`Input` (existing).
- Produces: no new exports — leaf page.

- [ ] **Step 1: Modify `client/src/pages/ProfilePage.jsx`**

```jsx
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { changePassword as changePasswordApi } from '../api/authApi';
import Button from '../components/Button';
import Input from '../components/Input';

function validateProfile({ name }) {
  const errors = {};
  if (!name.trim()) errors.name = 'El nombre es requerido';
  return errors;
}

function validatePassword({ currentPassword, newPassword, confirmPassword }) {
  const errors = {};
  if (!currentPassword) errors.currentPassword = 'La contraseña actual es requerida';
  if (newPassword.length < 6) {
    errors.newPassword = 'La nueva contraseña debe tener al menos 6 caracteres';
  }
  if (confirmPassword !== newPassword) errors.confirmPassword = 'Las contraseñas no coinciden';
  return errors;
}

function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '' });
  const [profileErrors, setProfileErrors] = useState({});
  const [savingProfile, setSavingProfile] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    const errors = validateProfile(profileForm);
    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingProfile(true);
    try {
      await updateProfile(profileForm.name);
      toast.success('Perfil actualizado');
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    const errors = validatePassword(passwordForm);
    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    try {
      await changePasswordApi({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      toast.success('Contraseña actualizada');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'No se pudo actualizar la contraseña');
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-slate-900">Perfil</h1>

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-slate-700">Datos personales</h2>
        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
          <Input
            id="name"
            label="Nombre"
            value={profileForm.name}
            onChange={(e) => setProfileForm({ name: e.target.value })}
            error={profileErrors.name}
          />
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <span className="text-sm text-slate-500">{user?.email}</span>
          </div>
          <Button type="submit" disabled={savingProfile} className="self-start">
            {savingProfile ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </div>

      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-medium text-slate-700">Cambiar contraseña</h2>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
          <Input
            id="currentPassword"
            label="Contraseña actual"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
            error={passwordErrors.currentPassword}
          />
          <Input
            id="newPassword"
            label="Nueva contraseña"
            type="password"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            error={passwordErrors.newPassword}
          />
          <Input
            id="confirmPassword"
            label="Confirmar nueva contraseña"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
            error={passwordErrors.confirmPassword}
          />
          <Button type="submit" disabled={savingPassword} className="self-start">
            {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
```

- [ ] **Step 2: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors. (Interactive behavior — actually submitting these forms — is verified in Task 7's manual walkthrough, since it requires a real browser and a logged-in session.)

- [ ] **Step 3: Commit**

```bash
cd client
git add src/pages/ProfilePage.jsx
git commit -m "feat: implementar ProfilePage con edicion de nombre y cambio de contrasena"
```

---

### Task 6: CalendarPage

**Files:**
- Modify: `client/src/pages/CalendarPage.jsx`

**Interfaces:**
- Consumes: `useTasks` (own instance, uses `allTasks`/`updateTask`/`deleteTask`), `Modal`/`TaskCard`/`TaskFormModal`/`Button` (existing, unchanged).
- Produces: no new exports — leaf page.

- [ ] **Step 1: Modify `client/src/pages/CalendarPage.jsx`**

```jsx
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTasks } from '../hooks/useTasks';
import Modal from '../components/Modal';
import TaskCard from '../components/TaskCard';
import TaskFormModal from '../components/TaskFormModal';
import Button from '../components/Button';

const WEEKDAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateKey(key) {
  if (!key) return '';
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function buildMonthGrid(year, month) {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  const days = [];
  for (let i = 0; i < 42; i += 1) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

function CalendarPage() {
  const { allTasks, updateTask, deleteTask } = useTasks();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const tasksByDate = useMemo(() => {
    const map = new Map();
    allTasks.forEach((task) => {
      if (!task.dueDate) return;
      const key = task.dueDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(task);
    });
    return map;
  }, [allTasks]);

  const undated = allTasks.filter((task) => !task.dueDate).length;
  const days = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const todayKey = toDateKey(new Date());

  function goToPrevMonth() {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goToNextMonth() {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }

  function goToToday() {
    const now = new Date();
    setCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  }

  function openEdit(task) {
    setSelectedDateKey(null);
    setEditingTask(task);
    setFormOpen(true);
  }

  async function handleEditSubmit(payload) {
    try {
      await updateTask(editingTask._id, payload);
      toast.success('Tarea actualizada');
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

  const selectedTasks = selectedDateKey ? tasksByDate.get(selectedDateKey) || [] : [];
  const monthLabel = cursor.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold capitalize text-slate-900">{monthLabel}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={goToPrevMonth} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </Button>
          <Button variant="outline" onClick={goToToday}>
            Hoy
          </Button>
          <Button variant="outline" onClick={goToNextMonth} aria-label="Mes siguiente">
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-500">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="py-2">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === cursor.getMonth();
            const dayTasks = tasksByDate.get(key) || [];
            const isToday = key === todayKey;

            return (
              <button
                key={key}
                type="button"
                disabled={dayTasks.length === 0}
                onClick={() => setSelectedDateKey(key)}
                className={`flex h-20 flex-col items-center justify-start gap-1 border-b border-r border-slate-100 p-2 text-sm ${
                  inMonth ? 'text-slate-700' : 'text-slate-300'
                } ${dayTasks.length > 0 ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'}`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white' : ''
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayTasks.length > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                    {dayTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {undated > 0 && (
        <p className="mt-3 text-sm text-slate-400">
          {undated} {undated === 1 ? 'tarea' : 'tareas'} sin fecha límite no se{' '}
          {undated === 1 ? 'muestra' : 'muestran'} aquí.
        </p>
      )}

      <Modal
        open={Boolean(selectedDateKey)}
        onClose={() => setSelectedDateKey(null)}
        title={formatDateKey(selectedDateKey)}
      >
        <div className="flex flex-col gap-3">
          {selectedTasks.length === 0 ? (
            <p className="text-sm text-slate-400">No hay tareas este día.</p>
          ) : (
            selectedTasks.map((task) => (
              <TaskCard key={task._id} task={task} onEdit={openEdit} onDelete={handleDelete} />
            ))
          )}
        </div>
      </Modal>

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleEditSubmit}
        initialTask={editingTask}
      />
    </div>
  );
}

export default CalendarPage;
```

- [ ] **Step 2: Verify the build**

Run: `cd client && npm run build`
Expected: `✓ built in ...`, no errors.

- [ ] **Step 3: Commit**

```bash
cd client
git add src/pages/CalendarPage.jsx
git commit -m "feat: implementar CalendarPage con vista mensual y edicion de tareas por dia"
```

---

### Task 7: End-to-end manual verification and README update

**Files:**
- Modify: `README.md` (repo root)

**Interfaces:**
- Consumes: everything built in Tasks 1–6.
- Produces: documented routes/endpoints for the full feature set; final task.

- [ ] **Step 1: Start both servers**

Run (background): `cd server && node server.js`
Expected: `MongoDB connected` then `Server listening on port 5000`.

Run (background): `cd client && npm run dev`
Expected: a `Local: http://localhost:5173/` line.

- [ ] **Step 2: Confirm both are reachable**

```bash
curl -s -m 5 http://localhost:5000/api/health
curl -s -o /dev/null -w "%{http_code}\n" -m 5 http://localhost:5173/
```
Expected: health JSON `{"success":true,...}`; frontend `200`.

- [ ] **Step 3: Manual browser walkthrough**

No browser-automation tool is available in this environment (same limitation as the prior plans) — this step is performed by opening `http://localhost:5173` in an actual browser. Log in with any existing account, then walk through:

1. The sidebar shows three links: "Tareas", "Calendario", "Perfil". The active one is highlighted (dark background) and changes as you click between them.
2. On "Tareas": the status/priority selects now sit in a horizontal bar above the list (not in the sidebar); filtering still works as before.
3. Go to "Perfil". Change the name and save → toast "Perfil actualizado", and the header's "Hola, {nombre}" updates immediately without a page reload.
4. On the password form, submit with the wrong current password → toast with "Current password is incorrect" (or the translated message), fields stay filled.
5. Submit with the correct current password and a new one (≥ 6 chars, confirm matching) → toast "Contraseña actualizada", fields clear. Log out and log back in with the new password to confirm it actually changed.
6. Go to "Calendario". The current month shows; today's cell has a blue circle around the day number.
7. Any day with tasks (from the seed data or ones you created) shows a small blue dot + count and is clickable; days without tasks are not clickable.
8. Click a day with tasks → a modal opens listing them. Click the edit icon on one → the day modal closes and the task edit form opens with that task's data pre-filled. Change something and save → toast "Tarea actualizada", and the calendar's dot/count for that day updates if the date changed.
9. Use "◀" / "▶" to move between months, and "Hoy" to jump back to the current month.
10. If you have any task with no `dueDate`, confirm the "`N` tareas sin fecha límite no se muestran aquí" note appears below the calendar with the right count.

If any step doesn't match, note which one and stop — that's a bug to fix, not a plan issue.

- [ ] **Step 4: Stop both servers**

Stop the `client` dev server and the `server` process started in Step 1.

- [ ] **Step 5: Update `README.md`**

Add the two new endpoints to the Auth table:

```markdown
| PUT | `/me` | Sí | Actualiza el nombre del usuario autenticado |
| PUT | `/password` | Sí | Cambia la contraseña (requiere `currentPassword` y `newPassword`) |
```

Add the two new routes to the "Páginas" table:

```markdown
| `/calendar` | Vista mensual de tareas por fecha límite; click en un día abre sus tareas para editarlas |
| `/profile` | Editar nombre y cambiar contraseña |
```

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: documentar los endpoints y pantallas de perfil y calendario"
```
