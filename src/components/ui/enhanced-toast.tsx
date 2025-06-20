"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

import { cn } from "@/lib/utils"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        default: "border bg-background text-foreground",
        destructive:
          "destructive group border-destructive bg-destructive text-destructive-foreground",
        success:
          "border-success bg-success text-success-foreground",
        warning:
          "border-warning bg-warning text-warning-foreground",
        info:
          "border-primary bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface EnhancedToastProps extends React.ComponentPropsWithoutRef<"div">, VariantProps<typeof toastVariants> {
  title?: string
  description?: string
  action?: React.ReactNode
  onClose?: () => void
  duration?: number
  persistent?: boolean
}

const ToastIcon = ({ variant }: { variant: string }) => {
  switch (variant) {
    case 'success':
      return <CheckCircle className="h-5 w-5" />
    case 'destructive':
      return <AlertCircle className="h-5 w-5" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5" />
    case 'info':
      return <Info className="h-5 w-5" />
    default:
      return null
  }
}

const EnhancedToast = React.forwardRef<HTMLDivElement, EnhancedToastProps>(
  ({ className, variant, title, description, action, onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start space-x-3">
          <ToastIcon variant={variant || 'default'} />
          <div className="grid gap-1">
            {title && (
              <div className="text-sm font-semibold">{title}</div>
            )}
            {description && (
              <div className="text-sm opacity-90">{description}</div>
            )}
          </div>
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
EnhancedToast.displayName = "EnhancedToast"

// Enhanced toast hook with better functionality
interface ToastOptions {
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  duration?: number
  action?: React.ReactNode
  persistent?: boolean
}

interface Toast extends ToastOptions {
  id: string
  timestamp: number
}

const toastQueue: Toast[] = []
let toastCounter = 0

export function useEnhancedToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const addToast = React.useCallback((options: ToastOptions) => {
    const id = `toast-${++toastCounter}`
    const toast: Toast = {
      id,
      timestamp: Date.now(),
      duration: 5000,
      ...options,
    }

    setToasts(prev => [...prev, toast])

    // Auto remove toast after duration (unless persistent)
    if (!toast.persistent && toast.duration) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }, toast.duration)
    }

    return id
  }, [])

  const removeToast = React.useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const removeAllToasts = React.useCallback(() => {
    setToasts([])
  }, [])

  // Convenience methods
  const toast = React.useCallback((options: ToastOptions) => addToast(options), [addToast])
  const success = React.useCallback((title: string, description?: string) => 
    addToast({ title, description, variant: 'success' }), [addToast])
  const error = React.useCallback((title: string, description?: string) => 
    addToast({ title, description, variant: 'destructive' }), [addToast])
  const warning = React.useCallback((title: string, description?: string) => 
    addToast({ title, description, variant: 'warning' }), [addToast])
  const info = React.useCallback((title: string, description?: string) => 
    addToast({ title, description, variant: 'info' }), [addToast])

  return {
    toasts,
    toast,
    success,
    error,
    warning,
    info,
    removeToast,
    removeAllToasts,
  }
}

// Toast container component
export function EnhancedToastContainer() {
  const { toasts, removeToast } = useEnhancedToast()

  return (
    <div className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]">
      {toasts.map((toast) => (
        <EnhancedToast
          key={toast.id}
          variant={toast.variant}
          title={toast.title}
          description={toast.description}
          action={toast.action}
          onClose={() => removeToast(toast.id)}
          className="mb-2 last:mb-0"
        />
      ))}
    </div>
  )
}

// Progress toast for long operations
export function ProgressToast({ 
  progress, 
  title, 
  description 
}: { 
  progress: number
  title: string
  description?: string 
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-sm text-muted-foreground">{Math.round(progress)}%</span>
      </div>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  )
}

export { EnhancedToast, toastVariants }
