const DEFAULT_API_BASE_URL = 'https://backendgcxo-hfdrd8cugtepfpcs.centralus-01.azurewebsites.net/api';

function resolveApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  let base = envUrl && envUrl.length > 0 ? envUrl : DEFAULT_API_BASE_URL;
  if (!base.startsWith('http://') && !base.startsWith('https://')) {
    base = DEFAULT_API_BASE_URL;
  }
  base = base.replace(/\/$/, '');
  if (!base.endsWith('/api') && !base.includes('/api/')) {
    base = `${base}/api`;
  }
  return base;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** When true and a base URL is set, login/bootstrap use HTTP instead of local mock session. */
export const USE_API_AUTH: boolean =
  (process.env.NEXT_PUBLIC_USE_API_AUTH ?? 'true') !== 'false';

// ---------------------------------------------------------------------------
// Cal.com URLs — driven by environment variables with sensible production defaults
// ---------------------------------------------------------------------------

const DEFAULT_CALCOM_URL = 'https://globalcxocircle.com/cal';
const DEFAULT_CALCOM_ADMIN_URL = 'https://gcio-calcom-production.up.railway.app';
const DEFAULT_CALCOM_IFRAME_SRC = 'https://gcio-calcom-production.up.railway.app';

const rawCalcomUrl = (process.env.NEXT_PUBLIC_CALCOM_URL as string | undefined)?.trim();
export const CALCOM_URL: string = (rawCalcomUrl && rawCalcomUrl.length > 0
  ? rawCalcomUrl
  : DEFAULT_CALCOM_URL
).replace(/\/$/, '');

const rawCalcomAdminUrl = (process.env.NEXT_PUBLIC_CALCOM_ADMIN_URL as string | undefined)?.trim();
export const CALCOM_ADMIN_URL: string = (rawCalcomAdminUrl && rawCalcomAdminUrl.length > 0
  ? rawCalcomAdminUrl
  : DEFAULT_CALCOM_ADMIN_URL
).replace(/\/$/, '');

const rawCalcomIframeSrc = (process.env.NEXT_PUBLIC_CALCOM_IFRAME_SRC as string | undefined)?.trim();
export const CALCOM_IFRAME_SRC: string = (rawCalcomIframeSrc && rawCalcomIframeSrc.length > 0
  ? rawCalcomIframeSrc
  : DEFAULT_CALCOM_IFRAME_SRC
).replace(/\/$/, '');
