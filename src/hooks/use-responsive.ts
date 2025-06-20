"use client"

import { useState, useEffect } from 'react'

// Breakpoint definitions matching Tailwind CSS
const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
  '3xl': 1920,
  '4xl': 2560,
} as const

type Breakpoint = keyof typeof breakpoints

interface UseResponsiveReturn {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isLargeDesktop: boolean
  currentBreakpoint: Breakpoint | 'xs'
  width: number
  height: number
  isLandscape: boolean
  isPortrait: boolean
}

export function useResponsive(): UseResponsiveReturn {
  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0,
  })

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Set initial dimensions
    updateDimensions()

    // Add event listener
    window.addEventListener('resize', updateDimensions)
    
    // Cleanup
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  const { width, height } = dimensions

  // Determine current breakpoint
  const getCurrentBreakpoint = (): Breakpoint | 'xs' => {
    if (width >= breakpoints['2xl']) return '2xl'
    if (width >= breakpoints.xl) return 'xl'
    if (width >= breakpoints.lg) return 'lg'
    if (width >= breakpoints.md) return 'md'
    if (width >= breakpoints.sm) return 'sm'
    return 'xs'
  }

  const currentBreakpoint = getCurrentBreakpoint()
  const isMobile = width < breakpoints.md
  const isTablet = width >= breakpoints.md && width < breakpoints.lg
  const isDesktop = width >= breakpoints.lg && width < breakpoints.xl
  const isLargeDesktop = width >= breakpoints.xl
  const isLandscape = width > height
  const isPortrait = height > width

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    currentBreakpoint,
    width,
    height,
    isLandscape,
    isPortrait,
  }
}

// Hook for responsive values
export function useResponsiveValue<T>(values: {
  xs?: T
  sm?: T
  md?: T
  lg?: T
  xl?: T
  '2xl'?: T
}): T | undefined {
  const { currentBreakpoint } = useResponsive()

  // Return the value for the current breakpoint or the closest smaller one
  const breakpointOrder: (Breakpoint | 'xs')[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl']
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint)

  for (let i = currentIndex; i >= 0; i--) {
    const breakpoint = breakpointOrder[i]
    if (values[breakpoint] !== undefined) {
      return values[breakpoint]
    }
  }

  return undefined
}

// Hook for media queries
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia(query)
    setMatches(mediaQuery.matches)

    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

// Hook for touch device detection
export function useTouchDevice(): boolean {
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  useEffect(() => {
    const checkTouchDevice = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouchDevice()
  }, [])

  return isTouchDevice
}

// Hook for reduced motion preference
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)')
}

// Hook for dark mode preference
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)')
}

// Hook for high contrast preference
export function usePrefersHighContrast(): boolean {
  return useMediaQuery('(prefers-contrast: high)')
}

// Hook for responsive grid columns
export function useResponsiveColumns(options: {
  xs?: number
  sm?: number
  md?: number
  lg?: number
  xl?: number
  '2xl'?: number
}): number {
  const columns = useResponsiveValue(options)
  return columns || 1
}

// Hook for responsive spacing
export function useResponsiveSpacing(options: {
  xs?: string
  sm?: string
  md?: string
  lg?: string
  xl?: string
  '2xl'?: string
}): string {
  const spacing = useResponsiveValue(options)
  return spacing || '1rem'
}

// Hook for container max width - optimized for better screen space utilization
export function useContainerMaxWidth(): string {
  const { currentBreakpoint } = useResponsive()

  const maxWidths = {
    xs: '100%',
    sm: '95vw',
    md: '95vw',
    lg: '92vw',
    xl: '90vw',
    '2xl': '85vw',
    '3xl': '80vw',
    '4xl': '75vw',
  }

  return maxWidths[currentBreakpoint]
}

// Hook for optimized content max width (less restrictive than container)
export function useContentMaxWidth(): string {
  const { currentBreakpoint } = useResponsive()

  const maxWidths = {
    xs: '100%',
    sm: '100%',
    md: '100%',
    lg: '100%',
    xl: '100%',
    '2xl': '100%',
  }

  return maxWidths[currentBreakpoint]
}

// Hook for responsive horizontal padding
export function useResponsiveHorizontalPadding(): string {
  const { currentBreakpoint } = useResponsive()

  const paddings = {
    xs: '0.5rem',
    sm: '1rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2rem',
    '3xl': '2.5rem',
    '4xl': '3rem',
  }

  return paddings[currentBreakpoint]
}

// Hook for responsive vertical spacing
export function useResponsiveVerticalSpacing(): string {
  const { currentBreakpoint } = useResponsive()

  const spacings = {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '0.75rem',
    lg: '1rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.25rem',
    '4xl': '1.5rem',
  }

  return spacings[currentBreakpoint]
}

// Hook for story content height optimization
export function useStoryContentHeight(): string {
  const { currentBreakpoint, height } = useResponsive()

  // Calculate optimal story content height based on screen size
  if (height < 600) {
    return 'min-h-[30vh] max-h-[60vh]'
  } else if (height < 800) {
    return 'min-h-[40vh] max-h-[65vh]'
  } else if (height < 1000) {
    return 'min-h-[45vh] max-h-[70vh]'
  } else {
    return 'min-h-[50vh] max-h-[75vh]'
  }
}

// Hook for compact mode detection
export function useCompactMode(): boolean {
  const { height, isMobile } = useResponsive()

  // Enable compact mode on mobile or small height screens
  return isMobile || height < 700
}
