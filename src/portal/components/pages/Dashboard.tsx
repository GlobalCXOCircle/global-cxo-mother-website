import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Globe,
  MessageSquare,
  PlusCircle,
  Shield,
  Star,
  Users,
  Video,
} from 'lucide-react';

import { useAuth } from '@/portal/hooks/useAuth';
import { useCanSeeFinancials } from '@/portal/hooks/useFinancialAccess';
import { useMyMeetings } from '@/portal/hooks/useMyMeetings';
import { useMyProgram } from '@/portal/hooks/usePrograms';
import type { UserTier, RegistrationStatus } from '@/portal/data/mock/types';
import { SessionInviteDialog } from '@/portal/components/SessionInviteDialog';
import type { Partner, CurrentUser } from '@/portal/components/SessionInviteDialog';
import SessionFeedbackDialog from '@/portal/components/SessionFeedbackDialog';
import type { CompletedMeeting } from '@/portal/components/SessionFeedbackDialog';
import FeedbackViewDialog from '@/portal/components/FeedbackViewDialog';
import type { PartnerFeedback } from '@/portal/components/FeedbackViewDialog';
import BackendConnectionAlert from '@/portal/components/BackendConnectionAlert';
import FirstLoginWalkthrough from '@/portal/components/FirstLoginWalkthrough';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';
import { Badge } from '@/portal/components/ui/badge';
import { Button } from '@/portal/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/portal/components/ui/dialog';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { Separator } from '@/portal/components/ui/separator';
import { Textarea } from '@/portal/components/ui/textarea';

import { openManageCalendar } from '@/portal/lib/calcomBridge';

