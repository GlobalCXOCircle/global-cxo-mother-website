import { apiFetch } from '@/portal/api/client';

export interface ContactSubmissionPayload {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  source?: string;
  metadata_json?: Record<string, unknown>;
  botcheck?: string;
}

export interface OptInSubmissionPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  company?: string;
  role?: string;
  mailing_list?: boolean;
  join_circle?: boolean;
  source?: string;
  botcheck?: string;
}

export async function submitContactFormApi(payload: ContactSubmissionPayload) {
  return apiFetch<{ success: boolean; message: string; id?: string }>('/leads/contact', {
    method: 'POST',
    body: payload,
    skipAuthHeader: true,
  });
}

export async function submitOptInFormApi(payload: OptInSubmissionPayload) {
  return apiFetch<{ success: boolean; message: string; id?: string }>('/leads/opt-in', {
    method: 'POST',
    body: payload,
    skipAuthHeader: true,
  });
}

export interface NominateSubmissionPayload {
  nominee_name: string;
  nominee_role_company: string;
  nominee_linkedin?: string;
  award_category: string;
  reasons: string;
  nominator_name: string;
  nominator_email: string;
  relationship?: string;
  botcheck?: string;
}

export async function submitNominateFormApi(payload: NominateSubmissionPayload) {
  return apiFetch<{ success: boolean; message: string; id?: string }>('/leads/nominate', {
    method: 'POST',
    body: payload,
    skipAuthHeader: true,
  });
}
