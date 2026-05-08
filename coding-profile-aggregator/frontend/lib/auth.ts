export const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;
export const setToken = (token: string) => localStorage.setItem('token', token);
export const removeToken = () => localStorage.removeItem('token');
export const isAuthenticated = () => !!getToken();

// Decode JWT token to get user info
export const getUserFromToken = () => {
  if (typeof window === 'undefined') return null;
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      id: payload.id,
      email: payload.email,
      registration_no: payload.registration_no,
      role: payload.role
    };
  } catch {
    return null;
  }
};

// Check if current user is admin
export const isAdmin = (): boolean => {
  const user = getUserFromToken();
  return user?.role === 'admin';
};

