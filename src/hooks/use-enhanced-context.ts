import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Enhanced context management utilities to prevent memory leaks and improve performance
 */

/**
 * Hook to safely manage event listeners with automatic cleanup
 */
export function useEventListener<T extends keyof WindowEventMap>(
  eventType: T,
  handler: (event: WindowEventMap[T]) => void,
  options?: AddEventListenerOptions
) {
  const handlerRef = useRef(handler);
  
  // Update handler ref when handler changes
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventHandler = (event: WindowEventMap[T]) => handlerRef.current(event);
    
    window.addEventListener(eventType, eventHandler, options);
    
    return () => {
      window.removeEventListener(eventType, eventHandler, options);
    };
  }, [eventType, options]);
}

/**
 * Hook to safely manage intervals with automatic cleanup
 */
export function useInterval(callback: () => void, delay: number | null) {
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const intervalId = setInterval(() => callbackRef.current(), delay);
    
    return () => clearInterval(intervalId);
  }, [delay]);
}

/**
 * Hook to safely manage timeouts with automatic cleanup
 */
export function useTimeout(callback: () => void, delay: number | null) {
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const timeoutId = setTimeout(() => callbackRef.current(), delay);
    
    return () => clearTimeout(timeoutId);
  }, [delay]);
}

/**
 * Hook for localStorage with error handling and cross-tab synchronization
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Use lazy initialization to avoid SSR issues
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    if (typeof window === 'undefined') return;

    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));

      // Dispatch custom event for cross-tab synchronization
      window.dispatchEvent(new CustomEvent('localStorage-change', {
        detail: { key, value: valueToStore }
      }));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      setStoredValue(defaultValue);
      localStorage.removeItem(key);
      window.dispatchEvent(new CustomEvent('localStorage-change', {
        detail: { key, value: null }
      }));
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);

  // Listen for changes from other tabs
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    const handleCustomChange = (e: CustomEvent) => {
      if (e.detail.key === key) {
        setStoredValue(e.detail.value ?? defaultValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localStorage-change', handleCustomChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localStorage-change', handleCustomChange as EventListener);
    };
  }, [key, defaultValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook to prevent unnecessary re-renders in context providers
 */
export function useStableCallback<T extends (...args: any[]) => any>(callback: T): T {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);
  
  return useCallback((...args: any[]) => callbackRef.current(...args), []) as T;
}

/**
 * Hook to detect memory leaks in development
 */
export function useMemoryLeakDetection(componentName: string) {
  const mountCountRef = useRef(0);
  
  useEffect(() => {
    mountCountRef.current += 1;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} mounted (count: ${mountCountRef.current})`);
      
      if (mountCountRef.current > 10) {
        console.warn(`Potential memory leak detected in ${componentName}: mounted ${mountCountRef.current} times`);
      }
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} unmounted`);
      }
    };
  }, [componentName]);
}
