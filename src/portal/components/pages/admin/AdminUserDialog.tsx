import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import type { MockUser, UserTier } from '@/portal/data/mock';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/portal/components/ui/dialog';
import { Button } from '@/portal/components/ui/button';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { Textarea } from '@/portal/components/ui/textarea';
import { ImageUpload } from '@/portal/components/ui/image-upload';
import { usePrograms, useCohorts } from '@/portal/hooks/usePrograms';
import { SandboxToggle } from './SandboxToggle';
export type EnterpriseSize = 'L' | 'M' | 'S' | null;

export interface AdminUserFormValues {
  name: string;
  email: string;
  phone: string;
  linkedin: string;
  companyAffiliation: string;
  role: string;
  aboutMe: string;
  tier: UserTier;
  enterpriseSize: EnterpriseSize;
  isStudent: boolean;
  avatarUrl: string;
  companySize: string;
  advisoryHourlyRate: string;
  programId: string;
  circleId: string;
  sandbox: boolean;
}

interface AdminUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'view' | 'edit' | 'create';
  user?: MockUser | null;
  onSave?: (values: AdminUserFormValues) => void;
}

function getInitialValues(user?: MockUser | null): AdminUserFormValues {
  return {
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    linkedin: user?.linkedin ?? '',
    companyAffiliation: user?.companyAffiliation ?? '',
    role: user?.role ?? '',
    aboutMe: user?.aboutMe ?? '',
    tier: user?.tier ?? 'startup',
    enterpriseSize: (user?.enterpriseSize as EnterpriseSize) ?? null,
    advisoryHourlyRate: user?.advisoryHourlyRate != null ? String(user.advisoryHourlyRate) : '',
    isStudent: user?.isStudent ?? false,
    avatarUrl: user?.avatarUrl ?? '',
    companySize: user?.companySize ?? '',
    programId: '',
    circleId: '',
    sandbox: false,
  };
}

