import type { MockUser } from '@/portal/data/mock/types';

const ACCESS_TOKEN_KEY = 'gcio_access_token';
const USER_KEY = 'gcio_stored_user';

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY) || localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (token) {
      sessionStorage.setItem(ACCESS_TOKEN_KEY, token);
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {}
}

export function getStoredUser(): MockUser | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as MockUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: MockUser | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (user) {
      const val = JSON.stringify(user);
      sessionStorage.setItem(USER_KEY, val);
      localStorage.setItem(USER_KEY, val);
    } else {
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(USER_KEY);
    }
  } catch {}
}
