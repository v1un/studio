import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  slowRenders: number;
  memoryUsage?: number;
}

/**
 * Hook to monitor component performance and detect potential issues
 */
export function usePerformanceMonitor(componentName: string, threshold = 16) {
  const metricsRef = useRef<PerformanceMetrics>({
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    slowRenders: 0,
  });

  const renderStartTime = useRef<number>(0);

  // Start timing render
  renderStartTime.current = performance.now();

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    const metrics = metricsRef.current;

    metrics.renderCount++;
    metrics.lastRenderTime = renderTime;
    metrics.averageRenderTime = 
      (metrics.averageRenderTime * (metrics.renderCount - 1) + renderTime) / metrics.renderCount;

    if (renderTime > threshold) {
      metrics.slowRenders++;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms ` +
          `(threshold: ${threshold}ms, slow renders: ${metrics.slowRenders})`
        );
      }
    }

    // Log performance summary every 100 renders in development
    if (process.env.NODE_ENV === 'development' && metrics.renderCount % 100 === 0) {
      console.log(`Performance summary for ${componentName}:`, {
        totalRenders: metrics.renderCount,
        averageRenderTime: metrics.averageRenderTime.toFixed(2) + 'ms',
        slowRenders: metrics.slowRenders,
        slowRenderPercentage: ((metrics.slowRenders / metrics.renderCount) * 100).toFixed(1) + '%',
      });
    }
  });

  const getMetrics = useCallback(() => ({ ...metricsRef.current }), []);

  const resetMetrics = useCallback(() => {
    metricsRef.current = {
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      slowRenders: 0,
    };
  }, []);

  return { getMetrics, resetMetrics };
}

/**
 * Hook to monitor memory usage and detect potential leaks
 */
export function useMemoryMonitor(componentName: string) {
  const initialMemory = useRef<number | null>(null);
  const memoryCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return;
    }

    // Record initial memory usage
    const memory = (performance as any).memory;
    if (memory && initialMemory.current === null) {
      initialMemory.current = memory.usedJSHeapSize;
    }

    // Check memory usage periodically in development
    if (process.env.NODE_ENV === 'development') {
      memoryCheckInterval.current = setInterval(() => {
        if (memory && initialMemory.current !== null) {
          const currentMemory = memory.usedJSHeapSize;
          const memoryIncrease = currentMemory - initialMemory.current;
          const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

          if (memoryIncreaseMB > 10) { // Alert if memory increased by more than 10MB
            console.warn(
              `Potential memory leak in ${componentName}: ` +
              `Memory increased by ${memoryIncreaseMB.toFixed(2)}MB since mount`
            );
          }
        }
      }, 30000); // Check every 30 seconds
    }

    return () => {
      if (memoryCheckInterval.current) {
        clearInterval(memoryCheckInterval.current);
      }
    };
  }, [componentName]);

  const getCurrentMemoryUsage = useCallback(() => {
    if (typeof window === 'undefined' || !('memory' in performance)) {
      return null;
    }

    const memory = (performance as any).memory;
    if (!memory) return null;

    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedMB: (memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
      totalMB: (memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
    };
  }, []);

  return { getCurrentMemoryUsage };
}

/**
 * Hook to monitor context re-renders and detect unnecessary updates
 */
export function useContextRenderMonitor(contextName: string, contextValue: any) {
  const previousValue = useRef(contextValue);
  const renderCount = useRef(0);
  const unnecessaryRenders = useRef(0);

  useEffect(() => {
    renderCount.current++;

    // Check if the context value actually changed
    const hasChanged = JSON.stringify(previousValue.current) !== JSON.stringify(contextValue);
    
    if (!hasChanged) {
      unnecessaryRenders.current++;
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Unnecessary re-render in ${contextName} context: ` +
          `Value didn't change but component re-rendered ` +
          `(${unnecessaryRenders.current}/${renderCount.current} unnecessary renders)`
        );
      }
    }

    previousValue.current = contextValue;
  });

  const getStats = useCallback(() => ({
    totalRenders: renderCount.current,
    unnecessaryRenders: unnecessaryRenders.current,
    efficiency: ((renderCount.current - unnecessaryRenders.current) / renderCount.current * 100).toFixed(1) + '%',
  }), []);

  return { getStats };
}

/**
 * Hook to detect and warn about potential infinite re-render loops
 */
export function useInfiniteRenderDetection(componentName: string, threshold = 100) {
  const renderCount = useRef(0);
  const resetTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    renderCount.current++;

    // Reset counter after 1 second of no renders
    if (resetTimeout.current) {
      clearTimeout(resetTimeout.current);
    }

    resetTimeout.current = setTimeout(() => {
      renderCount.current = 0;
    }, 1000);

    // Check for potential infinite loop
    if (renderCount.current > threshold) {
      console.error(
        `Potential infinite render loop detected in ${componentName}: ` +
        `${renderCount.current} renders in the last second`
      );
      
      // Reset counter to prevent spam
      renderCount.current = 0;
    }

    return () => {
      if (resetTimeout.current) {
        clearTimeout(resetTimeout.current);
      }
    };
  });
}
