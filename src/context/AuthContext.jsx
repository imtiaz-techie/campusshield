import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthAPI, tokenStore } from '../services/api';

const AuthContext = createContext(null);

export const homeFor = (role) => ({ student: '/student/dashboard', security: '/security/dashboard', admin: '/admin/dashboard' }[role] || '/');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('campusshield:logout', onLogout);
    if (tokenStore.get()) {
      AuthAPI.me()
        .then((r) => setUser(r.data))
        .catch(() => tokenStore.clear())
        .finally(() => setLoading(false));
    }
    return () => window.removeEventListener('campusshield:logout', onLogout);
  }, []);

  const applyAuth = (payload) => {
    tokenStore.set(payload.token);
    setUser(payload.user);
    return payload.user;
  };

  const value = useMemo(() => ({
    user,
    loading,
    login: async (email, password) => applyAuth((await AuthAPI.login({ email, password })).data),
    register: async (form) => applyAuth((await AuthAPI.register(form)).data),
    logout,
    setUser,
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
