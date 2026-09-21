'use client';

/**
 * PortalApp — the members/admin area migrated from the Global CXO Circle SPA.
 *
 * The marketing site is a static Next.js export; these pages are fully
 * client-side (auth, react-query, react-router) exactly as they were in the
 * original Vite app. Every fixed portal path (/login, /dashboard, /admin/…)
 * has a thin Next page that mounts this component with SSR disabled, and the
 * server rewrites token/slug deep links (e.g. /verify-login/<token>) to the
 * portal shell so BrowserRouter can pick up the real URL.
 */
import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { usePathname } from 'next/navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/portal/components/ui/toaster';
import { Toaster as Sonner } from '@/portal/components/ui/sonner';
import { TooltipProvider } from '@/portal/components/ui/tooltip';
import { AuthProvider } from '@/portal/contexts/AuthContext';
import Header from '@/layouts/headers/Header';
import Footer from '@/layouts/footers/Footer';
import ImpersonationBanner from '@/portal/components/ImpersonationBanner';
import Login from '@/portal/components/pages/Login';
import Dashboard from '@/portal/components/pages/Dashboard';
import StartupProfilePage from '@/portal/components/pages/StartupProfilePage';
import Onboard from '@/portal/components/pages/Onboard';
import VerifyLogin from '@/portal/components/pages/VerifyLogin';
import UserSettings from '@/portal/components/pages/UserSettings';
import { ProtectedRoute } from '@/portal/components/ProtectedRoute';
import { DevToolbar } from '@/portal/components/DevToolbar';
import FeedbackWidget from '@/portal/components/FeedbackWidget';
import { useScrollTracking } from '@/portal/hooks/useScrollTracking';

const CalEmbed = React.lazy(() => import('@/portal/components/pages/CalEmbed'));

const AdminLayout = React.lazy(() => import('@/portal/components/pages/admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('@/portal/components/pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('@/portal/components/pages/admin/AdminUsers'));
const AdminStartups = React.lazy(() => import('@/portal/components/pages/admin/AdminStartups'));
const AdminMeetings = React.lazy(() => import('@/portal/components/pages/admin/AdminMeetings'));
const AdminNewEvent = React.lazy(() => import('@/portal/components/pages/admin/AdminNewEvent'));
const AdminEventDetail = React.lazy(() => import('@/portal/components/pages/admin/AdminEventDetail'));
const AdminOnboarding = React.lazy(() => import('@/portal/components/pages/admin/AdminOnboarding'));
const AdminEvents = React.lazy(() => import('@/portal/components/pages/admin/AdminEvents'));
const AdminSettings = React.lazy(() => import('@/portal/components/pages/admin/AdminSettings'));
const AdminCalendarPage = React.lazy(() => import('@/portal/components/pages/admin/AdminCalendarPage'));
const CalendarOnboarding = React.lazy(() => import('@/portal/components/pages/admin/CalendarOnboarding'));
const AdminPrograms = React.lazy(() => import('@/portal/components/pages/admin/AdminPrograms'));
const AdminEmailStudio = React.lazy(() => import('@/portal/components/pages/admin/AdminEmailStudio'));
const AdminUserUnifiedView = React.lazy(() => import('@/portal/components/pages/admin/AdminUserUnifiedView'));
const AdminBoomerang = React.lazy(() => import('@/portal/components/pages/admin/AdminBoomerang'));
const AdminAlerts = React.lazy(() => import('@/portal/components/pages/admin/AdminAlerts'));
const AdminNewcomers = React.lazy(() => import('@/portal/components/pages/admin/AdminNewcomers'));
const AdminQRGenerator = React.lazy(() => import('@/portal/components/pages/admin/AdminQRGenerator'));
const ProgramOnboarding = React.lazy(() => import('@/portal/components/pages/ProgramOnboarding'));
const ProgramDashboard = React.lazy(() => import('@/portal/components/pages/ProgramDashboard'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry auth failures — they won't resolve on retry
        if (error && typeof error === 'object' && 'status' in error && (error as { status: number }).status === 401) return false;
        return failureCount < 2;
      },
    },
  },
});

/** Path prefixes this SPA owns a route table for — kept in sync with the
 * fixed Next pages under src/app/{admin,dashboard,...}. Used to tell "an
 * unmatched portal sub-path" (fell through this Routes table — replacing to
 * the same URL would just remount and fall through again, an infinite
 * loop) apart from "a marketing-site path" (Next owns a real page for it;
 * replacing lets Next serve it). */
const PORTAL_PREFIXES = [
  '/admin', '/dashboard', '/program-dashboard', '/startup-profile', '/settings',
  '/login', '/verify-login', '/onboard', '/onboarding', '/password-set', '/cal',
];
const isPortalOwnedPath = (pathname: string) =>
  PORTAL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));

const normalizePath = (pathname: string) => {
  if (!pathname || pathname === '/') return '/';
  return pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
};

/**
 * Any path the SPA does not own belongs to the static marketing site
 * (e.g. "/", "/events", "/about"). In-app <Link> clicks to those paths land
 * here; escape with a full page load so the exported Next page is served.
 * A portal-owned path that still falls through to this catch-all is a
 * genuinely broken/unknown deep link (e.g. a stale bookmark) — replacing to
 * that same URL would just remount the SPA and hit this catch-all again, so
 * send those to the homepage instead.
 */
const ExitToStaticSite = () => {
  const location = useLocation();
  React.useEffect(() => {
    const target = isPortalOwnedPath(location.pathname)
      ? '/'
      : location.pathname + location.search;
    window.location.replace(target);
  }, [location]);
  return null;
};

