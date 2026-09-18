import type { JSX } from 'react';
import { cn } from '@/portal/lib/utils';
import { navSections } from '@/portal/components/pages/admin/AdminLayout';
import {
  SkeletonBlock,
  DashboardSkeleton,
  SettingsFormSkeleton,
  TableSkeleton,
  StartupListSkeleton,
  SessionCardListSkeleton,
  OnboardingListSkeleton,
  EventCardListSkeleton,
  EventDetailSkeleton,
  CalendarSkeleton,
  ProgramOverviewSkeleton,
  BoomerangSkeleton,
} from '@/portal/components/ui/admin-skeletons';

/**
 * Route-shaped loading skeletons for ProtectedRoute — shown while the auth
 * session hydrates, i.e. before we even know whether the destination page
 * will mount. Unlike the per-page skeletons in admin-skeletons.tsx (which
 * show while that page's OWN data is loading), these exist purely so the
 * brief pre-auth window doesn't flash a totally different, unstyled shell
 * before the real chrome (admin sidebar, marketing header/footer) appears.
 */

// ---------------------------------------------------------------------------
// Admin console shell — sidebar (real nav labels/icons, no data needed) +
// a content-area skeleton picked by pathname so /admin/settings shows the
// settings shape, /admin shows the dashboard shape, etc.
// ---------------------------------------------------------------------------

function pickAdminContentSkeleton(pathname: string): JSX.Element {
  const path = pathname.replace(/\/+$/, '') || '/admin';

  if (path === '/admin') return <DashboardSkeleton />;
  if (path === '/admin/settings') return <SettingsFormSkeleton />;
  if (path === '/admin/members' || path.startsWith('/admin/members/')) return <TableSkeleton />;
  if (path === '/admin/startups') return <StartupListSkeleton />;
  if (path === '/admin/meetings') return <SessionCardListSkeleton />;
  if (path === '/admin/onboarding' || path === '/admin/newcomers') return <OnboardingListSkeleton />;
  if (path === '/admin/events') return <EventCardListSkeleton />;
  if (path.startsWith('/admin/events/')) return <EventDetailSkeleton />;
  if (path === '/admin/calendar') return <CalendarSkeleton />;
  if (path === '/admin/programs') return <ProgramOverviewSkeleton />;
  if (path === '/admin/boomerang') return <BoomerangSkeleton />;
  if (path === '/admin/alerts') return <TableSkeleton rows={4} columns={3} />;
  return <DashboardSkeleton />;
}

export function AdminShellSkeleton({ pathname }: { pathname: string }): JSX.Element {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="hidden md:flex md:w-64 flex-col border-r bg-white">
        <div className="flex h-16 items-center justify-between px-4 border-b">
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold text-gray-900">Admin Console</span>
            <span className="text-xs font-medium text-gray-400">back home &rarr;</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col p-4">
          {navSections.map((group, gi) => (
            <div key={group.section} className={gi > 0 ? 'mt-4' : ''}>
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                {group.section}
              </div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const isActive = item.end
                    ? pathname === item.to
                    : pathname === item.to || pathname.startsWith(`${item.to}/`);
                  return (
                    <div
                      key={item.to}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                        isActive ? 'bg-gray-100 text-gray-900' : 'text-gray-500',
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <div className="flex md:hidden items-center h-14 px-4 border-b bg-white shrink-0">
          <div className="h-5 w-5 rounded-sm bg-gray-200" />
          <span className="ml-2 font-semibold text-gray-900">Admin Console</span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">{pickAdminContentSkeleton(pathname)}</div>
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Dashboard (/dashboard) — mirrors Dashboard.tsx's hero + 3-col layout
// (sticky profile card on the left, stacked content cards on the right).
// ---------------------------------------------------------------------------

export function UserDashboardSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen">
      <section className="pt-24 pb-10 bg-gradient-to-br from-bg-dark via-white to-bg-light">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <SkeletonBlock className="h-8 w-44" />
          <SkeletonBlock className="h-5 w-80 max-w-full" />
        </div>
      </section>
      <section className="py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — profile card */}
            <div className="lg:col-span-1">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex flex-col items-center">
                <SkeletonBlock className="h-20 w-20 rounded-full" />
                <SkeletonBlock className="mt-4 h-5 w-36" />
                <SkeletonBlock className="mt-2 h-5 w-16 rounded-full" />
                <SkeletonBlock className="mt-3 h-3 w-40" />
                <div className="my-5 h-px w-full bg-slate-100" />
                <div className="w-full space-y-4">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-1.5">
                      <SkeletonBlock className="h-2.5 w-16" />
                      <SkeletonBlock className="h-3.5 w-full" />
                    </div>
                  ))}
                </div>
                <div className="my-5 h-px w-full bg-slate-100" />
                <div className="w-full space-y-2">
                  <SkeletonBlock className="h-10 w-full rounded-lg" />
                  <SkeletonBlock className="h-10 w-full rounded-lg" />
                </div>
              </div>
            </div>
            {/* Right column — matches My Events and session cards */}
            <div className="lg:col-span-2 space-y-6">
              {/* Card 1: My Events */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-5 w-5 rounded-md" />
                    <SkeletonBlock className="h-5 w-28" />
                  </div>
                  <SkeletonBlock className="h-8 w-28 rounded-md" />
                </div>
                <SkeletonBlock className="h-4 w-72 max-w-full" />
              </div>
              {/* Card 2: 1:1 Strategy Sessions */}
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SkeletonBlock className="h-5 w-5 rounded-md" />
                    <SkeletonBlock className="h-5 w-48" />
                  </div>
                  <SkeletonBlock className="h-8 w-28 rounded-lg" />
                </div>
                <div className="space-y-3 pt-2">
                  <SkeletonBlock className="h-16 w-full rounded-lg" />
                  <SkeletonBlock className="h-16 w-full rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User Settings (/settings) — mirrors UserSettings.tsx's Back link + title +
// three stacked cards (Profile / Security / Danger Zone).
// ---------------------------------------------------------------------------

export function UserSettingsSkeleton(): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-10">
      <div className="mx-auto max-w-2xl px-4">
        <SkeletonBlock className="mb-4 h-4 w-16" />
        <SkeletonBlock className="mb-6 h-7 w-48" />

        <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-4">
          <div className="space-y-1.5">
            <SkeletonBlock className="h-5 w-20" />
            <SkeletonBlock className="h-3 w-56" />
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBlock className="h-3 w-20" />
              <SkeletonBlock className="h-9 w-full rounded-lg" />
            </div>
          ))}
          <SkeletonBlock className="h-9 w-32 rounded-lg" />
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-white shadow-sm p-6 space-y-3">
          <SkeletonBlock className="h-5 w-24" />
          <SkeletonBlock className="h-9 w-40 rounded-lg" />
          <SkeletonBlock className="h-9 w-48 rounded-lg" />
        </div>

        <div className="rounded-xl border border-red-200 bg-white shadow-sm p-6 space-y-3">
          <SkeletonBlock className="h-5 w-28" />
          <div className="flex items-center justify-between rounded-lg border border-red-200 p-4">
            <div className="space-y-1.5">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-3 w-56" />
            </div>
            <SkeletonBlock className="h-9 w-32 shrink-0 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
