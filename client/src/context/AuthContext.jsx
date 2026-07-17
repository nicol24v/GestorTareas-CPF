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
