import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { v4 as uuidv4 } from 'uuid'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate a UUID using crypto.randomUUID() if available, otherwise fallback to uuid package
 * This ensures compatibility across different environments and browsers
 */
export function generateUUID(): string {
  // Check if crypto.randomUUID is available (requires secure context and modern browser)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID()
    } catch (error) {
      console.warn('crypto.randomUUID failed, falling back to uuid package:', error)
    }
  }

  // Fallback to uuid package
  return uuidv4()
}
