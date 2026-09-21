import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Users, Building2, ArrowRight, Mail, Send, FileEdit, AlertTriangle, MessageCircle, Check, Eye, ExternalLink } from 'lucide-react';
import { ActivityLogPanel } from './ActivityLogPanel';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/portal/components/ui/dialog';
import { Button } from '@/portal/components/ui/button';
import { Badge } from '@/portal/components/ui/badge';
import { Textarea } from '@/portal/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/portal/components/ui/select';
import FadedScroll from '@/portal/components/ui/faded-scroll';
import { DashboardSkeleton, SkeletonBlock } from '@/portal/components/ui/admin-skeletons';
import { apiFetch } from '@/portal/api/client';
import { USE_API_AUTH } from '@/portal/api/config';
import { useAuth } from '@/portal/hooks/useAuth';
import { useOpsData } from '@/portal/hooks/useOpsData';
import { lifecycleBadgeClass, resolveEventLifecycle } from '@/portal/lib/eventLifecycle';
import { listEmailQueueApi, flushEmailQueueApi, type EmailQueueEntry } from '@/portal/api/ops';
import { toast } from 'sonner';
import type { EventLifecycleStatus } from '@/portal/data/EventsData';

export default function AdminDashboard(): JSX.Element {
  const { user, events, users, registrations, startups, updateEvent, catalogHydrated } = useAuth();
  const { tasks, onboardingCases, loading: opsLoading, error: opsError } = useOpsData(user.tier);

  // Show the full-page shell skeleton only on the very first paint, before
  // the catalog has hydrated at all. If a user navigates back to the
  // dashboard after data is already cached, the real content renders
  // immediately — we don't want to flash a skeleton in the "hot" case.
  const showDashboardSkeleton = !catalogHydrated && events.length === 0 && users.length === 0;
  const confirmedCount = registrations.filter((r) => r.status === 'confirmed').length;

  // --- Email queue state ---
  const [emailQueue, setEmailQueue] = useState<EmailQueueEntry[]>([]);
  const [emailQueueLoading, setEmailQueueLoading] = useState(false);
  const [emailQueueError, setEmailQueueError] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);
  const [showAllEmailQueue, setShowAllEmailQueue] = useState(false);

  const fetchEmailQueue = useCallback(async () => {
    if (!USE_API_AUTH) return;
    setEmailQueueLoading(true);
    setEmailQueueError(null);
    try {
      const entries = await listEmailQueueApi();
      setEmailQueue(entries);
    } catch (err) {
      setEmailQueueError(err instanceof Error ? err.message : 'Failed to load email queue');
    } finally {
      setEmailQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEmailQueue();
  }, [fetchEmailQueue]);

  const handleFlushQueue = useCallback(async () => {
    if (flushing) return; // prevent double-click
    setFlushing(true);
    try {
      const result = await flushEmailQueueApi();
      toast.success(
        `Processed ${result.attempted} email(s): ${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`,
      );
      await fetchEmailQueue();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flush email queue');
    } finally {
      setFlushing(false);
    }
  }, [flushing, fetchEmailQueue]);

  const { data: alertCounts } = useQuery({
    queryKey: ['admin', 'alert-counts'],
    queryFn: async () => {
      try {
        const [intentRes, membershipRes] = await Promise.all([
          apiFetch<any[]>('/admin/intent-requests?status_filter=pending'),
          apiFetch<any[]>('/admin/membership-requests?status_filter=pending'),
        ]);
        return {
          pendingIntents: intentRes.length,
          pendingMemberships: membershipRes.length,
        };
      } catch {
        return { pendingIntents: 0, pendingMemberships: 0 };
      }
    },
    staleTime: 60_000,
    enabled: USE_API_AUTH,
  });
  const pendingIntents = alertCounts?.pendingIntents ?? 0;
  const pendingMemberships = alertCounts?.pendingMemberships ?? 0;

  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'new' | 'reviewed'>('all');
  const [updatingFeedbackId, setUpdatingFeedbackId] = useState<string | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');

  const { data: feedbackList = [], refetch: refetchFeedback } = useQuery({
    queryKey: ['admin', 'feedback'],
    queryFn: () => apiFetch<any[]>('/admin/feedback?limit=50'),
    staleTime: 30_000,
    enabled: USE_API_AUTH,
  });

  const handleUpdateFeedbackStatus = async (fbId: string, newStatus: string, adminNotes?: string) => {
    setUpdatingFeedbackId(fbId);
    try {
      await apiFetch(`/admin/feedback/${fbId}`, {
        method: 'PATCH',
        body: {
          status: newStatus,
          ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}),
        },
      });
      toast.success(newStatus === 'reviewed' ? 'Feedback marked as noted' : 'Feedback updated');
      await refetchFeedback();
      if (selectedFeedback && selectedFeedback.id === fbId) {
        setSelectedFeedback((prev: any) =>
          prev ? { ...prev, status: newStatus, ...(adminNotes !== undefined ? { admin_notes: adminNotes } : {}) } : null
        );
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update feedback');
    } finally {
      setUpdatingFeedbackId(null);
    }
  };

  const newFeedbackCount = feedbackList.filter((fb: any) => fb.status === 'new').length;
  const notedFeedbackCount = feedbackList.filter((fb: any) => fb.status !== 'new').length;
  const filteredFeedback = feedbackList.filter((fb: any) => {
    if (feedbackFilter === 'new') return fb.status === 'new';
    if (feedbackFilter === 'reviewed') return fb.status !== 'new';
    return true;
  });

  const retryableCount = emailQueue.filter((e) => e.status !== 'sent').length;

  const stats = [
    {
      label: 'Total Events',
      value: events.length,
      icon: Calendar,
      color: 'text-blue-600 bg-blue-100',
      sub: { label: 'Active registrations', value: confirmedCount },
    },
    {
      label: 'Total Members',
      value: users.length,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-100',
      sub: null,
    },
    {
      label: 'Startups',
      value: startups.length,
      icon: Building2,
      color: 'text-purple-600 bg-purple-100',
      sub: null,
    },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="text-slate-500">
              Here's an overview of the Global CXO platform.
            </p>
          </div>
          <Button asChild className="gap-2 text-white">
            <Link to="/admin/events/new">
              <Calendar className="h-4 w-4" />
              Create Event
            </Link>
          </Button>
        </div>
      </div>

      {/* Skeleton shell on first load — the header above renders
          synchronously, but the stats / events / queue panels below all
          depend on the catalog, which hasn't hydrated yet. Swap in the
          `DashboardSkeleton` to reserve the layout instead of flashing
          zeros in the stat counters and "No events yet" in the list. */}
      {showDashboardSkeleton ? (
        <DashboardSkeleton />
      ) : (
      <>
      {/* Stats grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label} className="min-h-0">
            <CardHeader className="flex flex-row items-center justify-between p-4 pb-2">
              <CardDescription className="text-sm font-medium">
                {s.label}
              </CardDescription>
              <div className={`rounded-lg p-2 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <p className="text-2xl font-bold">
                {!catalogHydrated ? (
                  <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" />
                ) : (
                  s.value
                )}
              </p>
              {s.sub && (
                <p className="text-xs text-muted-foreground mt-1">
                  {s.sub.label}:{' '}
                  {!catalogHydrated ? (
                    <span className="inline-block h-3.5 w-10 animate-pulse rounded bg-slate-200 align-middle" />
                  ) : (
                    <span className="font-medium text-foreground">{s.sub.value}</span>
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Needs Attention alerts */}
      {(pendingIntents > 0 || pendingMemberships > 0) && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingMemberships > 0 && (
              <Link to="/admin/newcomers" className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-white transition-colors">
                <span className="text-sm">GCXO membership requests</span>
                <Badge className="bg-amber-100 text-amber-700">{pendingMemberships}</Badge>
              </Link>
            )}
            {pendingIntents > 0 && (
              <Link to="/admin/newcomers" className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-white transition-colors">
                <span className="text-sm">Program join requests</span>
                <Badge className="bg-amber-100 text-amber-700">{pendingIntents}</Badge>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity log panel (Spec 04) */}
      {USE_API_AUTH && (
        <div className="mb-6">
          <ActivityLogPanel />
        </div>
      )}

      {/* Onboarding Email Queue card */}
      {USE_API_AUTH ? (
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 rounded-lg bg-amber-100 p-2 text-amber-600">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg">Email Queue</CardTitle>
                  <CardDescription className="break-words">
                    {emailQueueLoading
                      ? 'Loading...'
                      : emailQueueError
                        ? emailQueueError
                        : `${retryableCount} email(s) pending retry or send`}
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2 border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 sm:w-auto"
                disabled={flushing || retryableCount === 0}
                onClick={() => void handleFlushQueue()}
              >
                <Send className="h-4 w-4" />
                {flushing ? 'Sending...' : 'Process Email Queue'}
              </Button>
            </div>
          </CardHeader>
          {emailQueue.length > 0 && (
            <CardContent>
              <FadedScroll variant="subtle">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 pr-4 font-medium">Name</th>
                      <th className="pb-2 pr-4 font-medium">Email</th>
                      <th className="pb-2 pr-4 font-medium">Type</th>
                      <th className="pb-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllEmailQueue ? emailQueue : emailQueue.slice(0, 10)).map((entry) => (
                      <tr key={entry.id} className="border-b last:border-0">
                        <td className="py-2 pr-4 text-slate-900">
                          {entry.user_name ?? '-'}
                        </td>
                        <td className="py-2 pr-4 text-slate-600">
                          {entry.user_email ?? entry.user_id}
                        </td>
                        <td className="py-2 pr-4">
                          <Badge variant="outline" className="text-xs">
                            {entry.email_type}
                          </Badge>
                        </td>
                        <td className="py-2">
                          <Badge
                            className={
                              entry.status === 'queued'
                                ? 'bg-amber-100 text-amber-700'
                                : entry.status === 'ready'
                                  ? 'bg-blue-100 text-blue-700'
                                  : entry.status === 'failed'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-emerald-100 text-emerald-700'
                            }
                          >
                            {entry.status}
                          </Badge>
                          {entry.last_error ? (
                            <p className="mt-1 max-w-xs text-xs text-red-600">
                              {entry.last_error}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FadedScroll>
              {emailQueue.length > 10 && (
                <div className="mt-3 flex justify-center border-t border-slate-100 pt-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs font-semibold text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => setShowAllEmailQueue(!showAllEmailQueue)}
                  >
                    {showAllEmailQueue
                      ? 'Show Less'
                      : `View All (${emailQueue.length} emails)`}
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      ) : null}

      {/* Email Studio entry point — authoring companion to the Email Queue's
          monitoring view. Admins come here to edit transactional email copy
          (welcome, program invite, event cancellation, etc.) without a code
          deploy. The studio itself lives at /admin/email-studio. */}
      {USE_API_AUTH ? (
        <Card className="mb-6 border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-white">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3 min-w-0">
                <div className="shrink-0 rounded-lg bg-indigo-100 p-2 text-indigo-700">
                  <FileEdit className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg">Email Studio</CardTitle>
                  <CardDescription className="break-words">
                    Compose and send emails to users in the ecosystem. Pick a
                    starter template, fill in a form, or write a plain email and
                    have the GCXO brand header/footer added automatically. Send
                    to any user by name/email or type a custom recipient address.
                  </CardDescription>
                </div>
              </div>
              <Button asChild className="w-full gap-2 text-white sm:w-auto">
                <Link to="/admin/email-studio">
                  Open Email Studio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      {/* User Feedback Management */}
      {USE_API_AUTH && feedbackList.length > 0 && (
        <Card className="mb-6 border-slate-200 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                <CardTitle className="text-base font-semibold text-slate-900">
                  User Feedback
                </CardTitle>
                {newFeedbackCount > 0 ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    {newFeedbackCount} new
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-slate-600">
                    {feedbackList.length} total
                  </Badge>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFeedbackFilter('all')}
                  className={`rounded px-2.5 py-1 font-medium transition-all ${
                    feedbackFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({feedbackList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackFilter('new')}
                  className={`rounded px-2.5 py-1 font-medium transition-all ${
                    feedbackFilter === 'new'
                      ? 'bg-white text-amber-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Needs Review ({newFeedbackCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFeedbackFilter('reviewed')}
                  className={`rounded px-2.5 py-1 font-medium transition-all ${
                    feedbackFilter === 'reviewed'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Noted ({notedFeedbackCount})
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {filteredFeedback.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-500">
                No feedback found in this filter.
              </div>
            ) : (
              filteredFeedback.slice(0, 8).map((fb: any) => {
                const isNew = fb.status === 'new';
                const isUpdating = updatingFeedbackId === fb.id;
                return (
                  <div
                    key={fb.id}
                    onClick={() => {
                      setSelectedFeedback(fb);
                      setAdminNoteInput(fb.admin_notes || '');
                    }}
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 transition-all cursor-pointer hover:shadow-sm ${
                      isNew
                        ? 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/60'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 uppercase tracking-wide font-semibold mt-0.5 ${
                          fb.category === 'bug'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : fb.category === 'feature'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : fb.category === 'question'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {fb.category}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 line-clamp-2 leading-relaxed">
                          {fb.message}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-400">
                          <span className="font-medium text-slate-600">
                            {fb.user_name || (fb.user_email ? fb.user_email.split('@')[0] : 'Anonymous')}
                          </span>
                          {fb.page_url && (
                            <>
                              <span>·</span>
                              <span className="truncate max-w-[200px]" title={fb.page_url}>
                                {fb.page_url}
                              </span>
                            </>
                          )}
                          <span>·</span>
                          <span>{new Date(fb.created_at).toLocaleDateString()}</span>
                          {fb.admin_notes && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center text-indigo-600 font-medium bg-indigo-50 px-1.5 py-0.5 rounded text-[11px]">
                                Note: {fb.admin_notes}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-2 self-end sm:self-center shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="outline"
                        className={`text-[11px] font-medium px-2 py-0.5 ${
                          isNew
                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {isNew ? 'Needs Review' : 'Noted'}
                      </Badge>

                      {isNew ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isUpdating}
                          onClick={() => handleUpdateFeedbackStatus(fb.id, 'reviewed', fb.admin_notes)}
                          className="h-7 px-2.5 text-xs font-medium border-emerald-300 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 gap-1"
                        >
                          <Check className="h-3 w-3" />
                          Mark Noted
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isUpdating}
                          onClick={() => handleUpdateFeedbackStatus(fb.id, 'new', fb.admin_notes)}
                          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-800"
                          title="Reopen as needs review"
                        >
                          Reopen
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedFeedback(fb);
                          setAdminNoteInput(fb.admin_notes || '');
                        }}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
                        title="View details"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Feedback Detail Modal */}
      <Dialog
        open={!!selectedFeedback}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-semibold ${
                  selectedFeedback?.category === 'bug'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : selectedFeedback?.category === 'feature'
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : selectedFeedback?.category === 'question'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedFeedback?.category}
              </Badge>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  selectedFeedback?.status === 'new'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {selectedFeedback?.status === 'new' ? 'Needs Review' : 'Noted'}
              </Badge>
            </div>
            <DialogTitle className="text-lg">User Feedback Details</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Submitted by{' '}
              <span className="font-medium text-slate-700">
                {selectedFeedback?.user_name || 'Anonymous'}
              </span>
              {selectedFeedback?.user_email ? ` (${selectedFeedback.user_email})` : ''} on{' '}
              {selectedFeedback?.created_at
                ? new Date(selectedFeedback.created_at).toLocaleString()
                : 'Unknown date'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {selectedFeedback?.page_url && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Page:</span>
                <a
                  href={selectedFeedback.page_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-1 break-all"
                >
                  {selectedFeedback.page_url}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Feedback Message
              </label>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3.5 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                {selectedFeedback?.message}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Admin Notes / Resolution
              </label>
              <Textarea
                placeholder="Add internal notes (e.g. 'Investigated with user', 'Fixed in update', etc.)..."
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedFeedback(null)}
              className="text-slate-600"
            >
              Close
            </Button>

            {selectedFeedback?.status === 'new' ? (
              <Button
                onClick={() =>
                  handleUpdateFeedbackStatus(selectedFeedback.id, 'reviewed', adminNoteInput)
                }
                disabled={updatingFeedbackId === selectedFeedback?.id}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Check className="h-4 w-4" />
                Mark as Noted
              </Button>
            ) : (
              <Button
                onClick={() =>
                  handleUpdateFeedbackStatus(selectedFeedback.id, 'reviewed', adminNoteInput)
                }
                disabled={updatingFeedbackId === selectedFeedback?.id}
                className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
              >
                Save Notes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recent events */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Recent Events</CardTitle>
          <CardDescription>Quick access to manage your events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {events.map((event) => {
              const status = resolveEventLifecycle(event);
              const regCount = registrations.filter(
                (r) => r.eventId === event.slug,
              ).length;

              return (
                <div
                  key={event.slug}
                  className="flex flex-col gap-3 rounded-xl border p-3 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 sm:h-9 sm:w-9">
                      <Calendar className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 break-words sm:text-base">{event.title}</p>
                      <p className="text-xs text-slate-500 break-words sm:text-sm">
                        {event.date} &middot; {event.location}
                      </p>
                      {/* Mobile-only inline status + count so the controls row below stays tidy */}
                      <div className="mt-1.5 flex items-center gap-2 sm:hidden">
                        <Badge className={lifecycleBadgeClass(status)}>{status}</Badge>
                        <span className="text-xs text-slate-500">{regCount} registrations</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Badge className={`hidden sm:inline-flex ${lifecycleBadgeClass(status)}`}>
                      {status}
                    </Badge>
                    <Select
                      value={status}
                      onValueChange={(value) =>
                        updateEvent(event.slug, { lifecycleStatus: value as EventLifecycleStatus })
                      }
                    >
                      <SelectTrigger className="h-8 flex-1 text-xs sm:w-[130px] sm:flex-none sm:text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="past">Past</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="hidden whitespace-nowrap text-sm text-slate-500 sm:inline">
                      {regCount} registrations
                    </span>
                    <Button variant="ghost" size="sm" asChild className="shrink-0">
                      <Link to={`/admin/events/${event.slug}`}>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {USE_API_AUTH ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Operations (API)</CardTitle>
            <CardDescription>
              Tasks and onboarding cases from <code className="text-xs">/ops</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {opsLoading ? (
              <div className="space-y-2">
                <SkeletonBlock className="h-3 w-32" />
                <SkeletonBlock className="h-3 w-40" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            ) : opsError ? (
              <p className="text-sm text-amber-700">{opsError}</p>
            ) : (
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{tasks.length}</span>
                  <span className="text-slate-500"> tasks</span>
                </div>
                <div>
                  <span className="font-medium text-slate-900">{onboardingCases.length}</span>
                  <span className="text-slate-500"> onboarding cases</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}
      </>
      )}
    </div>
  );
}