export function AdminUserDialog({
  open,
  onOpenChange,
  mode,
  user,
  onSave,
}: AdminUserDialogProps): JSX.Element {
  const [form, setForm] = useState<AdminUserFormValues>(getInitialValues(user));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isTestUser, setIsTestUser] = useState(false);
  const isReadOnly = mode === 'view';
  const isCreate = mode === 'create';
  const { data: programs } = usePrograms();
  const { data: cohorts } = useCohorts(form.programId || null);

  useEffect(() => {
    setForm(getInitialValues(user));
    setErrors({});
    setIsTestUser(false);
  }, [user, mode, open]);

  const updateField = (field: keyof AdminUserFormValues, value: string): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): Record<string, string> => {
    if (isTestUser || form.sandbox) return {};
    const errs: Record<string, string> = {};
    // Email is always required for all tiers
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!form.email.includes('@')) errs.email = 'Enter a valid email address';
    // CxO / Advisor profiles require name, linkedin, company, role, hourly rate
    if (form.tier === 'cxo' || form.tier === 'advisor') {
      if (!form.name.trim()) errs.name = `Name is required for ${form.tier === 'advisor' ? 'Advisor' : 'CxO'} profiles`;
      if (!form.linkedin.trim()) errs.linkedin = `LinkedIn URL is required for ${form.tier === 'advisor' ? 'Advisor' : 'CxO'} profiles`;
      if (!form.companyAffiliation.trim()) errs.companyAffiliation = `Company is required for ${form.tier === 'advisor' ? 'Advisor' : 'CxO'} profiles`;
      if (!form.role.trim()) errs.role = `Role is required for ${form.tier === 'advisor' ? 'Advisor' : 'CxO'} profiles`;
      const rate = parseFloat(form.advisoryHourlyRate);
      if (!form.advisoryHourlyRate.trim() || isNaN(rate) || rate <= 0) {
        errs.advisoryHourlyRate = 'Advisory hourly rate is required';
      }
    }
    return errs;
  };

  const handleSubmit = (): void => {
    if (isCreate) {
      const errs = validate();
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
    }
    onSave?.(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create User' : mode === 'edit' ? 'Edit User' : 'User Profile'}
          </DialogTitle>
          <DialogDescription>
            {isReadOnly
              ? 'Review the full attendee profile and linked standard-profile details.'
              : 'Update the GCXO standard profile fields below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 md:grid-cols-2">
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="user-name">Name</Label>
            <Input
              id="user-name"
              value={form.name}
              readOnly={isReadOnly}
              onChange={(e) => { updateField('name', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.name; return n; }); }}
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-email">Email</Label>
            <Input
              id="user-email"
              type="email"
              value={form.email}
              readOnly={isReadOnly}
              onChange={(e) => { updateField('email', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.email; return n; }); }}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-phone">Phone</Label>
            <Input
              id="user-phone"
              value={form.phone}
              readOnly={isReadOnly}
              onChange={(e) => updateField('phone', e.target.value)}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="user-linkedin">LinkedIn</Label>
            <Input
              id="user-linkedin"
              value={form.linkedin}
              readOnly={isReadOnly}
              onChange={(e) => { updateField('linkedin', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.linkedin; return n; }); }}
              className={errors.linkedin ? 'border-red-500' : ''}
            />
            {errors.linkedin && <p className="text-red-500 text-xs mt-1">{errors.linkedin}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-company">Company</Label>
            <Input
              id="user-company"
              value={form.companyAffiliation}
              readOnly={isReadOnly}
              onChange={(e) => { updateField('companyAffiliation', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.companyAffiliation; return n; }); }}
              className={errors.companyAffiliation ? 'border-red-500' : ''}
            />
            {errors.companyAffiliation && <p className="text-red-500 text-xs mt-1">{errors.companyAffiliation}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-role">Role</Label>
            <Input
              id="user-role"
              value={form.role}
              readOnly={isReadOnly}
              onChange={(e) => { updateField('role', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.role; return n; }); }}
              className={errors.role ? 'border-red-500' : ''}
            />
            {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-company-size">Company Size</Label>
            <select
              id="user-company-size"
              value={form.companySize}
              onChange={(e) => setForm((prev) => ({ ...prev, companySize: e.target.value }))}
              disabled={isReadOnly}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Not set</option>
              <option value="1-10">1-10</option>
              <option value="11-50">11-50</option>
              <option value="51-200">51-200</option>
              <option value="201-1000">201-1000</option>
              <option value="1000+">1000+</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="user-program">Assign to Program</Label>
            <select
              id="user-program"
              value={form.programId}
              onChange={(e) => setForm((prev) => ({ ...prev, programId: e.target.value }))}
              disabled={isReadOnly}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">No program</option>
              {(programs ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          {form.programId && (cohorts ?? []).length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="user-circle">Assign to Circle</Label>
              <select
                id="user-circle"
                value={form.circleId}
                onChange={(e) => setForm((prev) => ({ ...prev, circleId: e.target.value }))}
                disabled={isReadOnly}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">No circle</option>
                {(cohorts ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="user-tier">Tier</Label>
            <select
              id="user-tier"
              value={form.tier}
              onChange={(e) => setForm((prev) => ({ ...prev, tier: e.target.value as UserTier }))}
              disabled={isReadOnly}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="startup">Startup</option>
              <option value="cxo">CxO</option>
              <option value="advisor">Advisor</option>
              <option value="vc">VC</option>
              <option value="admin">Admin</option>
              <option value="dev">Dev</option>
            </select>
          </div>
          {(form.tier === 'cxo' || form.tier === 'advisor') && (
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="user-hourly-rate">Advisory Hourly Rate ($)</Label>
              <Input
                id="user-hourly-rate"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 250.00"
                value={form.advisoryHourlyRate}
                readOnly={isReadOnly}
                onChange={(e) => { updateField('advisoryHourlyRate', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.advisoryHourlyRate; return n; }); }}
                className={errors.advisoryHourlyRate ? 'border-red-500' : ''}
              />
              {errors.advisoryHourlyRate && <p className="text-red-500 text-xs mt-1">{errors.advisoryHourlyRate}</p>}
            </div>
          )}
          {form.tier === 'cxo' && (
            <div className="grid gap-2 md:col-span-2">
              <Label htmlFor="user-enterprise-size">Enterprise Size</Label>
              <select
                id="user-enterprise-size"
                value={form.enterpriseSize ?? '_none'}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    enterpriseSize: e.target.value === '_none' ? null : (e.target.value as EnterpriseSize),
                  }))
                }
                disabled={isReadOnly}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="_none">Not set</option>
                <option value="L">L — Large Enterprise ($200k)</option>
                <option value="M">M — Mid Enterprise ($150k)</option>
                <option value="S">S — SMB ($100k)</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="user-student"
              type="checkbox"
              checked={form.isStudent}
              disabled={isReadOnly}
              onChange={(e) => setForm((prev) => ({ ...prev, isStudent: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="user-student">Student profile</Label>
          </div>
          <div className="flex items-center gap-2 md:col-span-2">
            <input
              id="user-test"
              type="checkbox"
              checked={isTestUser}
              disabled={isReadOnly}
              onChange={(e) => { setIsTestUser(e.target.checked); if (e.target.checked) setErrors({}); }}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="user-test" className="text-amber-600">Test user (skip required fields)</Label>
          </div>
          <div className="grid gap-2 md:col-span-2">
            <ImageUpload
              label="Profile Photo"
              value={form.avatarUrl}
              onChange={(v) => updateField('avatarUrl', v)}
              placeholder="Paste image URL or upload photo..."
              folder="avatars"
              previewHeight="h-16"
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <Label htmlFor="user-about">About Me</Label>
            <Textarea
              id="user-about"
              rows={4}
              value={form.aboutMe}
              readOnly={isReadOnly}
              onChange={(e) => { updateField('aboutMe', e.target.value); setErrors((prev) => { const n = {...prev}; delete n.aboutMe; return n; }); }}
              className={errors.aboutMe ? 'border-red-500' : ''}
            />
            {errors.aboutMe && <p className="text-red-500 text-xs mt-1">{errors.aboutMe}</p>}
          </div>
        </div>

        {isCreate && (
          <SandboxToggle
            checked={form.sandbox}
            onChange={(v) => setForm((prev) => ({ ...prev, sandbox: v }))}
            className="mt-2"
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!isReadOnly && (
            <Button onClick={handleSubmit}>{isCreate ? 'Create User' : 'Save Changes'}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
