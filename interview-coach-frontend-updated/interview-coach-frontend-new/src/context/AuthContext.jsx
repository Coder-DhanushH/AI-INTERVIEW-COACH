import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return true;
    return Date.now() > parseInt(tokenExpiry);
  }, []);

  // Auto-logout on inactivity (30 minutes)
  useEffect(() => {
    let inactivityTimer;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      // Auto-logout after 30 minutes of inactivity
      inactivityTimer = setTimeout(() => {
        console.log('Session expired due to inactivity');
        logout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Reset timer on user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    if (token && !isTokenExpired()) {
      events.forEach(event => {
        document.addEventListener(event, resetTimer);
      });
      resetTimer(); // Initial timer
    }

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [token, isTokenExpired]);

  useEffect(() => {
    if (token) {
      // Check if token is expired
      if (isTokenExpired()) {
        console.log('Token expired, logging out');
        logout();
      } else {
        fetchUser();
      }
    } else {
      setLoading(false);
    }
  }, [token, isTokenExpired]);

  const fetchUser = async () => {
    try {
      const response = await userAPI.getProfile();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      // Only logout if it's a 401 error (token invalid)
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password, rememberMe = false) => {
    try {
      const response = await authAPI.login({ username, password });
      const { access_token } = response.data;
      
      // Store token
      localStorage.setItem('token', access_token);
      
      // Store token expiry time (30 minutes from now)
      const expiryTime = Date.now() + (30 * 60 * 1000); // 30 minutes
      localStorage.setItem('tokenExpiry', expiryTime.toString());
      
      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      }
      
      setToken(access_token);
      await fetchUser();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Login failed',
      };
    }
  };

  const register = async (userData) => {
    try {
      await authAPI.register(userData);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Registration failed',
      };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiry');
    localStorage.removeItem('rememberMe');
    setToken(null);
    setUser(null);
    
    // Redirect to login
    window.location.href = '/login';
  }, []);

  const updateUser = (userData) => {
    setUser({ ...user, ...userData });
  };

  // Expose logout globally for axios interceptor
  useEffect(() => {
    window.authLogout = logout;
    return () => {
      delete window.authLogout;
    };
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
