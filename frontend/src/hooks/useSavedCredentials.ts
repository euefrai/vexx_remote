import { useState, useEffect } from 'react';

const STORAGE_KEY = 'vexx_remote_credentials';

export function useSavedCredentials() {
  const [credentials, setCredentials] = useState({ name: '', password: '' });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setCredentials(parsed);
      }
    } catch (e) {
      console.warn('Failed to load saved credentials', e);
    }
  }, []);

  const saveCredentials = (name: string, password: string) => {
    setCredentials({ name, password });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, password }));
    } catch (e) {
      console.warn('Failed to save credentials', e);
    }
  };

  const clearCredentials = () => {
    setCredentials({ name: '', password: '' });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear credentials', e);
    }
  };

  return { credentials, saveCredentials, clearCredentials };
}
