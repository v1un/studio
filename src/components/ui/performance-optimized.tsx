"use client"

import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react'
import { cn } from '@/lib/utils'
import { EnhancedLoading } from './enhanced-loading'

// Virtualized list component for large datasets
interface VirtualizedListProps<T> {
  items: T[]
  itemHeight: number
  containerHeight: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  overscan?: number
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  className,
  overscan = 5
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0)

  const visibleItems = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    return items.slice(startIndex, endIndex + 1).map((item, index) => ({
      item,
      index: startIndex + index,
      top: (startIndex + index) * itemHeight
    }))
  }, [items, itemHeight, scrollTop, containerHeight, overscan])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  return (
    <div
      className={cn("overflow-auto", className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, top }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top,
              height: itemHeight,
              width: '100%'
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  )
}

// Memoized card component to prevent unnecessary re-renders
interface OptimizedCardProps {
  title: string
  description?: string
  children?: React.ReactNode
  className?: string
  onClick?: () => void
  isSelected?: boolean
}

export const OptimizedCard = memo<OptimizedCardProps>(({
  title,
  description,
  children,
  className,
  onClick,
  isSelected
}) => {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200 hover-lift",
        isSelected && "ring-2 ring-primary",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <div className="p-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
        {children}
      </div>
    </div>
  )
})

OptimizedCard.displayName = "OptimizedCard"

// Lazy loading wrapper with intersection observer
interface LazyLoadProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
  threshold?: number
  className?: string
}

export function LazyLoad({
  children,
  fallback = <EnhancedLoading variant="minimal" size="sm" />,
  rootMargin = "50px",
  threshold = 0.1,
  className
}: LazyLoadProps) {
  const [isIntersecting, setIsIntersecting] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [rootMargin, threshold])

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : fallback}
    </div>
  )
}

// Debounced input component
interface DebouncedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onDebouncedChange: (value: string) => void
  debounceMs?: number
}

export function DebouncedInput({
  onDebouncedChange,
  debounceMs = 300,
  ...props
}: DebouncedInputProps) {
  const [value, setValue] = React.useState(props.defaultValue || '')
  const timeoutRef = React.useRef<NodeJS.Timeout>()

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setValue(newValue)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      onDebouncedChange(newValue)
    }, debounceMs)
  }, [onDebouncedChange, debounceMs])

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <input
      {...props}
      value={value}
      onChange={handleChange}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        props.className
      )}
    />
  )
}

// Optimized image component with lazy loading and error handling
interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string
  loadingComponent?: React.ReactNode
}

export function OptimizedImage({
  src,
  fallbackSrc,
  loadingComponent = <div className="bg-muted animate-pulse rounded" />,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)
  const [currentSrc, setCurrentSrc] = React.useState(src)

  const handleLoad = useCallback(() => {
    setIsLoading(false)
    setHasError(false)
  }, [])

  const handleError = useCallback(() => {
    setIsLoading(false)
    setHasError(true)
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc)
      setIsLoading(true)
    }
  }, [fallbackSrc, currentSrc])

  if (isLoading) {
    return <div className={cn("flex items-center justify-center", className)}>{loadingComponent}</div>
  }

  if (hasError && !fallbackSrc) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <span className="text-sm">Failed to load image</span>
      </div>
    )
  }

  return (
    <img
      {...props}
      src={currentSrc}
      alt={props.alt || ""}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
      loading="lazy"
    />
  )
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = React.useState({
    renderTime: 0,
    componentCount: 0,
    memoryUsage: 0
  })

  React.useEffect(() => {
    const startTime = performance.now()

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTime

      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentCount: prev.componentCount + 1
      }))

      // Monitor memory usage if available
      if ('memory' in performance) {
        // @ts-ignore
        const memoryInfo = performance.memory
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memoryInfo.usedJSHeapSize / 1024 / 1024 // MB
        }))
      }
    }
  }, [])

  return metrics
}

// Throttled scroll hook
export function useThrottledScroll(callback: (scrollY: number) => void, delay = 16) {
  const lastRun = React.useRef(Date.now())

  React.useEffect(() => {
    const handleScroll = () => {
      if (Date.now() - lastRun.current >= delay) {
        callback(window.scrollY)
        lastRun.current = Date.now()
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [callback, delay])
}