const TIER_STYLES: Record<UserTier, string> = {
  startup: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  cxo: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  vc: 'bg-green-100 text-green-700 hover:bg-green-100',
  admin: 'bg-orange-100 text-orange-700 hover:bg-orange-100',
  advisor: 'bg-teal-100 text-teal-700 hover:bg-teal-100',
  dev: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const COHORT_BADGE_STYLE = 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100';

const STATUS_STYLES: Record<RegistrationStatus, string> = {
  confirmed: 'bg-green-100 text-green-700 hover:bg-green-100',
  pending: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
  cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
};

const REQUEST_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ProfileField({ label, value }: { label: string; value: string }): React.ReactElement {
  const isLink = Boolean(value && (value.startsWith('http://') || value.startsWith('https://')));
  const isLinkedIn = label.toLowerCase().includes('linkedin');

  const getDisplayLinkText = () => {
    if (isLinkedIn) return 'View LinkedIn Profile';
    if (label.toLowerCase().includes('website') || label.toLowerCase().includes('url')) return 'Visit Website';
    return 'Click here';
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      {isLink ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-blue-600 hover:text-blue-800 underline underline-offset-4 decoration-blue-300 hover:decoration-blue-600 inline-flex items-center gap-1.5 transition-colors w-fit"
        >
          <span>{getDisplayLinkText()}</span>
          <ExternalLink size={13} className="shrink-0 opacity-70" />
        </a>
      ) : (
        <span className="text-sm text-gray-800 font-medium break-words">{value?.trim() || '—'}</span>
      )}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const {
    user,
    useApiAuth,
    backendCatalogWarning,
    events,
    updateProfile,
    getUserRegistrations,
    getLinkedStartup,
    getStartupMembers,
    restoreRegistration,
    unregisterFromEvent,
  } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestTopic, setRequestTopic] = useState('');
  const [requestSlot, setRequestSlot] = useState('');
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);
  const [noteTexts, setNoteTexts] = useState<Record<string, string>>({});
  const [outcomeTexts, setOutcomeTexts] = useState<Record<string, string>>({});
  const [feedbackMeetingId, setFeedbackMeetingId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackFulfilling, setFeedbackFulfilling] = useState<boolean | null>(null);
  const [feedbackWhyText, setFeedbackWhyText] = useState('');
  const [feedbackReportIssue, setFeedbackReportIssue] = useState(false);
  const [feedbackIssueText, setFeedbackIssueText] = useState('');
  const [sessionFilter, setSessionFilter] = useState<'scheduled' | 'completed'>('scheduled');

  const {
    meetings,
    requests: meetingRequests,
    loading: sessionsLoading,
    error: sessionsError,
    refetch: refetchSessions,
    createRequest,
    addNote,
    saveOutcome,
  } = useMyMeetings();

  // ── Program enrollment lookup for "View Program Dashboard" link ──
  // Uses the non-admin GET /programs/me endpoint so it works for every user
  // (startups, CxOs, admins). The old flow queried admin-gated endpoints
  // which silently returned empty arrays for non-admins, so the badge and
  // "View Program Dashboard" button never appeared.
  const { data: myProgramContext, isLoading: programLoading } = useMyProgram();
  const primaryProgram = myProgramContext?.program ?? null;
  const myProgramEnrollment = myProgramContext?.enrollment ?? null;
  const hasActiveProgramEnrollment =
    !!myProgramEnrollment && myProgramEnrollment.status !== 'withdrawn';
  // Financial info visibility — only startup managers (+ admin/dev) see
  // pricing tier names and anything that implies cost.
  const canSeeFinancials = useCanSeeFinancials();

  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone,
    linkedin: user.linkedin,
    companyAffiliation: user.companyAffiliation,
    role: user.role,
    aboutMe: user.aboutMe,
  });

  useEffect(() => {
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone,
      linkedin: user.linkedin,
      companyAffiliation: user.companyAffiliation,
      role: user.role,
      aboutMe: user.aboutMe,
    });
  }, [user]);

  const userRegistrations = getUserRegistrations();
  const linkedStartup = getLinkedStartup();
  const startupMemberCount = linkedStartup ? getStartupMembers(linkedStartup.id).length : 0;

  const handleFormChange = (field: string, value: string): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = (): void => {
    updateProfile(formData);
    toast.success('Profile updated');
    setEditOpen(false);
  };

  const handleRequestSession = async (): Promise<void> => {
    if (!requestTopic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    try {
      const proposedSlots = requestSlot
        ? [{ starts_at: new Date(requestSlot).toISOString() }]
        : [];
      await createRequest(requestTopic.trim(), proposedSlots);
      toast.success('Session request submitted');
      setRequestTopic('');
      setRequestSlot('');
      setRequestOpen(false);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit request');
    }
  };

  const handleAddNote = async (meetingId: string): Promise<void> => {
    const text = noteTexts[meetingId]?.trim();
    if (!text) return;
    try {
      await addNote(meetingId, text);
      setNoteTexts((prev) => ({ ...prev, [meetingId]: '' }));
      toast.success('Note added');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add note');
    }
  };

  const handleSaveOutcome = async (meetingId: string): Promise<void> => {
    const text = outcomeTexts[meetingId]?.trim();
    if (!text) return;
    try {
      await saveOutcome(meetingId, text);
      toast.success('Outcome saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save outcome');
    }
  };

  const resolveEvent = (eventId: string): { title: string; date: string; slug: string } | undefined => {
    const event = events.find((e) => e.slug === eventId);
    if (!event) return undefined;
    return { title: event.title, date: event.date, slug: event.slug };
  };

  return (
    <div className="min-h-screen">
      <FirstLoginWalkthrough />
      <section className="pt-24 pb-10 bg-gradient-to-br from-bg-dark via-white to-bg-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-dark mb-2">Dashboard</h1>
          <p className="text-gray-600 text-lg">Manage your profile, events, and startup.</p>
        </div>
      </section>

      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {useApiAuth && backendCatalogWarning && (user.tier === 'admin' || user.tier === 'dev') && (
            <div className="mb-6">
              <BackendConnectionAlert warning={backendCatalogWarning} />
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column — Profile Card */}
            <div className="lg:col-span-1">
              <Card className="sticky top-28">
                <CardContent className="pt-8 pb-6 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-full bg-navy-600 text-white flex items-center justify-center text-2xl font-bold mb-4">
                    {getInitials(user.name)}
                  </div>
                  <h2 className="text-xl font-bold text-navy-dark">{user.name}</h2>
                  <Badge className={`mt-2 ${TIER_STYLES[user.tier]}`}>
                    {user.tier.toUpperCase()}
                  </Badge>
                  {programLoading && !myProgramContext && (
                    <div className="mt-2 h-5 w-36 rounded-full bg-slate-200 animate-pulse" />
                  )}
                  {hasActiveProgramEnrollment && primaryProgram && (
                    <div className="mt-2 space-y-1 flex flex-col items-center">
                      <Badge className={COHORT_BADGE_STYLE}>
                        {primaryProgram.name}
                        {canSeeFinancials && myProgramEnrollment?.pricing_tier
                          ? ` · ${myProgramEnrollment.pricing_tier}`
                          : ''}
                      </Badge>
                      <span className="text-[10px] text-gray-400">
                        {user.tier === 'startup'
                          ? '$10K + 0.25% equity membership'
                          : user.tier === 'cxo'
                            ? '$500–$2,000/hr consulting'
                            : 'Complimentary membership'}
                      </span>
                    </div>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Member since {formatDate(user.createdAt)}
                  </p>

                  <Separator className="my-5 w-full" />

                  <div className="w-full space-y-4 text-left">
                    <ProfileField label="Email" value={user.email} />
                    <ProfileField label="Phone" value={user.phone} />
                    <ProfileField label="LinkedIn" value={user.linkedin} />
                    <ProfileField label="Company" value={user.companyAffiliation} />
                    <ProfileField label="Role" value={user.role} />
                    <ProfileField label="About Me" value={user.aboutMe} />
                  </div>

                  <Separator className="my-5 w-full" />

                  {/* Action cluster: stacked, icon-first, consistent sizing */}
                  <div className="w-full space-y-2">
                    <Dialog open={editOpen} onOpenChange={setEditOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start gap-2 h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                          Edit Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                              id="edit-name"
                              value={formData.name}
                              onChange={(e) => handleFormChange('name', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                              id="edit-email"
                              type="email"
                              value={formData.email}
                              onChange={(e) => handleFormChange('email', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-phone">Phone</Label>
                            <Input
                              id="edit-phone"
                              value={formData.phone}
                              onChange={(e) => handleFormChange('phone', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-linkedin">LinkedIn</Label>
                            <Input
                              id="edit-linkedin"
                              value={formData.linkedin}
                              onChange={(e) => handleFormChange('linkedin', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-company">Company</Label>
                            <Input
                              id="edit-company"
                              value={formData.companyAffiliation}
                              onChange={(e) => handleFormChange('companyAffiliation', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Input
                              id="edit-role"
                              value={formData.role}
                              onChange={(e) => handleFormChange('role', e.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="edit-about">About Me</Label>
                            <Textarea
                              id="edit-about"
                              rows={4}
                              value={formData.aboutMe}
                              onChange={(e) => handleFormChange('aboutMe', e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-3">
                          <Button variant="ghost" onClick={() => setEditOpen(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleSaveProfile}>Save</Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {hasActiveProgramEnrollment && (
                      <Button
                        variant="outline"
                        className="w-full justify-start gap-2 h-10 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        onClick={() => void openManageCalendar()}
                      >
                        <Calendar className="h-4 w-4" />
                        <span className="flex-1 text-left">Manage Calendar</span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    )}

                    {(user.tier === 'admin' || user.tier === 'dev') && (
                      <Button
                        asChild
                        className="w-full justify-start gap-2 h-10 bg-navy-700 hover:bg-navy-800 shadow-sm"
                      >
                        <Link to="/admin">
                          <Shield className="h-4 w-4" />
                          <span className="flex-1 text-left">Open Admin Dashboard</span>
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* My Events */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <CalendarDays size={20} />
                    <span>My Events</span>
                    {userRegistrations.length > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs font-normal">
                        {userRegistrations.length}
                      </Badge>
                    )}
                  </CardTitle>
                  <Button asChild variant="outline" size="sm" className="h-8 text-xs font-medium">
                    <Link to="/events">Browse Events</Link>
                  </Button>
                </CardHeader>
                <CardContent className={userRegistrations.length === 0 ? 'pt-0 pb-4' : 'pt-1'}>
                  {userRegistrations.length === 0 ? (
                    <p className="text-sm text-gray-500 py-1">
                      You haven&apos;t registered for any events yet.
                    </p>
                  ) : (
                    <div className="divide-y">
                      {userRegistrations.map((reg) => {
                        const event = resolveEvent(reg.eventId);
                        return (
                          <div
                            key={reg.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-navy-dark truncate">
                                {event?.title ?? reg.eventId}
                              </p>
                              <p className="text-sm text-gray-500">
                                {event?.date ?? 'Date TBD'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <Badge className={STATUS_STYLES[reg.status]}>
                                {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                              </Badge>
                              {event && (
                                <>
                                  <Button asChild variant="ghost" size="sm">
                                    <Link to={`/events/${event.slug}`}>View Event</Link>
                                  </Button>
                                  {reg.status !== 'cancelled' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const result = unregisterFromEvent(event.slug, user.id);
                                        if (result.success) {
                                          toast.success(result.message);
                                        } else {
                                          toast.info(result.message);
                                        }
                                      }}
                                    >
                                      Unregister
                                    </Button>
                                  )}
                                  {reg.status === 'cancelled' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const result = restoreRegistration(event.slug, user.id);
                                        if (result.success) {
                                          toast.success(result.message);
                                        } else {
                                          toast.info(result.message);
                                        }
                                      }}
                                    >
                                      Restore
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Program Dashboard — skeleton while loading, real card when enrolled */}
              {programLoading && !myProgramContext && (
                <Card className="overflow-hidden border-slate-200 shadow-sm">
                  <div className="border-b border-slate-100 px-6 py-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-200 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                        <div className="h-5 w-48 rounded bg-slate-200 animate-pulse" />
                      </div>
                      <div className="h-5 w-16 rounded-full bg-slate-200 animate-pulse" />
                    </div>
                  </div>
                  <div className="px-6 py-5 space-y-3">
                    <div className="flex gap-3">
                      <div className="h-3 w-20 rounded bg-slate-200 animate-pulse" />
                      <div className="h-3 w-28 rounded bg-slate-200 animate-pulse" />
                    </div>
                    <div className="h-10 w-full rounded-md bg-slate-200 animate-pulse" />
                  </div>
                </Card>
              )}
              {hasActiveProgramEnrollment && primaryProgram && (
                <Card className="overflow-hidden border-indigo-100 shadow-sm">
                  {/* Gradient header strip, echoes the brand accent */}
                  <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-cyan-50 border-b border-indigo-100 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-indigo-100">
                          <Users size={18} className="text-indigo-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                            Active Program
                          </p>
                          <h3 className="mt-0.5 text-lg font-bold text-navy-dark leading-tight truncate">
                            {primaryProgram.name}
                          </h3>
                        </div>
                      </div>
                      <Badge
                        className={`shrink-0 ${
                          TIER_STYLES[
                            (myProgramEnrollment?.role === 'cxo' ? 'cxo' : 'startup') as UserTier
                          ]
                        }`}
                      >
                        {myProgramEnrollment?.role === 'cxo' ? 'CxO' : 'Startup'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        <span className="capitalize">{primaryProgram.status}</span>
                      </div>
                      {canSeeFinancials && myProgramEnrollment?.pricing_tier && (
                        <>
                          <span className="text-slate-300">·</span>
                          <span>
                            <span className="font-medium text-slate-900">
                              {myProgramEnrollment.pricing_tier}
                            </span>{' '}
                            tier
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">
                            {user.tier === 'startup'
                              ? '10 hrs included'
                              : user.tier === 'cxo'
                                ? '$500–$2K/hr'
                                : ''}
                          </span>
                        </>
                      )}
                    </div>
                    <Button
                      asChild
                      className="w-full bg-navy-700 hover:bg-navy-800 shadow-sm"
                    >
                      <Link to="/program-dashboard" className="flex items-center justify-center gap-2">
                        View Program Dashboard
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* My Sessions — skeleton while loading, real card when enrolled */}
              {programLoading && !myProgramContext && (
                <Card>
                  <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
                      <div className="h-8 w-28 rounded-md bg-slate-200 animate-pulse" />
                    </div>
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="rounded-md border border-slate-100 p-3 space-y-2" style={{ opacity: Math.max(0.4, 1 - i * 0.2) }}>
                        <div className="flex items-center justify-between">
                          <div className="h-3 w-40 rounded bg-slate-200 animate-pulse" />
                          <div className="h-4 w-16 rounded-full bg-slate-200 animate-pulse" />
                        </div>
                        <div className="h-3 w-24 rounded bg-slate-200 animate-pulse" />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {hasActiveProgramEnrollment && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare size={20} />
                      My Sessions
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {sessionsLoading && (
                    <p className="text-sm text-gray-500 py-4 text-center">Loading sessions...</p>
                  )}
                  {sessionsError && (
                    <p className="text-sm text-red-500 py-4 text-center">{sessionsError}</p>
                  )}

                  {/* Pending Meeting Requests */}
                  {meetingRequests.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
                        <Clock size={14} />
                        Pending Requests
                      </h3>
                      <div className="divide-y">
                        {meetingRequests.map((req) => (
                          <div
                            key={req.id}
                            className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-navy-dark text-sm truncate">
                                {req.topic}
                              </p>
                              <p className="text-xs text-gray-500">
                                Requested {formatDateTime(req.created_at)}
                              </p>
                            </div>
                            <Badge className={REQUEST_STATUS_STYLES[req.status] ?? 'bg-gray-100 text-gray-700'}>
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sessions with toggle */}
                  {meetings.length > 0 ? (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                          <CalendarDays size={14} />
                          {sessionFilter === 'scheduled' ? 'Scheduled' : 'Completed'} Sessions
                        </h3>
                        <div className="flex rounded-md border overflow-hidden text-xs">
                          <button
                            type="button"
                            className={`px-3 py-1 ${sessionFilter === 'scheduled' ? 'bg-navy-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            onClick={() => setSessionFilter('scheduled')}
                          >
                            Scheduled
                          </button>
                          <button
                            type="button"
                            className={`px-3 py-1 ${sessionFilter === 'completed' ? 'bg-navy-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                            onClick={() => setSessionFilter('completed')}
                          >
                            Completed
                          </button>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {meetings.filter((m) => sessionFilter === 'completed' ? m.status === 'completed' : m.status !== 'completed').length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            No {sessionFilter} sessions.
                          </p>
                        ) : null}
                        {meetings.filter((m) => sessionFilter === 'completed' ? m.status === 'completed' : m.status !== 'completed').map((meeting) => {
                          const isExpanded = expandedMeeting === meeting.id;
                          const startDate = new Date(meeting.starts_at);
                          const endDate = new Date(meeting.ends_at);
                          const durationMin = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
                          const durationLabel = durationMin >= 60 ? `${(durationMin / 60).toFixed(1)}h` : `${durationMin}m`;
                          const joinUrl = meeting.teams_join_url ?? meeting.location ?? null;
                          const isCompleted = meeting.status === 'completed';
                          const isCancelled = meeting.status === 'cancelled';
                          const statusColor = isCompleted
                            ? 'bg-green-100 text-green-700'
                            : isCancelled
                              ? 'bg-red-100 text-red-700'
                              : 'bg-blue-100 text-blue-700';
                          const hasFeedback = meeting.feedback && meeting.feedback.length > 0;
                          const myFeedback = meeting.feedback?.find((f) => f.user_id === user.id);
                          const showFeedbackForm = feedbackMeetingId === meeting.id;

                          return (
                            <div
                              key={meeting.id}
                              className={`border rounded-lg overflow-hidden ${isCancelled ? 'opacity-60' : ''}`}
                            >
                              <button
                                type="button"
                                className="w-full flex items-center justify-between text-left p-4"
                                onClick={() =>
                                  setExpandedMeeting(isExpanded ? null : meeting.id)
                                }
                              >
                                <div className="min-w-0 flex-1">
                                  {/* Title */}
                                  <p className="font-semibold text-navy-dark text-sm leading-tight">
                                    {meeting.title ?? 'Advisory Session'}
                                  </p>

                                  {/* Date/time + duration */}
                                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                    <Clock size={12} />
                                    <span>
                                      {formatDateTime(meeting.starts_at)} &mdash;{' '}
                                      {endDate.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                      })}
                                    </span>
                                    <span className="text-gray-300">|</span>
                                    <span>{durationLabel}</span>
                                  </div>

                                  {/* Participants */}
                                  {meeting.participants && meeting.participants.length > 0 && (
                                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-600">
                                      <Users size={12} className="shrink-0" />
                                      <span className="truncate">
                                        {meeting.participants
                                          .map((p) => p.display_name ?? p.email_redacted ?? 'Unknown')
                                          .join(', ')}
                                      </span>
                                    </div>
                                  )}

                                  {/* Status badge + join link row */}
                                  <div className="flex items-center gap-2 mt-2">
                                    <Badge className={`text-xs capitalize ${statusColor}`}>
                                      {meeting.status}
                                    </Badge>
                                    {meeting.cohort_name && (
                                      <Badge className="text-xs bg-indigo-100 text-indigo-700">
                                        {meeting.cohort_name}
                                      </Badge>
                                    )}
                                    {joinUrl && !isCancelled && (
                                      <a
                                        href={joinUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <Video size={12} />
                                        Join Meeting
                                      </a>
                                    )}
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronUp size={16} className="text-gray-400 shrink-0 ml-2" />
                                ) : (
                                  <ChevronDown size={16} className="text-gray-400 shrink-0 ml-2" />
                                )}
                              </button>

                              {isExpanded && (
                                <div className="px-4 pb-4 space-y-4 border-t pt-4">
                                  {/* Action items */}
                                  {meeting.action_items && meeting.action_items.length > 0 && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                        Action Items
                                      </h4>
                                      <div className="space-y-1.5">
                                        {meeting.action_items.map((item) => (
                                          <div
                                            key={item.id}
                                            className="flex items-start gap-2 text-sm"
                                          >
                                            <CheckCircle2
                                              size={14}
                                              className={`mt-0.5 shrink-0 ${item.status === 'done' ? 'text-green-500' : 'text-gray-300'}`}
                                            />
                                            <span className={item.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}>
                                              {item.title}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Feedback section — completed meetings */}
                                  {isCompleted && (
                                    <div>
                                      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                        Feedback
                                      </h4>
                                      {myFeedback ? (
                                        <div className="bg-green-50 border border-green-100 rounded-md p-3 text-sm">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className="flex gap-0.5">
                                              {[1, 2, 3, 4, 5].map((s) => (
                                                <Star
                                                  key={s}
                                                  size={14}
                                                  className={s <= myFeedback.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                                                />
                                              ))}
                                            </div>
                                            <span className="text-xs text-gray-500">
                                              Submitted {formatDate(myFeedback.submitted_at)}
                                            </span>
                                          </div>
                                          {myFeedback.comment && (
                                            <p className="text-gray-700 text-sm mt-1">{myFeedback.comment}</p>
                                          )}
                                        </div>
                                      ) : showFeedbackForm ? (
                                        <div className="bg-gray-50 border rounded-md p-4 space-y-4">
                                          {/* Star rating */}
                                          <div>
                                            <p className="text-xs font-medium text-gray-600 mb-1.5">Overall Rating</p>
                                            <div className="flex gap-1">
                                              {[1, 2, 3, 4, 5].map((s) => (
                                                <button
                                                  key={s}
                                                  type="button"
                                                  onClick={() => setFeedbackRating(s)}
                                                  className="focus:outline-none"
                                                >
                                                  <Star
                                                    size={24}
                                                    className={s <= feedbackRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                                                  />
                                                </button>
                                              ))}
                                            </div>
                                          </div>

                                          {/* Was this session fulfilling? */}
                                          <div>
                                            <p className="text-xs font-medium text-gray-600 mb-1.5">Was this session fulfilling?</p>
                                            <div className="flex gap-2">
                                              <button
                                                type="button"
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${feedbackFulfilling === true ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                onClick={() => setFeedbackFulfilling(true)}
                                              >
                                                Yes
                                              </button>
                                              <button
                                                type="button"
                                                className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${feedbackFulfilling === false ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                onClick={() => setFeedbackFulfilling(false)}
                                              >
                                                No
                                              </button>
                                            </div>
                                          </div>

                                          {/* Why / Why not — always shown once answered */}
                                          {feedbackFulfilling !== null && (
                                            <div>
                                              <p className="text-xs font-medium text-gray-600 mb-1.5">
                                                {feedbackFulfilling ? 'Why was it fulfilling?' : 'Why wasn\'t it fulfilling?'}
                                              </p>
                                              <Textarea
                                                rows={2}
                                                placeholder={feedbackFulfilling ? 'What made it valuable?' : 'What could have been better?'}
                                                className="text-sm"
                                                value={feedbackWhyText}
                                                onChange={(e) => setFeedbackWhyText(e.target.value)}
                                              />
                                            </div>
                                          )}

                                          {/* Additional comments */}
                                          <div>
                                            <p className="text-xs font-medium text-gray-600 mb-1.5">Additional Comments</p>
                                            <Textarea
                                              rows={2}
                                              placeholder="Anything else to share..."
                                              className="text-sm"
                                              value={feedbackComment}
                                              onChange={(e) => setFeedbackComment(e.target.value)}
                                            />
                                          </div>

                                          {/* Report issue — alarm button */}
                                          <div className="border-t pt-3">
                                            <button
                                              type="button"
                                              className={`flex items-center gap-2 text-xs font-medium transition-colors ${feedbackReportIssue ? 'text-red-600' : 'text-gray-400 hover:text-red-500'}`}
                                              onClick={() => setFeedbackReportIssue(!feedbackReportIssue)}
                                            >
                                              <AlertTriangle size={14} />
                                              Report an Issue (escalates to admin)
                                            </button>
                                            {feedbackReportIssue && (
                                              <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-3">
                                                <p className="text-xs text-red-600 mb-1.5">Describe the issue — this will be reviewed by an admin.</p>
                                                <Textarea
                                                  rows={2}
                                                  placeholder="What went wrong?"
                                                  className="text-sm border-red-200"
                                                  value={feedbackIssueText}
                                                  onChange={(e) => setFeedbackIssueText(e.target.value)}
                                                />
                                              </div>
                                            )}
                                          </div>

                                          {/* Actions */}
                                          <div className="flex gap-2 justify-end pt-1">
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              onClick={() => {
                                                setFeedbackMeetingId(null);
                                                setFeedbackRating(0);
                                                setFeedbackComment('');
                                                setFeedbackFulfilling(null);
                                                setFeedbackWhyText('');
                                                setFeedbackReportIssue(false);
                                                setFeedbackIssueText('');
                                              }}
                                            >
                                              Cancel
                                            </Button>
                                            <Button
                                              size="sm"
                                              disabled={feedbackRating === 0}
                                              onClick={() => {
                                                const comment = [
                                                  feedbackComment,
                                                  feedbackFulfilling !== null
                                                    ? `[${feedbackFulfilling ? 'Fulfilling' : 'Not fulfilling'}] ${feedbackWhyText}`
                                                    : '',
                                                ].filter(Boolean).join('\n');
                                                console.log('Session feedback:', {
                                                  meetingId: meeting.id,
                                                  rating: feedbackRating,
                                                  comment,
                                                  something_wrong: feedbackReportIssue,
                                                  wrong_description: feedbackIssueText || undefined,
                                                });
                                                toast.success('Feedback submitted!');
                                                setFeedbackMeetingId(null);
                                                setFeedbackRating(0);
                                                setFeedbackComment('');
                                                setFeedbackFulfilling(null);
                                                setFeedbackWhyText('');
                                                setFeedbackReportIssue(false);
                                                setFeedbackIssueText('');
                                              }}
                                            >
                                              Submit Feedback
                                            </Button>
                                          </div>
                                        </div>
                                      ) : (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setFeedbackMeetingId(meeting.id)}
                                        >
                                          <Star size={14} className="mr-1" />
                                          Leave Feedback
                                        </Button>
                                      )}
                                    </div>
                                  )}

                                  {/* Notes */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                      Notes
                                    </h4>
                                    {meeting.notes && meeting.notes.length > 0 ? (
                                      <div className="space-y-2 mb-3">
                                        {meeting.notes.map((note) => (
                                          <div
                                            key={note.id}
                                            className="bg-gray-50 rounded p-2 text-sm text-gray-700"
                                          >
                                            <p>{note.body}</p>
                                            <p className="text-xs text-gray-400 mt-1">
                                              {formatDateTime(note.created_at)}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-gray-400 mb-2">No notes yet.</p>
                                    )}
                                    <div className="flex gap-2">
                                      <Textarea
                                        rows={2}
                                        placeholder="Add a note..."
                                        className="text-sm"
                                        value={noteTexts[meeting.id] ?? ''}
                                        onChange={(e) =>
                                          setNoteTexts((prev) => ({
                                            ...prev,
                                            [meeting.id]: e.target.value,
                                          }))
                                        }
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 self-end"
                                        onClick={() => void handleAddNote(meeting.id)}
                                      >
                                        Add
                                      </Button>
                                    </div>
                                  </div>

                                  {/* Outcome */}
                                  <div>
                                    <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                                      Outcome Summary
                                    </h4>
                                    <div className="flex gap-2">
                                      <Textarea
                                        rows={2}
                                        placeholder="Summarize the outcome..."
                                        className="text-sm"
                                        value={
                                          outcomeTexts[meeting.id] ??
                                          meeting.outcome?.summary ??
                                          ''
                                        }
                                        onChange={(e) =>
                                          setOutcomeTexts((prev) => ({
                                            ...prev,
                                            [meeting.id]: e.target.value,
                                          }))
                                        }
                                      />
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="shrink-0 self-end"
                                        onClick={() => void handleSaveOutcome(meeting.id)}
                                      >
                                        Save
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    !sessionsLoading &&
                    meetingRequests.length === 0 && (
                      <p className="text-sm text-gray-500 py-1">
                        No sessions yet. Request one to get started.
                      </p>
                    )
                  )}
                </CardContent>
              </Card>
              )}

              {/* My Startup — only for startup tier */}
              {user.tier === 'startup' && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                    <CardTitle className="flex items-center gap-2">
                      <Globe size={20} />
                      <span>My Startup</span>
                    </CardTitle>
                    {!linkedStartup && (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs font-medium"
                      >
                        <Link to="/startup-profile" className="flex items-center gap-1.5">
                          <PlusCircle size={14} />
                          Create Profile
                        </Link>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className={!linkedStartup ? 'pt-0 pb-4' : 'pt-1'}>
                    {!linkedStartup ? (
                      <p className="text-sm text-gray-500 py-1">
                        You haven&apos;t linked to a startup yet.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-lg font-semibold text-navy-dark">
                            {linkedStartup.companyName}
                          </h3>
                          <a
                            href={linkedStartup.companyWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {linkedStartup.companyWebsite}
                            <ExternalLink size={12} />
                          </a>
                        </div>
                        <p className="text-sm text-gray-500">
                          Domain: {linkedStartup.companyDomain}
                        </p>
                        <p className="text-sm text-gray-700 line-clamp-3">
                          {linkedStartup.description}
                        </p>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users size={14} />
                          <span>{startupMemberCount} member{startupMemberCount !== 1 ? 's' : ''} linked</span>
                        </div>
                        <Button asChild variant="outline">
                          <Link to="/startup-profile">View Startup Profile</Link>
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
