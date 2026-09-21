import { eventsData, type EventDetail, type CTAConfig } from '@/portal/data/EventsData';
import type { ItineraryItem } from '@/portal/data/itinerary';
import type { Speaker } from '@/portal/data/speakers';
import type { Sponsor } from '@/portal/data/sponsors';
import type {
  MockEventRegistration,
  MockStartupProfile,
  MockUserStartupLink,
  RegistrationStatus,
  UserTier,
  VisibilitySetting,
} from '@/portal/data/mock/types';
import type { ApiEventJson, ApiEventRegistrationJson, ApiStartupJson, ApiUserStartupLinkJson } from '@/portal/api/types';

export function stableNumericIdFromUuid(uuid: string): number {
  let h = 0;
  for (let i = 0; i < uuid.length; i += 1) {
    h = (Math.imul(31, h) + uuid.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function formatEventDateRange(startIso: string, endIso: string): string {
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    if (Number.isNaN(start.getTime())) {
      return startIso;
    }
    const sameDay = start.toDateString() === end.toDateString();
    if (sameDay) {
      return start.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`;
  } catch {
    return startIso;
  }
}

function parseTierList(raw: unknown): UserTier[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const allowed: UserTier[] = ['startup', 'cxo', 'vc', 'admin', 'dev'];
  return raw.filter((x): x is UserTier => typeof x === 'string' && allowed.includes(x as UserTier));
}

export function mapVisibilityFromApi(raw: Record<string, unknown> | undefined): VisibilitySetting {
  if (!raw || typeof raw !== 'object') {
    return {
      startupCanSee: ['startup'],
      cxoCanSee: ['startup', 'cxo', 'vc'],
      vcCanSee: ['startup', 'vc'],
    };
  }
  return {
    startupCanSee: parseTierList(raw.startup_can_see),
    cxoCanSee: parseTierList(raw.cxo_can_see),
    vcCanSee: parseTierList(raw.vc_can_see),
  };
}

export function mapVisibilityToApi(settings: VisibilitySetting): {
  startup_can_see: UserTier[];
  cxo_can_see: UserTier[];
  vc_can_see: UserTier[];
} {
  return {
    startup_can_see: settings.startupCanSee,
    cxo_can_see: settings.cxoCanSee,
    vc_can_see: settings.vcCanSee,
  };
}

function buildCtaFromApi(raw: ApiEventJson): CTAConfig {
  const luma = raw.luma_event_url?.trim();
  if (luma) {
    return {
      primaryLabel: 'Open Luma Event',
      primaryUrl: luma,
      isExternal: true,
    };
  }
  const cta = raw.cta_config;
  if (cta && typeof cta === 'object' && typeof (cta as { primary_label?: unknown }).primary_label === 'string') {
    const o = cta as { primary_label: string; primary_url?: string; is_external?: boolean };
    return {
      primaryLabel: o.primary_label,
      primaryUrl: typeof o.primary_url === 'string' ? o.primary_url : `/events/${raw.slug}`,
      isExternal: Boolean(o.is_external),
    };
  }
  return {
    primaryLabel: raw.registration_open ? 'Register via GCXO' : 'Open Dashboard',
    primaryUrl: raw.registration_open ? `/events/${raw.slug}` : '/dashboard',
  };
}

function mapSpeakersJson(raw: unknown[] | null): Speaker[] {
  if (!raw?.length) {
    return [];
  }
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      name: String(o.name ?? 'Speaker'),
      title: String(o.title ?? ''),
      company: String(o.company ?? o.organization ?? ''),
      image: String(o.image ?? o.photo ?? '/assets/icons/global.png'),
    };
  });
}

function mapSponsorsJson(raw: unknown[] | null): Sponsor[] {
  if (!raw?.length) {
    return [];
  }
  return raw.map((item) => {
    const o = item as Record<string, unknown>;
    return {
      name: String(o.name ?? 'Sponsor'),
      logo: String(o.logo ?? o.image ?? '/assets/icons/global.png'),
      website: typeof o.website === 'string' ? o.website : undefined,
    };
  });
}

const ITINERARY_TYPES = new Set<ItineraryItem['type']>([
  'keynote',
  'panel',
  'workshop',
  'networking',
  'break',
  'cultural',
  'travel',
  'arrival',
  'breakfast',
  'pitch',
  'lunch',
  'cocktails',
  'dinner',
  'announcements',
]);

const TIME_OF_DAY = new Set<ItineraryItem['timeOfDay']>(['morning', 'afternoon', 'evening']);

function mapItineraryJson(raw: unknown[] | null): ItineraryItem[] {
  if (!raw?.length) {
    return [];
  }
  return raw.map((item, idx) => {
    const o = item as Record<string, unknown>;
    const typeRaw = o.type;
    const type: ItineraryItem['type'] =
      typeof typeRaw === 'string' && ITINERARY_TYPES.has(typeRaw as ItineraryItem['type'])
        ? (typeRaw as ItineraryItem['type'])
        : 'keynote';
    const todRaw = o.time_of_day ?? o.timeOfDay;
    const timeOfDay: ItineraryItem['timeOfDay'] =
      typeof todRaw === 'string' && TIME_OF_DAY.has(todRaw as ItineraryItem['timeOfDay'])
        ? (todRaw as ItineraryItem['timeOfDay'])
        : 'morning';
    return {
      date: String(o.date ?? ''),
      time: String(o.time ?? ''),
      title: String(o.title ?? `Session ${idx + 1}`),
      description: String(o.description ?? ''),
      type,
      timeOfDay,
    };
  });
}

function mapVenueFromApi(venue: Record<string, unknown> | undefined, fallbackLocation: string, heroFallback: string) {
  if (!venue || typeof venue !== 'object') {
    return {
      name: 'Venue',
      address: fallbackLocation,
      description: '',
      image: heroFallback,
      mapEmbedUrl: '',
    };
  }
  return {
    name: String(venue.name ?? 'Venue'),
    address: String(venue.address ?? fallbackLocation),
    description: String(venue.description ?? ''),
    image: String(venue.image || heroFallback),
    mapEmbedUrl: String(venue.mapEmbedUrl ?? venue.map_embed_url ?? ''),
  };
}

function normalizeRegistrationStatus(status: string): RegistrationStatus {
  if (status === 'pending' || status === 'confirmed' || status === 'cancelled') {
    return status;
  }
  return 'confirmed';
}

export function mapApiRegistrationToMock(
  raw: ApiEventRegistrationJson,
  eventSlug: string,
): MockEventRegistration {
  return {
    id: String(raw.id),
    userId: String(raw.user_id),
    eventId: eventSlug,
    startupId: raw.startup_id ? String(raw.startup_id) : undefined,
    status: normalizeRegistrationStatus(String(raw.status)),
    registeredAt:
      typeof raw.registered_at === 'string' ? raw.registered_at : new Date().toISOString(),
  };
}

export function mapApiStartupToMock(raw: ApiStartupJson): MockStartupProfile {
  return {
    id: String(raw.id),
    companyName: raw.company_name,
    companyWebsite: raw.company_website,
    companyDomain: raw.company_domain,
    description: raw.description,
    logoUrl: raw.logo_url ?? undefined,
    registeredBy: String(raw.registered_by_id),
    isVerified: Boolean(raw.is_verified),
    createdAt: typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString(),
    updatedAt: typeof raw.updated_at === 'string' ? raw.updated_at : new Date().toISOString(),
  };
}

export function mapApiStartupLinkToMock(raw: ApiUserStartupLinkJson): MockUserStartupLink {
  const role = raw.link_role;
  const safeRole =
    role === 'founder' || role === 'manager' || role === 'member' || role === 'proxy' ? role : 'member';
  return {
    id: String(raw.id),
    userId: String(raw.user_id),
    startupId: String(raw.startup_id),
    role: safeRole,
    linkedAt: typeof raw.linked_at === 'string' ? raw.linked_at : new Date().toISOString(),
  };
}

export function mapApiEventToEventDetail(raw: ApiEventJson, registrationCount: number): EventDetail {
  const meta = raw.event_metadata ?? {};
  const objectives = Array.isArray(meta.objectives)
    ? (meta.objectives as unknown[]).map((x) => String(x))
    : [];

  const dateLabel = formatEventDateRange(raw.date_start, raw.date_end);
  const template = eventsData.find((e) => e.slug === raw.slug);
  const heroImage = raw.hero_image?.trim() || template?.heroImage || '/events/mlc_main_banner.webp';
  const bannerImage = raw.banner_image?.trim() || template?.bannerImage || heroImage;
  const heroImageMobile = (typeof meta.heroImageMobile === 'string' && meta.heroImageMobile.trim()) || template?.heroImageMobile || heroImage;
  const cardImage = (typeof meta.cardImage === 'string' && meta.cardImage.trim()) || template?.cardImage || heroImage;

  return {
    id: stableNumericIdFromUuid(String(raw.id)),
    slug: raw.slug,
    title: raw.title,
    tagline: raw.tagline ?? undefined,
    date: dateLabel,
    location: raw.location,
    description: raw.description,
    attendees:
      registrationCount > 0 ? `${registrationCount} attendees` : template?.attendees || '100+ attendees',
    heroImage,
    heroImageMobile,
    cardImage,
    bannerImage,
    gallery: Array.isArray(meta.gallery) ? (meta.gallery as string[]) : [],
    overview: raw.overview,
    objectives,
    speakers: mapSpeakersJson(raw.speakers_json),
    sponsors: mapSponsorsJson(raw.sponsors_json),
    itinerary: mapItineraryJson(raw.itinerary_json),
    highlights: Array.isArray(meta.highlights) && (meta.highlights as unknown[]).length > 0
      ? (meta.highlights as unknown[]).map((x) => String(x))
      : objectives.length > 0 ? objectives : [raw.overview.slice(0, 120)],
    highlightCards: Array.isArray(meta.highlightCards)
      ? (meta.highlightCards as Array<{ icon: string; title: string; text: string }>)
      : [],
    lifecycleStatus:
      raw.lifecycle_status === 'current' || raw.lifecycle_status === 'past' || raw.lifecycle_status === 'archived'
        ? raw.lifecycle_status
        : 'current',
    registrationOpen: raw.registration_open,
    galleryUrl: raw.gallery_url?.trim() || template?.galleryUrl || undefined,
    cta: buildCtaFromApi(raw),
    metadata: {
      title:
        typeof meta.title === 'string' && meta.title.length > 0
          ? meta.title
          : `Global CXO Circle | ${raw.title}`,
      description: typeof meta.description === 'string' && meta.description.length > 0 ? meta.description : raw.description,
      image: typeof meta.image === 'string' && meta.image.length > 0 ? meta.image : raw.banner_image,
    },
    venue: mapVenueFromApi(raw.venue, raw.location, raw.hero_image),
  };
}

