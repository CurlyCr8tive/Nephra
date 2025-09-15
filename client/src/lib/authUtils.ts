// Auth utilities for handling unauthorized errors - from Replit Auth integration
export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message);
}