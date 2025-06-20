"use client"

import React, { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

// Skip to content link for keyboard navigation
export function SkipToContent({ targetId = "main-content" }: { targetId?: string }) {
  const handleSkip = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      const target = document.getElementById(targetId)
      if (target) {
        target.focus()
        target.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [targetId])

  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
      onKeyDown={handleSkip}
    >
      Skip to main content
    </a>
  )
}

// Screen reader only text component
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>
}

// Live region for dynamic content announcements
interface LiveRegionProps {
  children: React.ReactNode
  politeness?: 'polite' | 'assertive' | 'off'
  atomic?: boolean
  relevant?: 'additions' | 'removals' | 'text' | 'all'
  className?: string
}

export function LiveRegion({
  children,
  politeness = 'polite',
  atomic = true,
  relevant = 'all',
  className
}: LiveRegionProps) {
  return (
    <div
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn("sr-only", className)}
    >
      {children}
    </div>
  )
}

// Focus trap component for modals and dialogs
interface FocusTrapProps {
  children: React.ReactNode
  enabled?: boolean
  restoreFocus?: boolean
  className?: string
}

export function FocusTrap({
  children,
  enabled = true,
  restoreFocus = true,
  className
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!enabled) return

    const container = containerRef.current
    if (!container) return

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    // Focus the first element
    if (firstElement) {
      firstElement.focus()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement?.focus()
          }
        }
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        // Allow parent to handle escape
        container.dispatchEvent(new CustomEvent('escape'))
      }
    }

    container.addEventListener('keydown', handleKeyDown)

    return () => {
      container.removeEventListener('keydown', handleKeyDown)
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [enabled, restoreFocus])

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  )
}

// Accessible button with enhanced keyboard support
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  description?: string
}

export function AccessibleButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  loadingText,
  description,
  className,
  disabled,
  ...props
}: AccessibleButtonProps) {
  const buttonId = React.useId()
  const descriptionId = description ? `${buttonId}-description` : undefined

  return (
    <>
      <button
        id={buttonId}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            'bg-primary text-primary-foreground hover:bg-primary/90': variant === 'primary',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground': variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90': variant === 'destructive',
          },
          {
            'h-9 px-3 text-sm': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8': size === 'lg',
          },
          className
        )}
        disabled={disabled || loading}
        aria-describedby={descriptionId}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        <ScreenReaderOnly>
          {loading ? (loadingText || 'Loading') : ''}
        </ScreenReaderOnly>
        {children}
      </button>
      {description && (
        <div id={descriptionId} className="sr-only">
          {description}
        </div>
      )}
    </>
  )
}

// Accessible form field with proper labeling
interface AccessibleFieldProps {
  label: string
  children: React.ReactNode
  error?: string
  description?: string
  required?: boolean
  className?: string
}

export function AccessibleField({
  label,
  children,
  error,
  description,
  required = false,
  className
}: AccessibleFieldProps) {
  const fieldId = React.useId()
  const errorId = error ? `${fieldId}-error` : undefined
  const descriptionId = description ? `${fieldId}-description` : undefined

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={fieldId}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && (
          <span className="text-destructive ml-1" aria-label="required">
            *
          </span>
        )}
      </label>
      
      {description && (
        <p id={descriptionId} className="text-sm text-muted-foreground">
          {description}
        </p>
      )}
      
      {React.cloneElement(children as React.ReactElement, {
        id: fieldId,
        'aria-describedby': [descriptionId, errorId].filter(Boolean).join(' ') || undefined,
        'aria-invalid': !!error,
        'aria-required': required,
      })}
      
      {error && (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// High contrast mode detector
export function useHighContrast() {
  const [isHighContrast, setIsHighContrast] = React.useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)')
    setIsHighContrast(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setIsHighContrast(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isHighContrast
}

// Reduced motion detector
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)

    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

// Keyboard navigation helper
export function useKeyboardNavigation(
  items: string[],
  onSelect: (item: string, index: number) => void
) {
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedIndex(prev => (prev + 1) % items.length)
        break
      case 'ArrowUp':
        event.preventDefault()
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length)
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        onSelect(items[selectedIndex], selectedIndex)
        break
      case 'Home':
        event.preventDefault()
        setSelectedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setSelectedIndex(items.length - 1)
        break
    }
  }, [items, selectedIndex, onSelect])

  return {
    selectedIndex,
    setSelectedIndex,
    handleKeyDown
  }
}
