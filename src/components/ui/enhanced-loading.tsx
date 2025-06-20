"use client"

import React from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Sparkles, Zap, Brain } from 'lucide-react'

interface EnhancedLoadingProps {
  variant?: 'default' | 'ai' | 'combat' | 'story' | 'minimal'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  message?: string
  progress?: number
  className?: string
  overlay?: boolean
}

const LoadingIcon = ({ variant }: { variant: string }) => {
  switch (variant) {
    case 'ai':
      return <Brain className="animate-pulse" />
    case 'combat':
      return <Zap className="animate-bounce" />
    case 'story':
      return <Sparkles className="animate-pulse" />
    default:
      return <Loader2 className="animate-spin" />
  }
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
}

const containerSizeClasses = {
  sm: 'p-2',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
}

export function EnhancedLoading({
  variant = 'default',
  size = 'md',
  message,
  progress,
  className,
  overlay = false,
}: EnhancedLoadingProps) {
  const content = (
    <div className={cn(
      "flex flex-col items-center justify-center space-y-3",
      containerSizeClasses[size],
      !overlay && "rounded-lg border bg-card/80 backdrop-blur-sm shadow-lg",
      className
    )}>
      {/* Loading Icon */}
      <div className={cn(
        "text-primary",
        sizeClasses[size]
      )}>
        <LoadingIcon variant={variant} />
      </div>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="w-full max-w-xs">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}

      {/* Loading Message */}
      {message && (
        <div className="text-center">
          <p className={cn(
            "text-foreground font-medium",
            size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
          )}>
            {message}
          </p>
          {variant === 'ai' && (
            <p className="text-xs text-muted-foreground mt-1">
              AI is processing your request...
            </p>
          )}
        </div>
      )}

      {/* Animated Dots */}
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "rounded-full bg-primary/60",
              size === 'sm' ? 'w-1 h-1' : size === 'lg' ? 'w-3 h-3' : 'w-2 h-2'
            )}
            style={{
              animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
            }}
          />
        ))}
      </div>
    </div>
  )

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}

// Skeleton Loading Components
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="h-4 bg-muted rounded loading-skeleton" />
      <div className="h-4 bg-muted rounded loading-skeleton w-3/4" />
      <div className="h-4 bg-muted rounded loading-skeleton w-1/2" />
    </div>
  )
}

export function SkeletonText({ 
  lines = 3, 
  className 
}: { 
  lines?: number
  className?: string 
}) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 bg-muted rounded loading-skeleton",
            i === lines - 1 ? "w-3/4" : "w-full"
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonAvatar({ className }: { className?: string }) {
  return (
    <div className={cn(
      "rounded-full bg-muted loading-skeleton",
      "h-10 w-10",
      className
    )} />
  )
}

// Loading States for specific components
export function LoadingButton({ 
  children, 
  isLoading, 
  loadingText,
  ...props 
}: {
  children: React.ReactNode
  isLoading: boolean
  loadingText?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={isLoading || props.disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "h-10 px-4 py-2",
        props.className
      )}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? loadingText || "Loading..." : children}
    </button>
  )
}

// Pulse loading for content areas
export function PulseLoading({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-4", className)}>
      <div className="h-8 bg-muted rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
      </div>
    </div>
  )
}
