import { apiFetch } from '@/portal/api/client';
import { ApiError } from '@/portal/api/errors';
import { setStoredAccessToken, setStoredUser } from '@/portal/api/tokenStorage';
import { mapApiUserToMockUser, type ApiLoginResponseJson, type ApiUserJson } from '@/portal/types/auth';
import type { ApiTokenPairJson } from '@/portal/api/types';
import type { MockUser, UserTier } from '@/portal/data/mock/types';

const ME_PATH = '/users/me';
const LOGIN_PATH = '/auth/login';
const LOGOUT_PATH = '/auth/logout';
const REGISTER_PATH = '/auth/register';
const DEMO_LOGIN_AS_PATH = '/auth/demo/login-as';
const ADMIN_IMPERSONATE_PATH = '/auth/admin/impersonate';

export async function fetchCurrentUserApi(): Promise<MockUser | null> {
  try {
    const raw = await apiFetch<ApiUserJson>(ME_PATH, { method: 'GET' });
    const user = mapApiUserToMockUser(raw);
    if (user) {
      setStoredUser(user);
    }
    return user;
  } catch (err: unknown) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 404)) {
      setStoredAccessToken(null);
      setStoredUser(null);
      return null;
    }
    throw err;
  }
}

// Discriminated union for login responses (Spec 05 — 2FA support).
export interface TwoFaRequired {
  requires_2fa: true;
  twofa_token: string;
}

export interface ApplicationPending {
  application_pending: true;
  message: string;
}

export interface PreExistingProfile {
  pre_existing_profile: true;
  message: string;
}

export type LoginResult = MockUser | TwoFaRequired | ApplicationPending | PreExistingProfile;

export function isTwoFaRequired(result: LoginResult): result is TwoFaRequired {
  return typeof result === 'object' && 'requires_2fa' in result && result.requires_2fa === true;
}

export function isApplicationPending(result: LoginResult): result is ApplicationPending {
  return typeof result === 'object' && 'application_pending' in result && (result as ApplicationPending).application_pending === true;
}

export function isPreExistingProfile(result: LoginResult): result is PreExistingProfile {
  return typeof result === 'object' && 'pre_existing_profile' in result && (result as PreExistingProfile).pre_existing_profile === true;
}

export async function loginWithPasswordApi(email: string, password: string): Promise<LoginResult> {
  const res = await apiFetch<ApiTokenPairJson | ApiLoginResponseJson | TwoFaRequired>(LOGIN_PATH, {
    method: 'POST',
    body: { email, password },
    skipAuthHeader: true,
  });

  // 2FA required — return the pending token for the second stage.
  if ('requires_2fa' in res && res.requires_2fa) {
    return res as TwoFaRequired;
  }

  if ('access_token' in res && res.access_token) {
    setStoredAccessToken(res.access_token);
  }

  if ('user' in res && res.user) {
    const u = mapApiUserToMockUser(res.user as ApiUserJson);
    setStoredUser(u);
    return u;
  }

  const me = await fetchCurrentUserApi();
  if (!me) {
    throw new Error('Login succeeded but user payload was missing.');
  }
  setStoredUser(me);
  return me;
}

/** Second stage of 2FA login: submit the 6-digit code. */
export async function login2faApi(twofaToken: string, code: string): Promise<MockUser> {
  const res = await apiFetch<ApiLoginResponseJson>('/auth/login/2fa', {
    method: 'POST',
    body: { twofa_token: twofaToken, code },
    skipAuthHeader: true,
  });

  if ('access_token' in res && res.access_token) {
    setStoredAccessToken(res.access_token);
  }

  if ('user' in res && res.user) {
    const u = mapApiUserToMockUser(res.user as ApiUserJson);
    setStoredUser(u);
    return u;
  }

  const me = await fetchCurrentUserApi();
  if (!me) throw new Error('2FA login succeeded but user payload was missing.');
  setStoredUser(me);
  return me;
}

/** Enable email-based 2FA for the current user. Sends a verification email. */
export async function enroll2faApi(): Promise<{ status: string; message: string }> {
  return apiFetch('/auth/2fa/enroll', { method: 'POST' });
}

/** Confirm 2FA enrollment — no-op for email-based 2FA (confirmation happens via link). */
export async function confirm2faApi(_code: string): Promise<{ recovery_codes: string[] }> {
  return { recovery_codes: [] };
}

