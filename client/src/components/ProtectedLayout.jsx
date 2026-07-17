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
