// Debug utility to check authentication status
export const debugAuth = () => {
  if (typeof window === 'undefined') return;
  
  const token = localStorage.getItem('token');
  console.log('🔍 Auth Debug Info:');
  console.log('Token exists:', !!token);
  
  if (token) {
    try {
      // Decode JWT token (without verification - just for debugging)
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token payload:', payload);
      console.log('User role:', payload.role);
      console.log('User email:', payload.email);
      console.log('Token expires:', new Date(payload.exp * 1000).toLocaleString());
      console.log('Is admin:', payload.role === 'admin');
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  } else {
    console.log('❌ No token found in localStorage');
  }
};

// Check if user is admin
export const isAdmin = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role === 'admin' || payload.role === 'superadmin';
  } catch {
    return false;
  }
};

// Get user info from token
export const getUserFromToken = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('token');
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
