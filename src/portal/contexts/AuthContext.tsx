import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  EventVisibilityMap,
  MockDatabaseSnapshot,
  MockEventRegistration,
  MockStartupProfile,
  MockUser,
  MockUserStartupLink,
  RegistrationStatus,
  UserTier,
  VisibilitySetting,
} from '@/portal/data/mock/types';
import { MOCK_DEMO_PASSWORD } from '@/portal/data/mock/auth';
import { EventDetail, eventsData, type EventLifecycleStatus, type HighlightCard } from '@/portal/data/EventsData';
import type { Speaker } from '@/portal/data/speakers';
import type { Sponsor } from '@/portal/data/sponsors';
import type { ItineraryItem } from '@/portal/data/itinerary';
import { sfConferenceImages } from '@/portal/data/events/sfConference';
import { resolveEventLifecycle } from '@/portal/lib/eventLifecycle';
import { USE_API_AUTH } from '@/portal/api/config';
import {
  adminImpersonateApi,
  demoLoginAsApi,
  fetchCurrentUserApi,
  isApplicationPending,
  isPreExistingProfile,
  isTwoFaRequired,
  login2faApi,
  loginWithPasswordApi,
  logoutApi,
  switchUserApi,
} from '@/portal/api/auth';
import {
  createEventApi,
  createEventRegistrationApi,
  deleteEventApi,
  listEventRegistrationsApi,
  listEventsApi,
  mergeRegistrationCounts,
  patchEventApi,
} from '@/portal/api/events';
import {
  mapApiEventToEventDetail,
  mapVisibilityFromApi,
  mapVisibilityToApi,
} from '@/portal/api/mappers';
import { createStartupApi, listStartupLinksApi, listStartupsApi, patchStartupApi } from '@/portal/api/startups';
import { adminCreateUserApi, deleteUserApi, listUsersApi, patchUserApi, type PatchUserBody } from '@/portal/api/users';
import { ApiError } from '@/portal/api/errors';
import { getStoredAccessToken, setStoredAccessToken, getStoredUser, setStoredUser } from '@/portal/api/tokenStorage';
import { getMockSessionUserId, setMockSessionUserId } from '@/portal/lib/mockSession';
import { loadMockDatabaseSnapshot, persistMockDatabaseSnapshot } from '@/portal/lib/mockDatabase';
import { toast } from 'sonner';

type EventMutationInput = {
  title?: string;
  tagline?: string;
  date?: string;
  location?: string;
  attendees?: string;
  description?: string;
  overview?: string;
  objectives?: string[];
  lifecycleStatus?: EventLifecycleStatus;
  registrationOpen?: boolean;
  showHeroPromo?: boolean;
  venueName?: string;
  venueAddress?: string;
  venueDescription?: string;
  venueImage?: string;
  venueMapEmbedUrl?: string;
  heroImage?: string;
  heroImageMobile?: string;
  bannerImage?: string;
  cardImage?: string;
  ctaPrimaryLabel?: string;
  ctaPrimaryUrl?: string;
  ctaIsExternal?: boolean;
  ctaSecondaryLabel?: string;
  ctaSecondaryUrl?: string;
  lumaUrl?: string;
  galleryUrl?: string;
  highlights?: string[];
  highlightCards?: HighlightCard[];
  speakers?: Speaker[];
  sponsors?: Sponsor[];
  itinerary?: ItineraryItem[];
  livestreamUrl?: string;
};

type AdminUserInput = Pick<
  MockUser,
  'name' | 'email' | 'phone' | 'linkedin' | 'companyAffiliation' | 'role' | 'aboutMe' | 'tier' | 'advisoryHourlyRate'
>;

type AdminEventAttendeeInput = AdminUserInput & {
  status?: RegistrationStatus;
  startupId?: string;
};

export interface BackendCatalogWarning {
  title: string;
  message: string;
  failedResources: string[];
}

export interface AuthContextType {
  currentUser: MockUser | null;
  isAuthenticated: boolean;
  /** False until mock session is read or `/auth/me` completes when API auth is enabled. */
  authHydrated: boolean;
  /**
   * False on fresh mount until `refreshCatalog()` has completed its first
   * pass (success OR network failure). In mock mode it's permanently
   * `true`. Admin pages should gate their skeletons on this: when it's
   * `false`, render a skeleton because the `users/startups/events` arrays
   * are still empty placeholders; when it's `true`, you can trust that the
   * arrays reflect the real server state (including "genuinely empty").
   *
   * Without this flag, the pages can't tell "fresh mount, catalog still
   * hydrating" apart from "catalog loaded and really has zero rows," so
   * they flash empty-state placeholders for the first few hundred ms of
   * every mount.
   */
  catalogHydrated: boolean;
  /** True when `VITE_USE_API_AUTH` and `VITE_API_BASE_URL` are set — session comes from the backend. */
  useApiAuth: boolean;
  login: (email: string, password: string) => Promise<MockUser | null>;
  demoLoginAs: (userId: string) => Promise<MockUser | null>;
  /** Start a proxy session: stash the caller's JWT so exitProxySession can restore it. */
  beginProxySession: (targetUserId: string) => Promise<MockUser | null>;
  /** End a proxy session by restoring the admin's stashed JWT. Returns the restored user, or null if restoration failed. */
  exitProxySession: () => Promise<MockUser | null>;
  /** Swap session into a linked profile (multi-profile switcher). Differs from
   *  beginProxySession in that there's no banner — the new identity is legitimate,
   *  not a proxy. Switching back happens via the same call from the other side. */
  switchToLinkedProfile: (targetUserId: string) => Promise<MockUser | null>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
  isAdmin: boolean;
  isTier3: boolean;
  backendCatalogWarning: BackendCatalogWarning | null;
  events: EventDetail[];
  eventVisibility: EventVisibilityMap;
  users: MockUser[];
  startups: MockStartupProfile[];
  userStartupLinks: MockUserStartupLink[];
  registrations: MockEventRegistration[];
  updateProfile: (updates: Partial<MockUser>) => void;
  createUser: (input: AdminUserInput) => Promise<MockUser>;
  updateUserById: (userId: string, updates: Partial<MockUser>) => MockUser | null;
  removeUserById: (userId: string) => void;
  createStartupProfile: (input: {
    companyName: string;
    companyWebsite: string;
    description: string;
  }) => Promise<MockStartupProfile | null>;
  updateStartupProfile: (
    startupId: string,
    updates: Partial<Pick<MockStartupProfile, 'companyName' | 'companyWebsite' | 'description' | 'isVerified'>>,
  ) => MockStartupProfile | null;
  /** Reload users, startups, events, and registrations from the API (no-op when mock mode). */
  refreshCatalog: () => Promise<void>;
  createEvent: (input: {
    title: string;
    slug?: string;
    tagline?: string;
    date: string;
    location: string;
    attendees: string;
    description: string;
    overview: string;
    objectives?: string[];
    lifecycleStatus?: EventLifecycleStatus;
    registrationOpen: boolean;
    venueName?: string;
    venueAddress?: string;
    venueDescription?: string;
    venueImage?: string;
    venueMapEmbedUrl?: string;
    lumaUrl?: string;
    galleryUrl?: string;
    heroImage?: string;
    bannerImage?: string;
    ctaPrimaryLabel?: string;
    ctaPrimaryUrl?: string;
    ctaIsExternal?: boolean;
    highlights?: string[];
    highlightCards?: Array<{ icon: string; title: string; text: string }>;
    speakers?: Array<{ name: string; title: string; company: string; image: string }>;
    sponsors?: Array<{ name: string; logo: string; website?: string }>;
    itinerary?: Array<{ date: string; time: string; title: string; description: string; type: string; timeOfDay: string; sponsors?: string[]; speakers?: string[] }>;
  }) => Promise<EventDetail>;
  updateEvent: (slug: string, updates: EventMutationInput, skipApiPatch?: boolean) => EventDetail | null;
  deleteEvent: (slug: string) => Promise<number | undefined>;
  updateEventVisibility: (slug: string, settings: VisibilitySetting) => void;
  registerForEvent: (eventId: string) => Promise<{ success: boolean; message: string }>;
  unregisterFromEvent: (eventId: string, userId?: string) => { success: boolean; message: string };
  restoreRegistration: (eventId: string, userId?: string) => { success: boolean; message: string };
  registerAttendeeForEvent: (
    eventId: string,
    input: { existingUserId?: string; attendee?: AdminEventAttendeeInput },
  ) => Promise<{ success: boolean; message: string; user?: MockUser; registration?: MockEventRegistration }>;
  importEventAttendees: (
    eventId: string,
    rows: AdminEventAttendeeInput[],
  ) => { added: number; updated: number; skipped: number };
  updateRegistrationStatus: (registrationId: string, status: RegistrationStatus) => void;
  getUserRegistrations: (userId?: string) => MockEventRegistration[];
  getLinkedStartup: (userId?: string) => MockStartupProfile | undefined;
  getStartupMembers: (startupId: string) => MockUser[];
  /** When `useApiAuth`, returns the backend UUID for an event slug (for `/ops` paths). */
  getBackendEventIdForSlug: (slug: string) => string | undefined;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const ADMIN_TIERS: UserTier[] = ['admin', 'dev'];

function emptyCatalogSnapshot(): MockDatabaseSnapshot {
  return {
    version: 1,
    currentUserId: null,
    events: eventsData,
    users: [],
    startups: [],
    userStartupLinks: [],
    registrations: [],
    eventVisibility: {},
  };
}

function parseEventDateRange(dateInput: string): { start: Date; end: Date } {
  const start = new Date(dateInput.trim());
  if (Number.isNaN(start.getTime())) {
    const now = new Date();
    return { start: now, end: new Date(now.getTime() + 86_400_000) };
  }
  return { start, end: new Date(start.getTime() + 86_400_000) };
}

const DEFAULT_API_VISIBILITY = {
  startup_can_see: ['startup'] as UserTier[],
  cxo_can_see: ['startup', 'cxo', 'vc'] as UserTier[],
  vc_can_see: ['startup', 'vc'] as UserTier[],
};
const nowIso = (): string => new Date().toISOString();
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
const normalizeUrl = (value: string): string =>
  value.trim().startsWith('http') ? value.trim() : `https://${value.trim()}`;
const toDomain = (value: string): string => {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return value.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] ?? value;
  }
};
const createId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function cloneVisibility(settings: VisibilitySetting): VisibilitySetting {
  return {
    startupCanSee: [...settings.startupCanSee],
    cxoCanSee: [...settings.cxoCanSee],
    vcCanSee: [...settings.vcCanSee],
  };
}

