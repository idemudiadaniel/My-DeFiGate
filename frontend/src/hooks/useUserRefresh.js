import { useCallback } from 'react';

/**
 * Hook to refresh user state from the server
 * Fetches the current user data including wallet and balance
 */
export const useUserRefresh = () => {
  const refreshUser = useCallback(async (setCurrentUser) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const res = await fetch('/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();
      if (data.ok && data.data?.user) {
        // Update user state with latest data including wallet and balance
        setCurrentUser(prev => ({
          ...prev,
          ...data.data.user,
          token: localStorage.getItem('authToken'),
        }));
        return data.data.user;
      }
      return null;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }, []);

  return { refreshUser };
};
