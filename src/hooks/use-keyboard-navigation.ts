"use client"

import { useEffect, useCallback } from 'react'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

interface UseKeyboardNavigationProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export function useKeyboardNavigation({ shortcuts, enabled = true }: UseKeyboardNavigationProps) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    // Don't trigger shortcuts when user is typing in inputs
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return
    }

    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
      const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey
      const metaMatches = !!shortcut.metaKey === event.metaKey
      const shiftMatches = !!shortcut.shiftKey === event.shiftKey
      const altMatches = !!shortcut.altKey === event.altKey

      if (keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches) {
        event.preventDefault()
        shortcut.action()
        break
      }
    }
  }, [shortcuts, enabled])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])

  return { shortcuts }
}

// Common keyboard shortcuts for the game
export const useGameKeyboardShortcuts = (actions: {
  onSubmitAction?: () => void
  onUndo?: () => void
  onRestart?: () => void
  onToggleCharacterSheet?: () => void
  onToggleInventory?: () => void
  onToggleJournal?: () => void
  onToggleLorebook?: () => void
  onFocusInput?: () => void
}) => {
  const shortcuts: KeyboardShortcut[] = [
    {
      key: 'Enter',
      ctrlKey: true,
      action: actions.onSubmitAction || (() => {}),
      description: 'Submit action (Ctrl+Enter)'
    },
    {
      key: 'z',
      ctrlKey: true,
      action: actions.onUndo || (() => {}),
      description: 'Undo last action (Ctrl+Z)'
    },
    {
      key: 'r',
      ctrlKey: true,
      shiftKey: true,
      action: actions.onRestart || (() => {}),
      description: 'Restart game (Ctrl+Shift+R)'
    },
    {
      key: 'c',
      altKey: true,
      action: actions.onToggleCharacterSheet || (() => {}),
      description: 'Toggle character sheet (Alt+C)'
    },
    {
      key: 'i',
      altKey: true,
      action: actions.onToggleInventory || (() => {}),
      description: 'Toggle inventory (Alt+I)'
    },
    {
      key: 'j',
      altKey: true,
      action: actions.onToggleJournal || (() => {}),
      description: 'Toggle journal (Alt+J)'
    },
    {
      key: 'l',
      altKey: true,
      action: actions.onToggleLorebook || (() => {}),
      description: 'Toggle lorebook (Alt+L)'
    },
    {
      key: '/',
      action: actions.onFocusInput || (() => {}),
      description: 'Focus input field (/)'
    }
  ]

  return useKeyboardNavigation({ shortcuts })
}

// Hook for managing focus within components
export function useFocusManagement() {
  const focusElement = useCallback((selector: string) => {
    const element = document.querySelector(selector) as HTMLElement
    if (element) {
      element.focus()
    }
  }, [])

  const focusFirstFocusable = useCallback((container?: HTMLElement) => {
    const containerElement = container || document.body
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    if (firstElement) {
      firstElement.focus()
    }
  }, [])

  const focusLastFocusable = useCallback((container?: HTMLElement) => {
    const containerElement = container || document.body
    const focusableElements = containerElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
    if (lastElement) {
      lastElement.focus()
    }
  }, [])

  const trapFocus = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab') {
        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [])

  return {
    focusElement,
    focusFirstFocusable,
    focusLastFocusable,
    trapFocus
  }
}

// Hook for screen reader announcements
export function useScreenReader() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message

    document.body.appendChild(announcement)

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }, [])

  return { announce }
}
