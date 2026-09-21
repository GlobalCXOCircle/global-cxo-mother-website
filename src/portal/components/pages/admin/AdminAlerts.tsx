import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  UserPlus,
  Award,
} from 'lucide-react';
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
import { apiFetch } from '@/portal/api/client';
import { useAuth } from '@/portal/hooks/useAuth';
import { cn } from '@/portal/lib/utils';
import { toast } from 'sonner';

interface AlertItem {
  id: string;
  type: 'membership' | 'intent' | 'feedback';
  title: string;
  subtitle: string;
  time: string;
  link: string;
  raw?: any;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const typeConfig = {
  membership: { icon: UserPlus, color: 'text-blue-600 bg-blue-50', badge: 'bg-blue-100 text-blue-700', label: 'GCXO Request' },
  intent: { icon: Award, color: 'text-purple-600 bg-purple-50', badge: 'bg-purple-100 text-purple-700', label: 'Program Request' },
  feedback: { icon: MessageSquare, color: 'text-amber-600 bg-amber-50', badge: 'bg-amber-100 text-amber-700', label: 'Feedback' },
};

export default function AdminAlerts() {
  const { useApiAuth } = useAuth();

  const queryClient = useQueryClient();
  const [selectedFeedback, setSelectedFeedback] = useState<any | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const { data: membershipRequests = [] } = useQuery({
    queryKey: ['admin', 'alerts', 'membership-requests'],
    queryFn: () => apiFetch<any[]>('/admin/membership-requests?status_filter=pending'),
    staleTime: 30_000,
    enabled: useApiAuth,
  });

  const { data: intentRequests = [] } = useQuery({
    queryKey: ['admin', 'alerts', 'intent-requests'],
    queryFn: () => apiFetch<any[]>('/admin/intent-requests?status_filter=pending'),
    staleTime: 30_000,
    enabled: useApiAuth,
  });

  const { data: feedbackItems = [], refetch: refetchFeedback } = useQuery({
    queryKey: ['admin', 'alerts', 'feedback'],
    queryFn: () => apiFetch<any[]>('/admin/feedback?status_filter=new'),
    staleTime: 30_000,
    enabled: useApiAuth,
  });

  const handleMarkNoted = async (fbId: string) => {
    setIsUpdating(true);
    try {
      await apiFetch(`/admin/feedback/${fbId}`, {
        method: 'PATCH',
        body: {
          status: 'reviewed',
          ...(adminNoteInput ? { admin_notes: adminNoteInput } : {}),
        },
      });
      toast.success('Feedback marked as noted');
      setSelectedFeedback(null);
      await refetchFeedback();
      void queryClient.invalidateQueries({ queryKey: ['admin', 'feedback'] });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update feedback');
    } finally {
      setIsUpdating(false);
    }
  };

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    for (const r of membershipRequests) {
      items.push({
        id: `m-${r.id}`,
        type: 'membership',
        title: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.email,
        subtitle: r.company ?? 'No company',
        time: r.created_at,
        link: '/admin/newcomers',
      });
    }

    for (const r of intentRequests) {
      items.push({
        id: `i-${r.id}`,
        type: 'intent',
        title: r.full_name ?? r.email ?? 'Unknown',
        subtitle: r.program_name ?? 'Program interest',
        time: r.created_at,
        link: '/admin/newcomers',
      });
    }

    for (const f of feedbackItems) {
      items.push({
        id: `f-${f.id}`,
        type: 'feedback',
        title: f.category ?? 'General',
        subtitle: f.message?.slice(0, 80) ?? '',
        time: f.created_at,
        link: '/admin#feedback',
        raw: f,
      });
    }

    items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    return items;
  }, [membershipRequests, intentRequests, feedbackItems]);

  const counts = {
    membership: membershipRequests.length,
    intent: intentRequests.length,
    feedback: feedbackItems.length,
    total: membershipRequests.length + intentRequests.length + feedbackItems.length,
  };

  const summaryCards = [
    { label: 'GCXO Requests', count: counts.membership, icon: UserPlus, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/newcomers' },
    { label: 'Program Requests', count: counts.intent, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/newcomers' },
    { label: 'New Feedback', count: counts.feedback, icon: MessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', link: '/admin#feedback' },
    { label: 'Total', count: counts.total, icon: Bell, color: 'text-red-600', bg: 'bg-red-50', link: '' },
  ];

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Alerts</h1>
        <p className="text-sm text-gray-500 mt-1">Items requiring your attention</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const inner = (
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-4 pb-4 flex items-center gap-3">
                <div className={cn('rounded-lg p-2', card.bg)}>
                  <Icon className={cn('h-5 w-5', card.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{card.count}</p>
                  <p className="text-xs text-gray-500">{card.label}</p>
                </div>
              </CardContent>
            </Card>
          );
          return card.link ? (
            <Link key={card.label} to={card.link}>{inner}</Link>
          ) : (
            <div key={card.label}>{inner}</div>
          );
        })}
      </div>

      {/* Alert list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending Items</CardTitle>
          <CardDescription>Sorted by most recent</CardDescription>
        </CardHeader>
        <CardContent>
          {counts.total === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <CheckCircle2 className="h-12 w-12 mb-3 text-green-400" />
              <p className="text-lg font-medium text-gray-600">All clear</p>
              <p className="text-sm">No pending items right now</p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts.map((alert) => {
                const cfg = typeConfig[alert.type];
                const Icon = cfg.icon;

                if (alert.type === 'feedback') {
                  return (
                    <div
                      key={alert.id}
                      onClick={() => {
                        setSelectedFeedback(alert.raw);
                        setAdminNoteInput(alert.raw?.admin_notes || '');
                      }}
                      className="flex items-center gap-4 py-3 px-2 rounded-md hover:bg-amber-50/50 transition-colors -mx-2 cursor-pointer"
                    >
                      <div className={cn('rounded-lg p-2 shrink-0', cfg.color)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900 truncate">{alert.title}</span>
                          <Badge variant="secondary" className={cn('text-[10px] px-1.5 shrink-0', cfg.badge)}>
                            {cfg.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{alert.subtitle}</p>
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{relativeTime(alert.time)}</span>
                    </div>
                  );
                }

                return (
                  <Link
                    key={alert.id}
                    to={alert.link}
                    className="flex items-center gap-4 py-3 px-2 rounded-md hover:bg-gray-50 transition-colors -mx-2"
                  >
                    <div className={cn('rounded-lg p-2 shrink-0', cfg.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-gray-900 truncate">{alert.title}</span>
                        <Badge variant="secondary" className={cn('text-[10px] px-1.5 shrink-0', cfg.badge)}>
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{alert.subtitle}</p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">{relativeTime(alert.time)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Direct Feedback Review Dialog on Alerts page */}
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
              <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
                Needs Review
              </Badge>
            </div>
            <DialogTitle className="text-lg">User Feedback Alert</DialogTitle>
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
                <span className="font-medium text-slate-700">Origin Page:</span>
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
                placeholder="Add internal notes before acknowledging (optional)..."
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                rows={3}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between">
            <Button
              variant="outline"
              asChild
              className="text-slate-600 text-xs sm:mr-auto"
            >
              <Link to="/admin#feedback" onClick={() => setSelectedFeedback(null)}>
                Open in Full Dashboard
              </Link>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => setSelectedFeedback(null)}
                className="text-slate-600"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleMarkNoted(selectedFeedback.id)}
                disabled={isUpdating}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <Check className="h-4 w-4" />
                Mark as Noted
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
