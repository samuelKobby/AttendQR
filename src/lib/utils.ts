import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get initials from an email
 * @param email Email to get initials from
 * @returns Uppercase initials
 */
export function getInitials(email: string): string {
  return email
    .split('@')[0]
    .split('.')
    .map(part => part[0]?.toUpperCase() || '')
    .join('');
}