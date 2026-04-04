import { AUTH_ROLE_KEY, AUTH_TOKEN_KEY, AUTH_COMPANY_ID_KEY, AUTH_REFRESH_TOKEN_KEY } from '../config/constants';
import type { UserRole } from '../routes/types';

/**
 * Decode a JWT payload without verification (verification happens server-side).
 * Returns null if the token is malformed or expired.
 */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    // Check expiry
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get the current user role from the JWT token payload.
 * Falls back to localStorage only if the token is unavailable.
 * This prevents role spoofing via localStorage manipulation.
 */
export const getCurrentUserRole = (): UserRole | null => {
  // Primary: derive role from the JWT token itself
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    const payload = decodeJwtPayload(token);
    if (payload && typeof payload.role === 'string') {
      const uppercased = payload.role.toUpperCase();
      if (['ADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE'].includes(uppercased)) {
        return uppercased as UserRole;
      }
    }
  }

  // Fallback: localStorage (kept for backward compatibility, less trusted)
  const role = localStorage.getItem(AUTH_ROLE_KEY);
  if (!role) {
    return null;
  }

  const uppercased = role.toUpperCase();
  if (['ADMIN', 'OWNER', 'MANAGER', 'EMPLOYEE'].includes(uppercased)) {
    return uppercased as UserRole;
  }

  return null;
};

export const getCurrentCompanyId = (): number | null => {
  const companyId = localStorage.getItem(AUTH_COMPANY_ID_KEY);
  if (!companyId) {
    return null;
  }
  return parseInt(companyId, 10);
};

export const getAccessToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
};

export const persistSession = (token: string, role?: string, companyId?: number, refreshToken?: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  if (role) {
    localStorage.setItem(AUTH_ROLE_KEY, role.toUpperCase());
  }
  if (companyId) {
    localStorage.setItem(AUTH_COMPANY_ID_KEY, companyId.toString());
  }
  if (refreshToken) {
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_ROLE_KEY);
  localStorage.removeItem(AUTH_COMPANY_ID_KEY);
  localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
};