/** Verify a login via email link token. Returns full session. */
export async function verifyLoginTokenApi(token: string): Promise<MockUser> {
  const res = await apiFetch<ApiLoginResponseJson>(`/auth/verify-login/${token}`, {
    method: 'POST',
    skipAuthHeader: true,
  });
  if ('access_token' in res && res.access_token) {
    setStoredAccessToken(res.access_token);
  }
  if ('user' in res && res.user) {
    const u = mapApiUserToMockUser(res.user as ApiUserJson);
    setStoredUser(u);
    return u;
  }
  const me = await fetchCurrentUserApi();
  if (!me) throw new Error('Verification succeeded but user payload was missing.');
  setStoredUser(me);
  return me;
}

/** Verify a 6-digit login code. Returns full session. */
export async function verifyCodeApi(email: string, code: string): Promise<MockUser> {
  const res = await apiFetch<ApiLoginResponseJson>('/auth/verify-code', {
    method: 'POST',
    body: { email, code },
    skipAuthHeader: true,
  });
  if ('access_token' in res && res.access_token) {
    setStoredAccessToken(res.access_token);
  }
  if ('user' in res && res.user) {
    const u = mapApiUserToMockUser(res.user as ApiUserJson);
    setStoredUser(u);
    return u;
  }
  const me = await fetchCurrentUserApi();
  if (!me) throw new Error('Verification succeeded but user payload was missing.');
  setStoredUser(me);
  return me;
}

export async function logoutApi(): Promise<void> {
  try {
    setStoredAccessToken(null);
    setStoredUser(null);
    // Fire the server-side logout but don't wait for it
    void apiFetch<unknown>(LOGOUT_PATH, { method: 'POST' }).catch(() => {});
  } finally {
    setStoredAccessToken(null);
    setStoredUser(null);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('gcio_proxy_admin_id');
      sessionStorage.removeItem('gcio_proxy_admin_token');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('gcio_submissions');
      localStorage.removeItem('gcio_mock_db');
    }
  }
}

/**
 * Seeded/demo persona switch — backend should validate dev/demo mode and issue a session.
 */
export async function demoLoginAsApi(
  userId: string,
  options: { skipAuthHeader?: boolean } = {},
): Promise<MockUser> {
  const res = await apiFetch<ApiLoginResponseJson>(DEMO_LOGIN_AS_PATH, {
    method: 'POST',
    body: { user_id: userId },
    skipAuthHeader: options.skipAuthHeader ?? false,
  });

  if (res.access_token) {
    setStoredAccessToken(res.access_token);
  }

  if (res.user) {
    return mapApiUserToMockUser(res.user);
  }

  const me = await fetchCurrentUserApi();
  if (!me) {
    throw new Error('Demo login succeeded but user payload was missing.');
  }
  return me;
}

export async function switchUserApi(userId: string): Promise<MockUser> {
  return demoLoginAsApi(userId, { skipAuthHeader: false });
}

export async function adminImpersonateApi(targetUserId: string): Promise<MockUser> {
  const res = await apiFetch<ApiLoginResponseJson>(ADMIN_IMPERSONATE_PATH, {
    method: 'POST',
    body: { target_user_id: targetUserId },
  });

  if (res.access_token) {
    setStoredAccessToken(res.access_token);
  }

  if (res.user) {
    return mapApiUserToMockUser(res.user);
  }

  const me = await fetchCurrentUserApi();
  if (!me) {
    throw new Error('Impersonation succeeded but user payload was missing.');
  }
  return me;
}

export interface RegisterUserBody {
  email: string;
  password: string;
  name: string;
  phone: string;
  linkedin: string;
  company_affiliation: string;
  role: string;
  about_me: string;
  tier: UserTier;
}

export async function registerUserApi(body: RegisterUserBody): Promise<MockUser> {
  const raw = await apiFetch<ApiUserJson>(REGISTER_PATH, {
    method: 'POST',
    body,
    skipAuthHeader: true,
  });
  return mapApiUserToMockUser(raw);
}

export interface OnboardInfo {
  name: string;
  email: string;
  tier: string;
  onboarding_status: string;
  company_affiliation: string;
  role: string;
  linkedin: string;
  about_me: string;
}

export async function getOnboardInfoApi(token: string): Promise<OnboardInfo> {
  return apiFetch<OnboardInfo>(`/auth/onboard/${token}`, { method: 'GET', skipAuthHeader: true });
}

export async function submitOnboardApi(
  token: string,
  body: {
    password: string;
    name?: string;
    linkedin?: string;
    company_affiliation?: string;
    role?: string;
    about_me?: string;
    company_size?: string;
  },
): Promise<ApiLoginResponseJson> {
  const res = await apiFetch<ApiLoginResponseJson>(`/auth/onboard/${token}`, {
    method: 'POST',
    body,
    skipAuthHeader: true,
  });
  if (res.access_token) {
    setStoredAccessToken(res.access_token);
  }
  return res;
}