function buildBackendCatalogWarning(failedResources: string[]): BackendCatalogWarning | null {
  if (failedResources.length === 0) {
    return null;
  }

  const title = failedResources.length >= 3 ? 'Backend not connected' : 'Backend partially connected';
  const resources = failedResources.join(', ');

  return {
    title,
    failedResources,
    message: `Some API data could not be loaded (${resources}). Showing partial data until the backend connection is restored.`,
  };
}

function buildEventCta(slug: string, registrationOpen: boolean, lumaUrl?: string) {
  const normalizedLuma = lumaUrl?.trim();
  if (normalizedLuma) {
    return {
      primaryLabel: 'Open Luma Event',
      primaryUrl: normalizedLuma,
      isExternal: true,
    };
  }

  return {
    primaryLabel: registrationOpen ? 'Register via GCXO' : 'Open Dashboard',
    primaryUrl: registrationOpen ? `/events/${slug}` : '/dashboard',
  };
}

function buildEventDetail(
  input: {
    title: string;
    slug?: string;
    tagline?: string;
    date: string;
    location: string;
    attendees: string;
    description: string;
    overview: string;
    objectives?: string[];
    lifecycleStatus?: EventLifecycleStatus;
    registrationOpen: boolean;
    venueName?: string;
    venueAddress?: string;
    venueDescription?: string;
    lumaUrl?: string;
  },
  currentEvents: EventDetail[],
): EventDetail {
  const timestamp = nowIso();
  const baseSlug = slugify(input.slug?.trim() || input.title);
  let nextSlug = baseSlug || createId('event');

  if (currentEvents.some((event) => event.slug === nextSlug)) {
    nextSlug = `${nextSlug}-${currentEvents.length + 1}`;
  }

  const nextId = currentEvents.reduce((maxId, event) => Math.max(maxId, event.id), 0) + 1;
  const normalizedObjectives = (input.objectives ?? [])
    .map((objective) => objective.trim())
    .filter(Boolean);

  return {
    id: nextId,
    slug: nextSlug,
    title: input.title.trim(),
    tagline: input.tagline?.trim() || undefined,
    date: input.date.trim(),
    location: input.location.trim(),
    description: input.description.trim(),
    attendees: input.attendees.trim(),
    heroImage: sfConferenceImages.card,
    heroImageMobile: sfConferenceImages.card,
    cardImage: sfConferenceImages.card,
    bannerImage: sfConferenceImages.banner,
    gallery: [],
    overview: input.overview.trim(),
    objectives: normalizedObjectives,
    speakers: [],
    sponsors: [],
    itinerary: [],
    highlights:
      normalizedObjectives.length > 0
        ? normalizedObjectives
        : ['Newly created mock event ready for registration and admin review.'],
    highlightCards: [],
    lifecycleStatus: input.lifecycleStatus ?? (input.registrationOpen ? 'current' : 'past'),
    registrationOpen: input.registrationOpen,
    cta: buildEventCta(nextSlug, input.registrationOpen, input.lumaUrl),
    metadata: {
      title: `Global CXO Circle | ${input.title.trim()}`,
      description: input.description.trim(),
      image: sfConferenceImages.banner,
    },
    venue: {
      name: input.venueName?.trim() || `${input.title.trim()} Venue`,
      address: input.venueAddress?.trim() || input.location.trim(),
      description:
        input.venueDescription?.trim() ||
        `Mock venue profile for ${input.title.trim()}, created in the GCXO admin console on ${timestamp}.`,
      image: sfConferenceImages.card,
    },
  };
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  const initialSnapshot = useMemo(
    () => (USE_API_AUTH ? emptyCatalogSnapshot() : loadMockDatabaseSnapshot()),
    [],
  );
  const [mockSessionUserId, setMockSessionUserIdState] = useState<string | null>(() =>
    USE_API_AUTH ? null : getMockSessionUserId(),
  );
  const [apiSessionUser, setApiSessionUser] = useState<MockUser | null>(() => {
    if (!USE_API_AUTH) return null;
    return getStoredAccessToken() ? getStoredUser() : null;
  });
  const [authHydrated, setAuthHydrated] = useState<boolean>(() => !USE_API_AUTH);
  // Mock mode has its data available synchronously from `initialSnapshot`,
  // so the catalog is already "hydrated" on mount. Live mode starts as
  // false and flips to true in `refreshCatalog`'s finally-equivalent path
  // below, so skeleton gates on admin pages can distinguish the pre-load
  // empty state from a post-load empty state.
  const [catalogHydrated, setCatalogHydrated] = useState<boolean>(() => !USE_API_AUTH);
  const [backendCatalogWarning, setBackendCatalogWarning] = useState<BackendCatalogWarning | null>(null);
  const [events, setEvents] = useState<EventDetail[]>(initialSnapshot.events);
  const [eventVisibility, setEventVisibility] = useState<EventVisibilityMap>(initialSnapshot.eventVisibility);
  const [users, setUsers] = useState<MockUser[]>(initialSnapshot.users);
  const [startups, setStartups] = useState<MockStartupProfile[]>(initialSnapshot.startups);
  const [userStartupLinks, setUserStartupLinks] = useState<MockUserStartupLink[]>(initialSnapshot.userStartupLinks);
  const [registrations, setRegistrations] = useState<MockEventRegistration[]>(initialSnapshot.registrations);
  const [backendEventIdBySlug, setBackendEventIdBySlug] = useState<Record<string, string>>({});
  // Tombstone set: slugs that the user has optimistically deleted in this
  // session. refreshCatalog filters these out when it re-fetches from the
  // backend, preventing the classic race where a concurrent refresh
  // resurrects an event whose DELETE hasn't committed yet. The ref
  // persists across renders without triggering re-render cycles.
  const deletedEventSlugsRef = useRef<Set<string>>(new Set(['gcio-demo-salon-2026']));
  const deletedUserIdsRef = useRef<Set<string>>(new Set());
  const registrationsRef = useRef<MockEventRegistration[]>(registrations);
  useEffect(() => {
    registrationsRef.current = registrations;
  }, [registrations]);

  const refreshCatalog = useCallback(async (): Promise<void> => {
    if (!USE_API_AUTH) {
      // Mock-mode path: catalog is already fully populated from
      // `initialSnapshot`, so we're "hydrated" by definition. Flag it
      // explicitly so the admin-skeleton gates never wait forever in
      // local development.
      setCatalogHydrated(true);
      return;
    }
    if (!getStoredAccessToken()) {
      // Not authenticated yet — the app is either on a public page or
      // still waiting for the user to sign in. Mark the catalog as
      // "hydrated" (in the sense of "we've done what we can") so pages
      // don't hang on a skeleton when there's genuinely nothing to fetch.
      setCatalogHydrated(true);
      return;
    }
    const failedResources: string[] = [];

    const fetchEventsPromise = (async () => {
      try {
        const rawEvents = await listEventsApi(200);
        const demoSalon = rawEvents.find((e) => e.slug === 'gcio-demo-salon-2026');
        if (demoSalon) {
          void deleteEventApi(String(demoSalon.id)).catch(() => {});
        }
        const idBySlug: Record<string, string> = {};
        rawEvents.forEach((e) => {
          idBySlug[e.slug] = String(e.id);
        });
        setBackendEventIdBySlug(idBySlug);

        const vis: EventVisibilityMap = {};
        rawEvents.forEach((e) => {
          vis[e.slug] = mapVisibilityFromApi(e.visibility_setting);
        });
        setEventVisibility(vis);

        const regChunks = await Promise.all(
          rawEvents.map((e) =>
            listEventRegistrationsApi(String(e.id), e.slug).catch(() => [] as MockEventRegistration[]),
          ),
        );
        const flatRegs = regChunks.flat();
        setRegistrations(flatRegs);

        const countBySlug = new Map<string, number>();
        flatRegs.forEach((r) => {
          countBySlug.set(r.eventId, (countBySlug.get(r.eventId) ?? 0) + 1);
        });
        const localSnap = loadMockDatabaseSnapshot().events;
        const localMap = new Map(localSnap.map((e) => [e.slug, e]));

        const detailList = rawEvents
          .filter((e) => !deletedEventSlugsRef.current.has(e.slug))
          .map((e) => {
            const mapped = mapApiEventToEventDetail(e, countBySlug.get(e.slug) ?? 0);
            const localOverride = localMap.get(e.slug);
            if (localOverride) {
              return {
                ...mapped,
                lifecycleStatus: localOverride.lifecycleStatus ?? mapped.lifecycleStatus,
                registrationOpen: localOverride.registrationOpen ?? mapped.registrationOpen,
              };
            }
            return mapped;
          });

        const existingSlugs = new Set(detailList.map((e) => e.slug));
        eventsData.forEach((defaultEv) => {
          if (!existingSlugs.has(defaultEv.slug) && !deletedEventSlugsRef.current.has(defaultEv.slug)) {
            const localOverride = localMap.get(defaultEv.slug);
            detailList.push(localOverride || defaultEv);
          }
        });
        setEvents(detailList);
      } catch {
        failedResources.push('events');
      }
    })();

    const fetchUsersPromise = (async () => {
      try {
        const allUsers: MockUser[] = [];
        let offset = 0;
        const batchSize = 500;
        while (true) {
          const batch = await listUsersApi(batchSize, offset);
          allUsers.push(...batch);
          if (batch.length < batchSize) break;
          offset += batchSize;
        }
        setUsers(allUsers.filter((u) => !deletedUserIdsRef.current.has(u.id)));
      } catch {
        failedResources.push('members');
      }
    })();

    const fetchStartupsPromise = (async () => {
      try {
        const sts = await listStartupsApi(500);
        setStartups(sts);
        const linkLists = await Promise.all(
          sts.map((s) => listStartupLinksApi(s.id).catch(() => [] as MockUserStartupLink[])),
        );
        setUserStartupLinks(linkLists.flat());
      } catch {
        failedResources.push('startups');
      }
    })();

    await Promise.allSettled([fetchEventsPromise, fetchUsersPromise, fetchStartupsPromise]);

    setBackendCatalogWarning(buildBackendCatalogWarning(failedResources));
    // Whichever resources succeeded or failed, this pass is done — mark
    // the catalog as hydrated so skeletons give way to the real arrays
    // (which may legitimately be empty for a brand-new tenant).
    setCatalogHydrated(true);
  }, []);

  useEffect(() => {
    if (!USE_API_AUTH) {
      return;
    }

    // Skip session hydration if no token exists (e.g. onboarding pages).
    // Without this guard, /users/me fires on every page mount and returns
    // 401 on unauthenticated pages, causing cascading React Query retries.
    const token = getStoredAccessToken();
    if (!token) {
      setApiSessionUser(null);
      setAuthHydrated(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const user = await fetchCurrentUserApi();
        if (!cancelled) {
          setApiSessionUser(user);
          if (user) {
            setStoredUser(user);
          } else {
            setStoredUser(null);
          }
        }
      } catch {
        // Transient network error: don't clear cached user if token is still valid
      } finally {
        if (!cancelled) {
          setAuthHydrated(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch public events on mount (no auth required) so public pages always show DB events
  useEffect(() => {
    if (!USE_API_AUTH) return;
    void (async () => {
      try {
        const rawEvents = await listEventsApi(200);
        const idBySlug: Record<string, string> = {};
        rawEvents.forEach((e) => { idBySlug[e.slug] = String(e.id); });
        setBackendEventIdBySlug(idBySlug);
        const vis: EventVisibilityMap = {};
        rawEvents.forEach((e) => { vis[e.slug] = mapVisibilityFromApi(e.visibility_setting); });
        setEventVisibility(vis);
        const detailList = rawEvents.map((e) => mapApiEventToEventDetail(e, 0));
        const existingSlugs = new Set(detailList.map((e) => e.slug));
        eventsData.forEach((defaultEv) => {
          if (!existingSlugs.has(defaultEv.slug)) {
            detailList.push(defaultEv);
          }
        });
        setEvents(detailList);
      } catch {
        // Static fallback already loaded via emptyCatalogSnapshot
      }
    })();
  }, []);

  useEffect(() => {
    if (!USE_API_AUTH || !apiSessionUser) {
      return;
    }
    void refreshCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps — refreshCatalog identity
    // changes on every render because its useCallback deps include state setters.
    // We only want this effect to fire when the user session changes, not on
    // every refreshCatalog identity change (which causes infinite re-fetch loops).
  }, [apiSessionUser?.id]);

  useEffect(() => {
    if (USE_API_AUTH) {
      return;
    }
    const snapshot: MockDatabaseSnapshot = {
      version: 1,
      currentUserId: null,
      events,
      users,
      startups,
      userStartupLinks,
      registrations,
      eventVisibility,
    };

    persistMockDatabaseSnapshot(snapshot).catch(() => {
      // Keep the UI optimistic even if local persistence fails.
    });
  }, [eventVisibility, events, registrations, startups, userStartupLinks, users]);

  const currentUser = useMemo((): MockUser | null => {
    if (USE_API_AUTH) {
      return apiSessionUser;
    }
    return users.find((user) => user.id === mockSessionUserId) ?? null;
  }, [apiSessionUser, mockSessionUserId, users]);

  const login = useCallback(
    async (email: string, password: string): Promise<MockUser | null> => {
      if (USE_API_AUTH) {
        try {
          const result = await loginWithPasswordApi(email, password);
          if (isApplicationPending(result)) {
            throw new Error('APPLICATION_PENDING');
          }
          if (isPreExistingProfile(result)) {
            throw new Error('PRE_EXISTING_PROFILE');
          }
          if (isTwoFaRequired(result)) {
            throw new Error('2FA_REQUIRED');
          }
          setApiSessionUser(result);
          return result;
        } catch (err) {
          if (err instanceof Error && (err.message === '2FA_REQUIRED' || err.message === 'APPLICATION_PENDING' || err.message === 'PRE_EXISTING_PROFILE')) throw err;
          throw err;
        }
      }

      if (password && password !== MOCK_DEMO_PASSWORD) {
        return null;
      }

      let user = users.find((candidate) => candidate.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        // Fallback to Admin for dummy login testing if email is unlisted
        user = users.find((candidate) => candidate.tier === 'admin') || users[0];
      }

      if (user) {
        setMockSessionUserIdState(user.id);
        setMockSessionUserId(user.id);
      }
      return user;
    },
    [users],
  );

  const demoLoginAs = useCallback(
    async (userId: string): Promise<MockUser | null> => {
      if (USE_API_AUTH) {
        try {
          const next = await demoLoginAsApi(userId, { skipAuthHeader: true });
          setApiSessionUser(next);
          return next;
        } catch {
          return null;
        }
      }

      const user = users.find((candidate) => candidate.id === userId);
      if (!user) return null;

      setMockSessionUserIdState(user.id);
      setMockSessionUserId(user.id);
      return user;
    },
    [users],
  );

  /**
   * Start a proxy session. Captures the current admin's access token in sessionStorage
   * BEFORE swapping to the target user, so `exitProxySession` can restore it later.
   * Call this instead of `demoLoginAs` when the intent is to proxy-and-return.
   */
  const beginProxySession = useCallback(
    async (targetUserId: string): Promise<MockUser | null> => {
      if (USE_API_AUTH) {
        const adminToken = getStoredAccessToken();
        if (typeof sessionStorage !== 'undefined') {
          if (adminToken) {
            sessionStorage.setItem('gcio_proxy_admin_token', adminToken);
          } else {
            sessionStorage.removeItem('gcio_proxy_admin_token');
          }
        }

        try {
          const next = await adminImpersonateApi(targetUserId);
          setApiSessionUser(next);
          return next;
        } catch {
          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.removeItem('gcio_proxy_admin_token');
          }
          return null;
        }
      }

      const next = await demoLoginAs(targetUserId);
      if (!next && typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('gcio_proxy_admin_token');
      }
      return next;
    },
    [demoLoginAs],
  );

  /**
   * End a proxy session by restoring the admin's previously stashed access token
   * and re-fetching their identity from /users/me. This avoids the trap where
   * `demoLoginAs(adminId)` fails because the admin isn't a demo persona.
   */
  const exitProxySession = useCallback(async (): Promise<MockUser | null> => {
    if (typeof sessionStorage === 'undefined') return null;

    const adminToken = sessionStorage.getItem('gcio_proxy_admin_token');
    if (!adminToken) return null;

    if (USE_API_AUTH) {
      // Restore the admin's JWT so the next API call authenticates as the admin.
      setStoredAccessToken(adminToken);
      try {
        const me = await fetchCurrentUserApi();
        if (!me) {
          // Admin token expired mid-proxy — clean up and bail out.
          setStoredAccessToken(null);
          sessionStorage.removeItem('gcio_proxy_admin_token');
          sessionStorage.removeItem('gcio_proxy_admin_id');
          setApiSessionUser(null);
          return null;
        }
        setApiSessionUser(me);
        sessionStorage.removeItem('gcio_proxy_admin_token');
        sessionStorage.removeItem('gcio_proxy_admin_id');
        return me;
      } catch {
        setStoredAccessToken(null);
        sessionStorage.removeItem('gcio_proxy_admin_token');
        sessionStorage.removeItem('gcio_proxy_admin_id');
        setApiSessionUser(null);
        return null;
      }
    }

    // Mock-mode fallback: the admin id is stashed separately; use demoLoginAs on it.
    const adminId = sessionStorage.getItem('gcio_proxy_admin_id');
    sessionStorage.removeItem('gcio_proxy_admin_token');
    sessionStorage.removeItem('gcio_proxy_admin_id');
    if (!adminId) return null;
    return demoLoginAs(adminId);
  }, [demoLoginAs]);

  /**
   * Multi-profile switcher: swap session into a profile linked to the
   * current user via the user_profile_links table. The backend verifies
   * the link exists in either direction before issuing a JWT for the
   * target. No banner — this is a peer-to-peer swap, not a proxy.
   */
  const switchToLinkedProfile = useCallback(
    async (targetUserId: string): Promise<MockUser | null> => {
      if (!USE_API_AUTH) return null;
      try {
        const { switchProfileApi } = await import('@/portal/api/profileLinks');
        const { mapApiUserToMockUser } = await import('@/portal/types/auth');
        const res = await switchProfileApi(targetUserId);
        if (res.access_token) {
          setStoredAccessToken(res.access_token);
        }
        const next = mapApiUserToMockUser(res.user as unknown as Parameters<typeof mapApiUserToMockUser>[0]);
        setApiSessionUser(next);
        return next;
      } catch {
        return null;
      }
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    if (USE_API_AUTH) {
      try {
        await logoutApi();
      } catch {
        // Still clear local session if the server round-trip fails.
      }
      setApiSessionUser(null);
      setEvents([]);
      setUsers([]);
      setStartups([]);
      setUserStartupLinks([]);
      setRegistrations([]);
      setEventVisibility({});
      setBackendEventIdBySlug({});
      setBackendCatalogWarning(null);
      return;
    }

    setMockSessionUserIdState(null);
    setMockSessionUserId(null);
  }, []);

  const switchUser = useCallback(
    async (userId: string): Promise<void> => {
      const user = users.find((candidate) => candidate.id === userId);
      if (!user) {
        return;
      }

      if (USE_API_AUTH) {
        try {
          const next = await switchUserApi(userId);
          setApiSessionUser(next);
        } catch {
          setApiSessionUser(null);
        }
        return;
      }

      setMockSessionUserIdState(user.id);
      setMockSessionUserId(user.id);
    },
    [users],
  );

  const updateProfile = useCallback(
    (updates: Partial<MockUser>): void => {
      if (!currentUser) return;

      if (USE_API_AUTH) {
        setUsers((prev) =>
          prev.map((user) =>
            user.id === currentUser.id ? { ...user, ...updates, updatedAt: nowIso() } : user,
          ),
        );
        setApiSessionUser((prev) =>
          prev && prev.id === currentUser.id ? { ...prev, ...updates, updatedAt: nowIso() } : prev,
        );
        const body: PatchUserBody = {};
        if (updates.name !== undefined) body.name = updates.name.trim();
        if (updates.phone !== undefined) body.phone = updates.phone.trim();
        if (updates.linkedin !== undefined) body.linkedin = updates.linkedin.trim();
        if (updates.companyAffiliation !== undefined) {
          body.company_affiliation = updates.companyAffiliation.trim();
        }
        if (updates.role !== undefined) body.role = updates.role.trim();
        if (updates.aboutMe !== undefined) body.about_me = updates.aboutMe.trim();
        if (Object.keys(body).length === 0) {
          return;
        }
        void patchUserApi(currentUser.id, body)
          .then((u) => {
            setUsers((prev) => prev.map((user) => (user.id === u.id ? u : user)));
            setApiSessionUser((prev) => (prev?.id === u.id ? u : prev));
          })
          .catch(() => {
            void refreshCatalog();
          });
        return;
      }

      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUser.id ? { ...user, ...updates, updatedAt: nowIso() } : user,
        ),
      );
    },
    [currentUser, refreshCatalog],
  );

  const createUser = useCallback(async (input: AdminUserInput): Promise<MockUser> => {
    const timestamp = nowIso();
    const localUser: MockUser = {
      id: createId('usr'),
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone.trim(),
      linkedin: input.linkedin.trim(),
      companyAffiliation: input.companyAffiliation.trim(),
      role: input.role.trim(),
      aboutMe: input.aboutMe.trim(),
      tier: input.tier,
      advisoryHourlyRate: input.advisoryHourlyRate ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    if (USE_API_AUTH) {
      const aboutMe = localUser.aboutMe.length >= 10
        ? localUser.aboutMe
        : `${localUser.aboutMe} — created via admin`;

      try {
        const { user: apiUser, inviteToken } = await adminCreateUserApi({
          email: localUser.email,
          name: localUser.name,
          phone: localUser.phone || undefined,
          linkedin: localUser.linkedin || undefined,
          company_affiliation: localUser.companyAffiliation || undefined,
          role: localUser.role || undefined,
          about_me: aboutMe || undefined,
          tier: input.tier,
          advisory_hourly_rate: input.advisoryHourlyRate != null ? Number(input.advisoryHourlyRate) || undefined : undefined,
        }, { sandbox: !!(input as Record<string, unknown>).sandbox });

        setUsers((prev) => [apiUser, ...prev]);

        if (inviteToken) {
          toast.success(
            `User created. Onboarding link: ${window.location.origin}/onboard?token=${inviteToken}`,
          );
        }

        return apiUser;
      } catch (err) {
        console.warn('[createUser] API creation failed, falling back to local-only:', err);
        setUsers((prev) => [localUser, ...prev]);
        return localUser;
      }
    }

    setUsers((prev) => [localUser, ...prev]);
    return localUser;
  }, []);

  const updateUserById = useCallback(
    (userId: string, updates: Partial<MockUser>): MockUser | null => {
      const existing = users.find((user) => user.id === userId);
      if (!existing) return null;

      const updatedUser: MockUser = {
        ...existing,
        ...updates,
        email: updates.email?.trim().toLowerCase() ?? existing.email,
        updatedAt: nowIso(),
      };

      setUsers((prev) => prev.map((user) => (user.id === userId ? updatedUser : user)));

      if (USE_API_AUTH) {
        const body: PatchUserBody = {};
        if (updates.name !== undefined) body.name = updates.name.trim();
        if (updates.phone !== undefined) body.phone = updates.phone.trim();
        if (updates.linkedin !== undefined) body.linkedin = updates.linkedin.trim();
        if (updates.companyAffiliation !== undefined) {
          body.company_affiliation = updates.companyAffiliation.trim();
        }
        if (updates.role !== undefined) body.role = updates.role.trim();
        if (updates.aboutMe !== undefined) body.about_me = updates.aboutMe.trim();
        if ('enterpriseSize' in updates) body.enterprise_size = updates.enterpriseSize ?? null;
        if ('companySize' in updates) body.company_size = updates.companySize ?? null;
        if ('isStudent' in updates) body.is_student = updates.isStudent ?? false;
        if ('advisoryHourlyRate' in updates) body.advisory_hourly_rate = updates.advisoryHourlyRate ?? null;
        if (updates.avatarUrl !== undefined) body.avatar_url = updates.avatarUrl?.trim() || null;
        if (Object.keys(body).length > 0) {
          void patchUserApi(userId, body)
            .then((u) => {
              setUsers((prev) => prev.map((user) => (user.id === u.id ? u : user)));
              setApiSessionUser((prev) => (prev?.id === u.id ? u : prev));
            })
            .catch(() => {
              void refreshCatalog();
            });
        }
      }

      return updatedUser;
    },
    [refreshCatalog, users],
  );

  const removeUserById = useCallback(
    (userId: string): void => {
      deletedUserIdsRef.current.add(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setUserStartupLinks((prev) => prev.filter((link) => link.userId !== userId));
      setRegistrations((prev) => prev.filter((registration) => registration.userId !== userId));
      if (mockSessionUserId === userId) {
        setMockSessionUserIdState(null);
        setMockSessionUserId(null);
      }
      if (!USE_API_AUTH) {
        return;
      }
      void deleteUserApi(userId)
        .then(() => {
          deletedUserIdsRef.current.delete(userId);
          if (apiSessionUser?.id === userId) {
            void logout();
            return;
          }
          void refreshCatalog();
        })
        .catch(() => {
          deletedUserIdsRef.current.delete(userId);
          void refreshCatalog();
        });
    },
    [apiSessionUser?.id, logout, mockSessionUserId, refreshCatalog],
  );

  const getLinkedStartup = useCallback(
    (userId?: string): MockStartupProfile | undefined => {
      const effectiveUserId = userId ?? currentUser?.id;
      if (!effectiveUserId) return undefined;

      const link = userStartupLinks.find((item) => item.userId === effectiveUserId);
      return startups.find((startup) => startup.id === link?.startupId);
    },
    [currentUser?.id, startups, userStartupLinks],
  );

  const getStartupMembers = useCallback(
    (startupId: string): MockUser[] => {
      const memberIds = userStartupLinks
        .filter((link) => link.startupId === startupId)
        .map((link) => link.userId);

      return users.filter((user) => memberIds.includes(user.id));
    },
    [userStartupLinks, users],
  );

  const getUserRegistrations = useCallback(
    (userId?: string): MockEventRegistration[] => {
      const effectiveUserId = userId ?? currentUser?.id;
      if (!effectiveUserId) return [];
      return registrations.filter((registration) => registration.userId === effectiveUserId);
    },
    [currentUser?.id, registrations],
  );

  const createStartupProfile = useCallback(
    async (input: {
      companyName: string;
      companyWebsite: string;
      description: string;
    }): Promise<MockStartupProfile | null> => {
      if (!currentUser) return null;

      if (USE_API_AUTH) {
        try {
          const domain = toDomain(input.companyWebsite.trim());
          let description = input.description.trim();
          if (description.length < 20) {
            description = `${description} — GCXO web profile`;
          }
          const startup = await createStartupApi({
            company_name: input.companyName.trim(),
            company_website: normalizeUrl(input.companyWebsite),
            company_domain: domain,
            description,
          });
          setStartups((prev) => [startup, ...prev.filter((s) => s.id !== startup.id)]);
          const links = await listStartupLinksApi(startup.id).catch(() => [] as MockUserStartupLink[]);
          setUserStartupLinks((prev) => [
            ...prev.filter((link) => link.userId !== currentUser.id),
            ...links,
          ]);
          const timestamp = nowIso();
          setUsers((prev) =>
            prev.map((user) =>
              user.id === currentUser.id
                ? { ...user, companyAffiliation: startup.companyName, updatedAt: timestamp }
                : user,
            ),
          );
          setApiSessionUser((prev) =>
            prev && prev.id === currentUser.id
              ? { ...prev, companyAffiliation: startup.companyName, updatedAt: timestamp }
              : prev,
          );
          return startup;
        } catch {
          return null;
        }
      }

      const startupId = createId('sup');
      const timestamp = nowIso();
      const startup: MockStartupProfile = {
        id: startupId,
        companyName: input.companyName.trim(),
        companyWebsite: normalizeUrl(input.companyWebsite),
        companyDomain: toDomain(input.companyWebsite.trim()),
        description: input.description.trim(),
        registeredBy: currentUser.id,
        isVerified: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      setStartups((prev) => [startup, ...prev]);
      setUserStartupLinks((prev) => [
        ...prev.filter((link) => link.userId !== currentUser.id),
        {
          id: `lnk-${startupId}-${currentUser.id}`,
          userId: currentUser.id,
          startupId,
          role: 'founder',
          linkedAt: timestamp,
        },
      ]);
      setUsers((prev) =>
        prev.map((user) =>
          user.id === currentUser.id
            ? { ...user, companyAffiliation: startup.companyName, updatedAt: timestamp }
            : user,
        ),
      );

      return startup;
    },
    [currentUser],
  );

  const updateStartupProfile = useCallback(
    (
      startupId: string,
      updates: Partial<Pick<MockStartupProfile, 'companyName' | 'companyWebsite' | 'description' | 'isVerified'>>,
    ): MockStartupProfile | null => {
      const existing = startups.find((startup) => startup.id === startupId);
      if (!existing) return null;

      const companyWebsite = updates.companyWebsite
        ? normalizeUrl(updates.companyWebsite)
        : existing.companyWebsite;
      const updatedStartup: MockStartupProfile = {
        ...existing,
        ...updates,
        companyWebsite,
        companyDomain: toDomain(companyWebsite),
        companyName: updates.companyName?.trim() ?? existing.companyName,
        description: updates.description?.trim() ?? existing.description,
        updatedAt: nowIso(),
      };

      setStartups((prev) => prev.map((startup) => (startup.id === startupId ? updatedStartup : startup)));
      setUsers((prev) =>
        prev.map((user) => {
          const isMember = userStartupLinks.some(
            (link) => link.userId === user.id && link.startupId === startupId,
          );

          return isMember
            ? { ...user, companyAffiliation: updatedStartup.companyName, updatedAt: nowIso() }
            : user;
        }),
      );

      if (USE_API_AUTH) {
        const body: {
          company_name?: string;
          company_website?: string;
          description?: string;
          is_verified?: boolean;
        } = {};
        if (updates.companyName !== undefined) body.company_name = updates.companyName.trim();
        if (updates.companyWebsite !== undefined) {
          body.company_website = normalizeUrl(updates.companyWebsite);
        }
        if (updates.description !== undefined) {
          let d = updates.description.trim();
          if (d.length < 20) {
            d = `${d} — GCXO web profile`;
          }
          body.description = d;
        }
        if (updates.isVerified !== undefined) body.is_verified = updates.isVerified;
        if (Object.keys(body).length > 0) {
          void patchStartupApi(startupId, body)
            .then((s) => {
              setStartups((prev) => prev.map((x) => (x.id === s.id ? s : x)));
            })
            .catch(() => {
              void refreshCatalog();
            });
        }
      }

      return updatedStartup;
    },
    [refreshCatalog, startups, userStartupLinks],
  );

  const createEvent = useCallback(
    async (input: Parameters<AuthContextType['createEvent']>[0]): Promise<EventDetail> => {
      if (USE_API_AUTH) {
        const { start, end } = parseEventDateRange(input.date);
        const slug =
          slugify(input.slug?.trim() || input.title) ||
          `event-${Date.now().toString(36)}`;
        const hero = input.heroImage?.trim() || sfConferenceImages.banner;
        const banner = input.bannerImage?.trim() || hero;
        const body: Record<string, unknown> = {
          slug,
          title: input.title.trim(),
          tagline: input.tagline?.trim() || null,
          date_start: start.toISOString(),
          date_end: end.toISOString(),
          location: input.location.trim(),
          description: input.description.trim(),
          overview: input.overview.trim(),
          hero_image: hero,
          banner_image: banner,
          registration_open: input.registrationOpen,
          lifecycle_status: input.lifecycleStatus ?? 'current',
          luma_event_url: input.lumaUrl?.trim() || null,
          visibility_setting: DEFAULT_API_VISIBILITY,
          event_metadata: {
            objectives: input.objectives ?? [],
            highlights: input.highlights ?? [],
            highlightCards: input.highlightCards ?? [],
            title: `Global CXO Circle | ${input.title.trim()}`,
            description: input.description.trim(),
            image: banner,
          },
          venue: {
            name: input.venueName?.trim() || `${input.title.trim()} venue`,
            address: input.venueAddress?.trim() || input.location.trim(),
            description:
              input.venueDescription?.trim() ||
              `Venue for ${input.title.trim()} (created via admin).`,
            image: input.venueImage?.trim() || sfConferenceImages.card,
            mapEmbedUrl: input.venueMapEmbedUrl?.trim() || '',
          },
          cta_config: (input.ctaPrimaryLabel && input.ctaPrimaryUrl) ? {
            primaryLabel: input.ctaPrimaryLabel.trim(),
            primaryUrl: input.ctaPrimaryUrl.trim(),
            isExternal: input.ctaIsExternal ?? false,
          } : null,
          speakers_json: input.speakers ?? [],
          sponsors_json: input.sponsors ?? [],
          itinerary_json: input.itinerary ?? [],
        };
        try {
          const { event, raw } = await createEventApi(body);
          setBackendEventIdBySlug((prev) => ({ ...prev, [raw.slug]: String(raw.id) }));
          setEvents((prev) => [event, ...prev.filter((e) => e.slug !== event.slug)]);
          setEventVisibility((prev) => ({
            ...prev,
            [event.slug]: mapVisibilityFromApi(raw.visibility_setting),
          }));
          return event;
        } catch {
          const fallback = buildEventDetail(input, events);
          setEvents((prev) => [fallback, ...prev]);
          setEventVisibility((prev) => ({
            ...prev,
            [fallback.slug]: {
              startupCanSee: ['startup'],
              cxoCanSee: ['startup', 'cxo', 'vc'],
              vcCanSee: ['startup', 'vc'],
            },
          }));
          return fallback;
        }
      }

      const event = buildEventDetail(input, events);
      setEvents((prev) => [event, ...prev]);
      setEventVisibility((prev) => ({
        ...prev,
        [event.slug]: prev[event.slug]
          ? cloneVisibility(prev[event.slug])
          : { startupCanSee: ['startup'], cxoCanSee: ['startup', 'cxo', 'vc'], vcCanSee: ['startup', 'vc'] },
      }));
      return event;
    },
    [events],
  );

  const updateEvent = useCallback(
    (slug: string, updates: EventMutationInput, skipApiPatch?: boolean): EventDetail | null => {
      const existing = events.find((event) => event.slug === slug);
      if (!existing) return null;

      const nextRegistrationOpen = updates.registrationOpen ?? existing.registrationOpen ?? false;
      const nextLifecycleStatus =
        updates.lifecycleStatus ?? existing.lifecycleStatus ?? (nextRegistrationOpen ? 'current' : 'past');

      let nextShowHeroPromo = updates.showHeroPromo ?? existing.showHeroPromo ?? false;
      if (nextLifecycleStatus === 'past' || nextLifecycleStatus === 'archived' || !nextRegistrationOpen) {
        nextShowHeroPromo = false;
      }

      const nextTitle = updates.title?.trim() || existing.title;
      const nextDescription = updates.description?.trim() || existing.description;
      const nextObjectives =
        updates.objectives?.map((objective) => objective.trim()).filter(Boolean) ?? existing.objectives;
      const nextLumaUrl = updates.lumaUrl !== undefined
        ? updates.lumaUrl.trim()
        : existing.cta?.isExternal
          ? existing.cta.primaryUrl
          : undefined;

      const updated: EventDetail = {
        ...existing,
        ...updates,
        title: nextTitle,
        tagline: updates.tagline?.trim() ?? existing.tagline,
        date: updates.date?.trim() ?? existing.date,
        location: updates.location?.trim() ?? existing.location,
        attendees: updates.attendees?.trim() ?? existing.attendees,
        description: nextDescription,
        overview: updates.overview?.trim() ?? existing.overview,
        heroImage: updates.heroImage?.trim() ?? existing.heroImage,
        heroImageMobile: updates.heroImageMobile?.trim() ?? existing.heroImageMobile,
        bannerImage: updates.bannerImage?.trim() ?? existing.bannerImage,
        cardImage: updates.cardImage?.trim() ?? existing.cardImage,
        objectives: nextObjectives,
        highlights: updates.highlights ?? (nextObjectives.length > 0 ? nextObjectives : existing.highlights),
        highlightCards: updates.highlightCards ?? existing.highlightCards,
        speakers: updates.speakers ?? existing.speakers,
        sponsors: updates.sponsors ?? existing.sponsors,
        itinerary: updates.itinerary ?? existing.itinerary,
        livestreamUrl: updates.livestreamUrl !== undefined ? updates.livestreamUrl.trim() : existing.livestreamUrl,
        galleryUrl: updates.galleryUrl !== undefined ? updates.galleryUrl.trim() : existing.galleryUrl,
        lifecycleStatus: nextLifecycleStatus,
        registrationOpen: nextRegistrationOpen,
        showHeroPromo: nextShowHeroPromo,
        cta: (updates.ctaPrimaryLabel && updates.ctaPrimaryUrl) ? {
          primaryLabel: updates.ctaPrimaryLabel.trim(),
          primaryUrl: updates.ctaPrimaryUrl.trim(),
          isExternal: updates.ctaIsExternal ?? false,
          secondaryLabel: updates.ctaSecondaryLabel?.trim(),
          secondaryUrl: updates.ctaSecondaryUrl?.trim(),
        } : buildEventCta(existing.slug, nextRegistrationOpen, nextLumaUrl),
        metadata: {
          ...existing.metadata,
          title: `Global CXO Circle | ${nextTitle}`,
          description: nextDescription,
          image: updates.bannerImage?.trim() || existing.bannerImage || existing.heroImage,
        },
        venue: {
          ...existing.venue,
          name: updates.venueName?.trim() ?? existing.venue.name,
          address: updates.venueAddress?.trim() ?? existing.venue.address,
          description: updates.venueDescription?.trim() ?? existing.venue.description,
          image: updates.venueImage?.trim() ?? existing.venue.image,
          mapEmbedUrl: updates.venueMapEmbedUrl?.trim() ?? existing.venue.mapEmbedUrl,
        },
      };

      setEvents((prev) =>
        prev.map((event) => {
          if (event.slug === slug) return updated;
          if (nextShowHeroPromo) return { ...event, showHeroPromo: false };
          return event;
        })
      );

      const snap = loadMockDatabaseSnapshot();
      snap.events = snap.events.map((e) => {
        if (e.slug === slug) return updated;
        if (nextShowHeroPromo) return { ...e, showHeroPromo: false };
        return e;
      });
      if (!snap.events.some((e) => e.slug === slug)) {
        snap.events.unshift(updated);
      }
      void persistMockDatabaseSnapshot(snap).catch(() => {
        // Keep the UI optimistic even if local persistence fails.
      });

      if (USE_API_AUTH && !skipApiPatch) {
        const bid = backendEventIdBySlug[slug];
        if (bid) {
          const body: Record<string, unknown> = {};
          if (updates.title !== undefined) body.title = updates.title.trim();
          if (updates.tagline !== undefined) body.tagline = updates.tagline.trim() || null;
          if (updates.location !== undefined) body.location = updates.location.trim();
          if (updates.description !== undefined) body.description = updates.description.trim();
          if (updates.overview !== undefined) body.overview = updates.overview.trim();
          if (updates.heroImage !== undefined) body.hero_image = updates.heroImage.trim();
          if (updates.bannerImage !== undefined) body.banner_image = updates.bannerImage.trim();
          if (updates.registrationOpen !== undefined) body.registration_open = updates.registrationOpen;
          if (updates.lifecycleStatus !== undefined) body.lifecycle_status = updates.lifecycleStatus;
          if (updates.lumaUrl !== undefined) {
            body.luma_event_url = updates.lumaUrl.trim() || null;
          }
          if (updates.galleryUrl !== undefined) {
            body.gallery_url = updates.galleryUrl.trim() || null;
          }
          if (
            updates.venueName !== undefined ||
            updates.venueAddress !== undefined ||
            updates.venueDescription !== undefined ||
            updates.venueImage !== undefined ||
            updates.venueMapEmbedUrl !== undefined
          ) {
            body.venue = {
              name: updates.venueName?.trim() ?? existing.venue.name,
              address: updates.venueAddress?.trim() ?? existing.venue.address,
              description: updates.venueDescription?.trim() ?? existing.venue.description,
              image: updates.venueImage?.trim() ?? existing.venue.image,
              mapEmbedUrl: updates.venueMapEmbedUrl?.trim() ?? existing.venue.mapEmbedUrl ?? '',
            };
          }
          if (updates.objectives !== undefined) {
            body.event_metadata = {
              objectives: updates.objectives,
              title: updated.metadata.title,
              description: updated.metadata.description,
              image: updated.metadata.image,
            };
          }
          if (Object.keys(body).length > 0) {
            void patchEventApi(bid, body)
              .then((detail) => {
                setEvents((prev) =>
                  mergeRegistrationCounts(
                    prev.map((e) => (e.slug === slug ? detail : e)),
                    registrationsRef.current,
                  ),
                );
              })
              .catch(() => {
                void refreshCatalog();
              });
          }
        } else {
          const body: Record<string, unknown> = {
            title: updated.title,
            tagline: updated.tagline ?? null,
            slug: updated.slug,
            location: updated.location,
            description: updated.description,
            overview: updated.overview,
            registration_open: updated.registrationOpen ?? false,
            lifecycle_status: updated.lifecycleStatus ?? 'current',
            luma_event_url: updated.cta?.isExternal ? updated.cta.primaryUrl : null,
            visibility_setting: 'all',
            event_metadata: {
              objectives: updated.objectives ?? [],
              highlights: updated.highlights ?? [],
              highlightCards: updated.highlightCards ?? [],
              title: updated.metadata.title,
              description: updated.metadata.description,
              image: updated.bannerImage || updated.heroImage,
            },
            venue: {
              name: updated.venue.name,
              address: updated.venue.address,
              description: updated.venue.description,
              image: updated.venue.image,
              mapEmbedUrl: updated.venue.mapEmbedUrl || '',
            },
            cta_config: updated.cta ? {
              primaryLabel: updated.cta.primaryLabel,
              primaryUrl: updated.cta.primaryUrl,
              isExternal: updated.cta.isExternal ?? false,
            } : null,
            speakers_json: updated.speakers ?? [],
            sponsors_json: updated.sponsors ?? [],
            itinerary_json: updated.itinerary ?? [],
          };
          void createEventApi(body)
            .then(({ raw }) => {
              setBackendEventIdBySlug((prev) => ({ ...prev, [raw.slug]: String(raw.id) }));
            })
            .catch(() => {});
        }
      }

      return updated;
    },
    [backendEventIdBySlug, events, refreshCatalog],
  );

  const deleteEvent = useCallback(async (slug: string): Promise<number | undefined> => {
    const previousEvents = events;
    const previousRegistrations = registrations;
    const previousVisibility = eventVisibility;
    const previousBackendMap = backendEventIdBySlug;

    // ── Cache-first: tombstone the slug BEFORE touching any state.
    // This ensures that even if a concurrent refreshCatalog re-fetches
    // events from the backend mid-delete, the event stays dead in the
    // UI. The tombstone is the single source of truth for "this event
    // has been deleted in this session."
    deletedEventSlugsRef.current.add(slug);

    // Optimistic removal from every local cache surface.
    setEvents((prev) => prev.filter((event) => event.slug !== slug));
    setRegistrations((prev) => prev.filter((registration) => registration.eventId !== slug));
    setEventVisibility((prev) => {
      const next = { ...prev };
      delete next[slug];
      return next;
    });

    if (USE_API_AUTH) {
      const bid = backendEventIdBySlug[slug];
      if (bid) {
        setBackendEventIdBySlug((prev) => {
          const next = { ...prev };
          delete next[slug];
          return next;
        });
        try {
          const result = await deleteEventApi(bid);
          // Delete committed to DB — tombstone stays permanently so no
          // future refresh can ever resurrect this event.
          return result.queued_email_count;
        } catch (error) {
          // API failed — rollback: remove the tombstone and restore all
          // local state so the event reappears in the UI.
          deletedEventSlugsRef.current.delete(slug);
          setEvents(previousEvents);
          setRegistrations(previousRegistrations);
          setEventVisibility(previousVisibility);
          setBackendEventIdBySlug(previousBackendMap);
          throw error;
        }
      }
    }
    return undefined;
  }, [backendEventIdBySlug, eventVisibility, events, registrations]);

  const updateEventVisibility = useCallback(
    (slug: string, settings: VisibilitySetting): void => {
      setEventVisibility((prev) => ({
        ...prev,
        [slug]: cloneVisibility(settings),
      }));
      if (USE_API_AUTH) {
        const bid = backendEventIdBySlug[slug];
        if (bid) {
          void patchEventApi(bid, {
            visibility_setting: mapVisibilityToApi(settings),
          }).catch(() => {
            void refreshCatalog();
          });
        }
      }
    },
    [backendEventIdBySlug, refreshCatalog],
  );

  const registerForEvent = useCallback(
    async (eventId: string): Promise<{ success: boolean; message: string }> => {
      if (!currentUser) {
        return { success: false, message: 'Please log in first.' };
      }

      const event = events.find((candidate) => candidate.slug === eventId);
      if (!event) {
        return { success: false, message: 'Event not found.' };
      }

      if (resolveEventLifecycle(event) !== 'current') {
        return { success: false, message: 'Registration is only available for current events.' };
      }

      const existing = registrations.find(
        (registration) =>
          registration.userId === currentUser.id &&
          registration.eventId === eventId &&
          registration.status !== 'cancelled',
      );
      if (existing) {
        return { success: false, message: 'You are already registered for this event.' };
      }

      const linkedStartup =
        currentUser.tier === 'startup' ? getLinkedStartup(currentUser.id) : undefined;
      if (currentUser.tier === 'startup' && !linkedStartup) {
        return { success: false, message: 'Create or link a startup profile before registering.' };
      }

      const cancelledRegistration = registrations.find(
        (registration) =>
          registration.userId === currentUser.id &&
          registration.eventId === eventId &&
          registration.status === 'cancelled',
      );
      if (cancelledRegistration) {
        setRegistrations((prev) =>
          prev.map((registration) =>
            registration.id === cancelledRegistration.id
              ? { ...registration, status: 'confirmed' }
              : registration,
          ),
        );
        return { success: true, message: 'Registration restored.' };
      }

      if (USE_API_AUTH) {
        const bid = backendEventIdBySlug[eventId];
        if (!bid) {
          return { success: false, message: 'Event is not available for API registration yet.' };
        }
        try {
          const registration = await createEventRegistrationApi(bid, {
            event_id: bid,
            startup_id: linkedStartup?.id ?? null,
          });
          const withoutDup = registrations.filter(
            (r) => !(r.userId === registration.userId && r.eventId === registration.eventId),
          );
          const nextRegs = [registration, ...withoutDup];
          setRegistrations(nextRegs);
          setEvents((prev) => mergeRegistrationCounts(prev, nextRegs));
          return {
            success: true,
            message:
              registration.status === 'pending'
                ? 'Registration submitted; pending confirmation.'
                : 'Registration confirmed.',
          };
        } catch (e: unknown) {
          const msg =
            e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'Registration failed.';
          return { success: false, message: msg };
        }
      }

      const registration: MockEventRegistration = {
        id: createId('reg'),
        userId: currentUser.id,
        eventId,
        startupId: linkedStartup?.id,
        status: 'confirmed',
        registeredAt: nowIso(),
      };

      setRegistrations((prev) => [registration, ...prev]);
      return { success: true, message: 'Registration confirmed.' };
    },
    [backendEventIdBySlug, currentUser, events, getLinkedStartup, registrations],
  );

  const unregisterFromEvent = useCallback(
    (eventId: string, userId?: string): { success: boolean; message: string } => {
      const effectiveUserId = userId ?? currentUser?.id;
      if (!effectiveUserId) {
        return { success: false, message: 'Please log in first.' };
      }

      const existing = registrations.find(
        (registration) =>
          registration.userId === effectiveUserId &&
          registration.eventId === eventId &&
          registration.status !== 'cancelled',
      );

      if (!existing) {
        return { success: false, message: 'No active registration found for this event.' };
      }

      setRegistrations((prev) =>
        prev.map((registration) =>
          registration.id === existing.id
            ? { ...registration, status: 'cancelled' }
            : registration,
        ),
      );

      // Sync cancellation to backend (no PATCH endpoint yet, so refresh catalog for consistency)
      if (USE_API_AUTH) {
        void refreshCatalog();
      }

      return { success: true, message: 'Registration cancelled.' };
    },
    [currentUser?.id, refreshCatalog, registrations],
  );

  const restoreRegistration = useCallback(
    (eventId: string, userId?: string): { success: boolean; message: string } => {
      const effectiveUserId = userId ?? currentUser?.id;
      if (!effectiveUserId) {
        return { success: false, message: 'Please log in first.' };
      }

      const event = events.find((candidate) => candidate.slug === eventId);
      if (!event) {
        return { success: false, message: 'Event not found.' };
      }

      if (resolveEventLifecycle(event) !== 'current') {
        return { success: false, message: 'Only current events can be restored.' };
      }

      const cancelledRegistration = registrations.find(
        (registration) =>
          registration.userId === effectiveUserId &&
          registration.eventId === eventId &&
          registration.status === 'cancelled',
      );

      if (!cancelledRegistration) {
        return { success: false, message: 'No cancelled registration found for this event.' };
      }

      setRegistrations((prev) =>
        prev.map((registration) =>
          registration.id === cancelledRegistration.id
            ? { ...registration, status: 'confirmed' }
            : registration,
        ),
      );

      if (USE_API_AUTH) {
        const bid = backendEventIdBySlug[eventId];
        if (bid) {
          // May 409 if registration still exists on backend; refresh to reconcile
          void createEventRegistrationApi(bid, {
            event_id: bid,
            startup_id: cancelledRegistration.startupId ?? null,
          }).catch(() => {
            void refreshCatalog();
          });
        } else {
          void refreshCatalog();
        }
      }

      return { success: true, message: 'Registration restored.' };
    },
    [backendEventIdBySlug, currentUser?.id, events, refreshCatalog, registrations],
  );

  const registerAttendeeForEvent = useCallback(
    async (
      eventId: string,
      input: { existingUserId?: string; attendee?: AdminEventAttendeeInput },
    ): Promise<{ success: boolean; message: string; user?: MockUser; registration?: MockEventRegistration }> => {
      let user = input.existingUserId
        ? users.find((candidate) => candidate.id === input.existingUserId)
        : undefined;

      if (!user && input.attendee) {
        const existingByEmail = users.find(
          (candidate) => candidate.email.toLowerCase() === input.attendee!.email.trim().toLowerCase(),
        );
        user = existingByEmail ?? await createUser(input.attendee);
      }

      if (!user) {
        return { success: false, message: 'Select an existing user or provide attendee details.' };
      }

      const existingRegistration = registrations.find(
        (registration) => registration.userId === user!.id && registration.eventId === eventId,
      );

      const linkedStartup = getLinkedStartup(user.id);
      const registration: MockEventRegistration = existingRegistration
        ? {
            ...existingRegistration,
            status: input.attendee?.status ?? 'confirmed',
            startupId: input.attendee?.startupId ?? linkedStartup?.id ?? existingRegistration.startupId,
            registeredAt: existingRegistration.registeredAt,
          }
        : {
            id: createId('reg'),
            userId: user.id,
            eventId,
            startupId: input.attendee?.startupId ?? linkedStartup?.id,
            status: input.attendee?.status ?? 'confirmed',
            registeredAt: nowIso(),
          };

      setRegistrations((prev) =>
        existingRegistration
          ? prev.map((item) => (item.id === existingRegistration.id ? registration : item))
          : [registration, ...prev],
      );

      if (USE_API_AUTH) {
        const bid = backendEventIdBySlug[eventId];
        if (bid && !existingRegistration) {
          // No PATCH endpoint for registration updates yet — only create new ones
          void createEventRegistrationApi(bid, {
            event_id: bid,
            startup_id: registration.startupId ?? null,
          }).catch(() => {
            void refreshCatalog();
          });
        } else {
          void refreshCatalog();
        }
      }

      return {
        success: true,
        message: existingRegistration ? 'Attendee updated for this event.' : 'Attendee added to event.',
        user,
        registration,
      };
    },
    [backendEventIdBySlug, createUser, getLinkedStartup, refreshCatalog, registrations, users],
  );

  const importEventAttendees = useCallback(
    (eventId: string, rows: AdminEventAttendeeInput[]): { added: number; updated: number; skipped: number } => {
      let added = 0;
      let updated = 0;
      let skipped = 0;

      const nextUsers = [...users];
      const nextRegistrations = [...registrations];

      const apiRegistrationPromises: Promise<unknown>[] = [];
      const backendEventId = USE_API_AUTH ? backendEventIdBySlug[eventId] : undefined;

      rows.forEach((row) => {
        if (!row.name || !row.email || !row.role || !row.companyAffiliation) {
          skipped += 1;
          return;
        }

        const normalizedEmail = row.email.trim().toLowerCase();
        let user = nextUsers.find((candidate) => candidate.email.toLowerCase() === normalizedEmail);

        if (!user) {
          user = {
            id: createId('usr'),
            name: row.name.trim(),
            email: normalizedEmail,
            phone: row.phone.trim(),
            linkedin: row.linkedin.trim(),
            companyAffiliation: row.companyAffiliation.trim(),
            role: row.role.trim(),
            aboutMe: row.aboutMe.trim(),
            tier: row.tier,
            createdAt: nowIso(),
            updatedAt: nowIso(),
          };
          nextUsers.unshift(user);
        }

        const existingRegistration = nextRegistrations.find(
          (registration) => registration.userId === user!.id && registration.eventId === eventId,
        );

        if (existingRegistration) {
          existingRegistration.status = row.status ?? 'confirmed';
          existingRegistration.startupId =
            row.startupId ??
            nextRegistrations.find((registration) => registration.userId === user!.id)?.startupId;
          updated += 1;
          return;
        }

        nextRegistrations.unshift({
          id: createId('reg'),
          userId: user.id,
          eventId,
          startupId: row.startupId,
          status: row.status ?? 'confirmed',
          registeredAt: nowIso(),
        });
        added += 1;

        if (USE_API_AUTH && backendEventId) {
          apiRegistrationPromises.push(
            createEventRegistrationApi(backendEventId, {
              event_id: backendEventId,
              startup_id: row.startupId ?? null,
            }).catch(() => {}),
          );
        }
      });

      setUsers(nextUsers);
      setRegistrations(nextRegistrations);

      if (USE_API_AUTH && apiRegistrationPromises.length > 0) {
        void Promise.allSettled(apiRegistrationPromises).then(() => {
          void refreshCatalog();
        });
      }

      return { added, updated, skipped };
    },
    [backendEventIdBySlug, registrations, refreshCatalog, users],
  );

  const updateRegistrationStatus = useCallback((registrationId: string, status: RegistrationStatus): void => {
    setRegistrations((prev) =>
      prev.map((registration) =>
        registration.id === registrationId ? { ...registration, status } : registration,
      ),
    );
  }, []);

  const getBackendEventIdForSlug = useCallback(
    (slug: string): string | undefined => backendEventIdBySlug[slug],
    [backendEventIdBySlug],
  );

  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser !== null && ADMIN_TIERS.includes(currentUser.tier);

  const value = useMemo<AuthContextType>(
    () => ({
      currentUser,
      isAuthenticated,
      authHydrated,
      catalogHydrated,
      useApiAuth: USE_API_AUTH,
      login,
      demoLoginAs,
      beginProxySession,
      exitProxySession,
      switchToLinkedProfile,
      logout,
      switchUser,
      isAdmin,
      isTier3: isAdmin,
      backendCatalogWarning,
      events,
      eventVisibility,
      users,
      startups,
      userStartupLinks,
      registrations,
      refreshCatalog,
      updateProfile,
      createUser,
      updateUserById,
      removeUserById,
      createStartupProfile,
      updateStartupProfile,
      createEvent,
      updateEvent,
      deleteEvent,
      updateEventVisibility,
      registerForEvent,
      unregisterFromEvent,
      restoreRegistration,
      registerAttendeeForEvent,
      importEventAttendees,
      updateRegistrationStatus,
      getUserRegistrations,
      getLinkedStartup,
      getStartupMembers,
      getBackendEventIdForSlug,
    }),
    [
      authHydrated,
      catalogHydrated,
      backendCatalogWarning,
      createEvent,
      createStartupProfile,
      createUser,
      currentUser,
      deleteEvent,
      demoLoginAs,
      beginProxySession,
      exitProxySession,
      switchToLinkedProfile,
      eventVisibility,
      events,
      getBackendEventIdForSlug,
      getLinkedStartup,
      getStartupMembers,
      getUserRegistrations,
      importEventAttendees,
      isAdmin,
      isAuthenticated,
      login,
      logout,
      refreshCatalog,
      registerAttendeeForEvent,
      registerForEvent,
      registrations,
      removeUserById,
      startups,
      switchUser,
      updateEvent,
      updateEventVisibility,
      updateProfile,
      updateRegistrationStatus,
      updateStartupProfile,
      updateUserById,
      restoreRegistration,
      unregisterFromEvent,
      userStartupLinks,
      users,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