const AppContent = () => {
  // Track/restore scroll position across navigations. We intentionally do NOT
  // use its `isRestoring` flag to blank the screen: the old marketing SPA
  // showed a full-screen white overlay + opacity-0 during restoration to hide
  // a parallax-home scroll jump, but the portal (login/dashboard/admin) has no
  // parallax and is never mounted on `/`, so that overlay only produced a
  // jarring blank→reappear flash on every admin/dashboard navigation.
  useScrollTracking();
  const location = useLocation();
  const nextPathname = usePathname();

  // BrowserRouter can occasionally initialize with a stale location while
  // Next.js navigation is still committing on slow devices. If Next says we're
  // on a portal route but React Router still sees the previous path, correct it
  // during render so the catch-all redirect never mounts.
  const routerPath = normalizePath(location.pathname);
  const nextPath = normalizePath(nextPathname || '/');
  if (isPortalOwnedPath(nextPath) && routerPath !== nextPath) {
    return <Navigate to={nextPath} replace />;
  }

  const isAdmin = location.pathname.startsWith('/admin');
  const isStandalone =
    location.pathname.startsWith('/onboarding/') ||
    location.pathname.startsWith('/onboard') ||
    location.pathname.startsWith('/password-set') ||
    location.pathname.startsWith('/verify-login') ||
    location.pathname.startsWith('/cal') ||
    location.pathname === '/login' ||
    location.pathname === '/login/';

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Portal user-facing pages (dashboard, settings, program-dashboard,
          startup-profile) now render the SAME header/footer as the marketing
          site so navigating between them is visually seamless. Admin console
          keeps its own sidebar layout; standalone pages (login/onboard/cal)
          stay chrome-free. */}
      {!isAdmin && !isStandalone && <Header />}
      <ImpersonationBanner />

      <div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-login/:token" element={<VerifyLogin />} />
          <Route path="/onboard" element={<Onboard />} />
          <Route path="/onboard/:token" element={<Onboard />} />
          <Route path="/password-set/:token" element={<Onboard />} />
          <Route
            path="/onboarding/:token"
            element={
              <Suspense fallback={<div>Loading...</div>}>
                <ProgramOnboarding />
              </Suspense>
            }
          />
          {/* Branded Cal.com URL — /cal/* catches every subpath and CalEmbed
              forwards the wildcard portion into its iframe src. */}
          <Route
            path="/cal"
            element={
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
                <CalEmbed />
              </Suspense>
            }
          />
          <Route
            path="/cal/*"
            element={
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading…</div>}>
                <CalEmbed />
              </Suspense>
            }
          />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/program-dashboard" element={<ProtectedRoute><Suspense fallback={null}><ProgramDashboard /></Suspense></ProtectedRoute>} />
          <Route path="/startup-profile" element={<ProtectedRoute requiredTier={['startup', 'admin', 'dev']}><StartupProfilePage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><UserSettings /></ProtectedRoute>} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredTier={['admin', 'dev']}>
                <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
                  <AdminLayout />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route index element={<Suspense fallback={null}><AdminDashboard /></Suspense>} />
            <Route path="alerts" element={<Suspense fallback={null}><AdminAlerts /></Suspense>} />
            <Route path="members" element={<Suspense fallback={null}><AdminUsers /></Suspense>} />
            <Route path="members/:userId/unified" element={<Suspense fallback={null}><AdminUserUnifiedView /></Suspense>} />
            <Route path="startups" element={<Suspense fallback={null}><AdminStartups /></Suspense>} />
            <Route path="meetings" element={<Suspense fallback={null}><AdminMeetings /></Suspense>} />
            <Route path="onboarding" element={<Suspense fallback={null}><AdminOnboarding /></Suspense>} />
            <Route path="events" element={<Suspense fallback={null}><AdminEvents /></Suspense>} />
            <Route path="events/new" element={<Suspense fallback={null}><AdminNewEvent /></Suspense>} />
            <Route path="events/:slug" element={<Suspense fallback={null}><AdminEventDetail /></Suspense>} />
            <Route path="settings" element={<Suspense fallback={null}><AdminSettings /></Suspense>} />
            <Route path="calendar" element={<Suspense fallback={null}><AdminCalendarPage /></Suspense>} />
            <Route path="calendar/onboarding" element={<Suspense fallback={null}><CalendarOnboarding /></Suspense>} />
            <Route
              path="programs"
              element={
                <ProtectedRoute requiredTier={['admin', 'dev']}>
                  <Suspense fallback={null}><AdminPrograms /></Suspense>
                </ProtectedRoute>
              }
            />
            <Route path="email-studio" element={<Suspense fallback={null}><AdminEmailStudio /></Suspense>} />
            <Route path="qr-generator" element={<Suspense fallback={null}><AdminQRGenerator /></Suspense>} />
            <Route path="newcomers" element={<Suspense fallback={null}><AdminNewcomers /></Suspense>} />
            <Route
              path="boomerang"
              element={
                <ProtectedRoute requiredTier={['admin', 'dev']}>
                  <Suspense fallback={null}><AdminBoomerang /></Suspense>
                </ProtectedRoute>
              }
            />
          </Route>
          {/* Anything else is a marketing-site page — leave the SPA. */}
          <Route path="*" element={<ExitToStaticSite />} />
        </Routes>
        {!isAdmin && !isStandalone && <Footer />}
      </div>
      <FeedbackWidget showFloatingButton={!isAdmin} />
      <DevToolbar />
    </div>
  );
};

const PortalApp = () => (
  <div className="gcio-portal">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </div>
);

export default PortalApp;
