import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { UserTier } from '@/portal/data/mock/types';
import { useAuth } from '@/portal/hooks/useAuth';
import { SkeletonBlock } from '@/portal/components/ui/admin-skeletons';
import {
  AdminShellSkeleton,
  UserDashboardSkeleton,
  UserSettingsSkeleton,
} from '@/portal/components/ui/route-skeletons';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredTier?: UserTier[];
}

// Fallback for destinations without a shape-matched skeleton (program
// dashboard, startup profile) — a title bar + a few card placeholders reads
// reasonably even without an exact match. min-h-screen + pt-24 (the same top
// clearance the real pages reserve for HeaderFive's absolute/transparent
// header) keeps this from collapsing to a short block that leaves the footer
// riding up right underneath it before the real content arrives.
function GenericRouteSkeleton(): React.ReactElement {
  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <SkeletonBlock className="h-7 w-40" />
          <SkeletonBlock className="h-3 w-64 max-w-full" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              style={{ opacity: Math.max(0.5, 1 - i * 0.15) }}
            >
              <SkeletonBlock className="h-4 w-2/3" />
              <SkeletonBlock className="h-3 w-full" />
              <SkeletonBlock className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Picks a skeleton shaped like the ACTUAL destination page, keyed off the
// URL — ProtectedRoute wraps the whole /admin subtree (AdminLayout + every
// child route) behind one auth check, so this is the only place that knows
// which real page is about to render before it does.
function RouteLoadingSkeleton({ pathname }: { pathname: string }): React.ReactElement {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  if (cleanPath === '/admin' || cleanPath.startsWith('/admin/')) {
    return <AdminShellSkeleton pathname={cleanPath} />;
  }
  if (cleanPath === '/dashboard') {
    return <UserDashboardSkeleton />;
  }
  if (cleanPath === '/settings') {
    return <UserSettingsSkeleton />;
  }
  return <GenericRouteSkeleton />;
}

function AccessDenied(): React.ReactElement {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-bold text-destructive">Access Denied</h1>
      <p className="max-w-md text-muted-foreground">
        Your account tier does not have permission to view this page. Contact an
        administrator if you believe this is an error.
      </p>
    </div>
  );
}

export function ProtectedRoute({
  children,
  requiredTier,
}: ProtectedRouteProps): React.ReactElement {
  const { isAuthenticated, currentUser, authHydrated } = useAuth();
  const location = useLocation();

  if (!authHydrated) {
    return <RouteLoadingSkeleton pathname={location.pathname} />;
  }

  if (!isAuthenticated) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }

  if (requiredTier && currentUser) {
    const hasAccess =
      currentUser.tier === 'dev' || requiredTier.includes(currentUser.tier);
    if (!hasAccess) {
      return <AccessDenied />;
    }
  }

  return <>{children}</>;
}
