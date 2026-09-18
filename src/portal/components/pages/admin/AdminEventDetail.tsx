import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Download,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Trash2,
  Undo2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/portal/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/portal/components/ui/table';
import { Input } from '@/portal/components/ui/input';
import { Button } from '@/portal/components/ui/button';
import { Badge } from '@/portal/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';
import { Label } from '@/portal/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/portal/components/ui/select';
import { Switch } from '@/portal/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/portal/components/ui/dialog';
import { Checkbox } from '@/portal/components/ui/checkbox';
import { Separator } from '@/portal/components/ui/separator';
import { Textarea } from '@/portal/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/portal/components/ui/dropdown-menu';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/portal/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/portal/components/ui/popover';
import { USE_API_AUTH } from '@/portal/api/config';
import { getEventDeleteImpactApi, getEventBySlugApi, patchEventApi } from '@/portal/api/events';
import type { ApiEventDeleteImpactJson } from '@/portal/api/types';
import {
  createLumaRecordApi,
  listLumaRecordsApi,
  lumaProxyEventCreateApi,
  syncLumaRecordGuestsApi,
} from '@/portal/api/ops';

import {
  type RegistrationStatus,
  type UserTier,
  type VisibilitySetting,
  visibilityPresets,
  type MockUser,
} from '@/portal/data/mock';
import type { EventLifecycleStatus, EventDetail as EventDetailType } from '@/portal/data/EventsData';
import type { Speaker } from '@/portal/data/speakers';
import type { Sponsor } from '@/portal/data/sponsors';
import type { ItineraryItem } from '@/portal/data/itinerary';
import { useAuth } from '@/portal/hooks/useAuth';
import { EventDetailSkeleton } from '@/portal/components/ui/admin-skeletons';
import { AdminUserDialog, type AdminUserFormValues } from './AdminUserDialog';
import {
  exportAttendeesToCsv,
  exportAttendeesToWorkbook,
  parseAttendeeImportFile,
  type AttendeeSheetRowInput,
} from '@/portal/lib/attendeeSheets';
import { mapVisibilityToApi } from '@/portal/api/mappers';
import EventDetail from '@/components/events/EventDetail';
import { ImageUpload } from '@/portal/components/ui/image-upload';
import { cn } from '@/portal/lib/utils';

/* ───────────────────────── constants ───────────────────────── */

const TIERS: UserTier[] = ['startup', 'cxo', 'vc'];
const ITEMS_PER_PAGE = 8;

const ITINERARY_TYPES = [
  'keynote', 'panel', 'workshop', 'networking', 'break', 'cultural',
  'travel', 'arrival', 'breakfast', 'pitch', 'lunch', 'cocktails',
  'dinner', 'announcements',
] as const;

/* ───────────────────────── editor state ────────────────────── */

interface EditorState {
  title: string;
  tagline: string;
  dateStart: string;
  dateEnd: string;
  location: string;
  attendees: string;
  description: string;
  overview: string;
  heroImage: string;
  heroImageMobile: string;
  bannerImage: string;
  cardImage: string;
  venueName: string;
  venueAddress: string;
  venueDescription: string;
  venueImage: string;
  venueMapEmbedUrl: string;
  ctaPrimaryLabel: string;
  ctaPrimaryUrl: string;
  ctaIsExternal: boolean;
  ctaSecondaryLabel: string;
  ctaSecondaryUrl: string;
  lumaUrl: string;
  galleryUrl: string;
  highlights: string;
  livestreamUrl: string;
  lifecycleStatus: EventLifecycleStatus;
  registrationOpen: boolean;
  showHeroPromo: boolean;
  price: string;
  metaTitle: string;
  metaDescription: string;
  metaImage: string;
}

function buildEditorState(event: EventDetailType): EditorState {
  return {
    title: event.title,
    tagline: event.tagline ?? '',
    dateStart: '',
    dateEnd: '',
    location: event.location,
    attendees: event.attendees,
    description: event.description,
    overview: event.overview,
    heroImage: event.heroImage,
    heroImageMobile: event.heroImageMobile ?? '',
    bannerImage: event.bannerImage,
    cardImage: event.cardImage ?? '',
    venueName: event.venue.name,
    venueAddress: event.venue.address,
    venueDescription: event.venue.description,
    venueImage: event.venue.image,
    venueMapEmbedUrl: event.venue.mapEmbedUrl ?? '',
    ctaPrimaryLabel: event.cta?.primaryLabel ?? '',
    ctaPrimaryUrl: event.cta?.primaryUrl ?? '',
    ctaIsExternal: event.cta?.isExternal ?? false,
    ctaSecondaryLabel: event.cta?.secondaryLabel ?? '',
    ctaSecondaryUrl: event.cta?.secondaryUrl ?? '',
    lumaUrl: (event.cta?.isExternal ? event.cta.primaryUrl : '') ?? '',
    galleryUrl: event.galleryUrl ?? '',
    highlights: event.highlights.join('\n'),
    livestreamUrl: event.livestreamUrl ?? '',
    lifecycleStatus: event.lifecycleStatus ?? (event.registrationOpen ? 'current' : 'past'),
    registrationOpen: event.registrationOpen ?? false,
    showHeroPromo: event.showHeroPromo ?? (event.lifecycleStatus === 'current' && event.registrationOpen !== false),
    price: event.price ?? '',
    metaTitle: event.metadata.title,
    metaDescription: event.metadata.description,
    metaImage: event.metadata.image,
  };
}

function statesEqual(a: EditorState, b: EditorState): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function arraysEqual<T>(a: T[], b: T[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ──────────────────────── helpers ──────────────────────────── */

function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local[0]}***@${domain}`;
}

function tierBadgeClass(tier: string): string {
  const m: Record<string, string> = {
    startup: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-100',
    cxo: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
    vc: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100',
    admin: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
    dev: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
  };
  return m[tier] ?? 'bg-gray-100 text-gray-700 hover:bg-gray-100';
}

function statusBadgeClass(status: string): string {
  const m: Record<string, string> = {
    confirmed: 'bg-green-100 text-green-700 hover:bg-green-100',
    pending: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100',
    cancelled: 'bg-red-100 text-red-700 hover:bg-red-100',
  };
  return m[status] ?? 'bg-gray-100 text-gray-700 hover:bg-gray-100';
}

/* ──────────────────── Content Tab ──────────────────────────── */

function ContentTab({
  form,
  setForm,
  speakers,
  setSpeakers,
  sponsors,
  setSponsors,
  itinerary,
  setItinerary,
  highlightCards,
  setHighlightCards,
}: {
  form: EditorState;
  setForm: React.Dispatch<React.SetStateAction<EditorState>>;
  speakers: Speaker[];
  setSpeakers: React.Dispatch<React.SetStateAction<Speaker[]>>;
  sponsors: Sponsor[];
  setSponsors: React.Dispatch<React.SetStateAction<Sponsor[]>>;
  itinerary: ItineraryItem[];
  setItinerary: React.Dispatch<React.SetStateAction<ItineraryItem[]>>;
  highlightCards: Array<{ icon: string; title: string; text: string }>;
  setHighlightCards: React.Dispatch<React.SetStateAction<Array<{ icon: string; title: string; text: string }>>>;
}): JSX.Element {
  const updateField = (field: keyof EditorState, value: string | boolean): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const [showHighlights, setShowHighlights] = useState(true);
  const [showSpeakers, setShowSpeakers] = useState(true);
  const [showSponsors, setShowSponsors] = useState(true);
  const [showItinerary, setShowItinerary] = useState(true);

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => updateField('title', e.target.value)} />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Tagline</Label>
              <Input value={form.tagline} onChange={(e) => updateField('tagline', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date Start (ISO)</Label>
              <Input type="datetime-local" value={form.dateStart} onChange={(e) => updateField('dateStart', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Date End (ISO)</Label>
              <Input type="datetime-local" value={form.dateEnd} onChange={(e) => updateField('dateEnd', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => updateField('location', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Expected Attendance</Label>
              <Input value={form.attendees} onChange={(e) => updateField('attendees', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea rows={4} value={form.description} onChange={(e) => updateField('description', e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Overview</Label>
            <Textarea rows={6} value={form.overview} onChange={(e) => updateField('overview', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Images */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Images</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ImageUpload label="Hero Image" value={form.heroImage} onChange={(v) => updateField('heroImage', v)} folder="events" />
            <ImageUpload label="Hero Image (Mobile)" value={form.heroImageMobile} onChange={(v) => updateField('heroImageMobile', v)} folder="events" />
            <ImageUpload label="Banner Image" value={form.bannerImage} onChange={(v) => updateField('bannerImage', v)} folder="events" />
            <ImageUpload label="Card Image" value={form.cardImage} onChange={(v) => updateField('cardImage', v)} folder="events" />
          </div>
        </CardContent>
      </Card>

      {/* Venue */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Venue</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Venue Name</Label>
              <Input value={form.venueName} onChange={(e) => updateField('venueName', e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Venue Address</Label>
              <Input value={form.venueAddress} onChange={(e) => updateField('venueAddress', e.target.value)} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Venue Description</Label>
            <Textarea rows={3} value={form.venueDescription} onChange={(e) => updateField('venueDescription', e.target.value)} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ImageUpload label="Venue Image" value={form.venueImage} onChange={(v) => updateField('venueImage', v)} folder="events/venues" />
            <div className="grid gap-2">
              <Label>Venue Map Embed URL</Label>
              <Input value={form.venueMapEmbedUrl} onChange={(e) => updateField('venueMapEmbedUrl', e.target.value)} placeholder="https://maps.google.com/maps?q=...&output=embed" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Call to Action</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Primary Label</Label>
              <Input value={form.ctaPrimaryLabel} onChange={(e) => updateField('ctaPrimaryLabel', e.target.value)} placeholder="Register Now" />
            </div>
            <div className="grid gap-2">
              <Label>Primary URL</Label>
              <Input value={form.ctaPrimaryUrl} onChange={(e) => updateField('ctaPrimaryUrl', e.target.value)} placeholder="https://lu.ma/your-event" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={form.ctaIsExternal} onCheckedChange={(v) => updateField('ctaIsExternal', v)} />
            <Label>Opens in new tab (external link)</Label>
          </div>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label>Secondary Label (optional)</Label>
              <Input value={form.ctaSecondaryLabel} onChange={(e) => updateField('ctaSecondaryLabel', e.target.value)} placeholder="Explore Gallery" />
            </div>
            <div className="grid gap-2">
              <Label>Secondary URL (optional)</Label>
              <Input value={form.ctaSecondaryUrl} onChange={(e) => updateField('ctaSecondaryUrl', e.target.value)} placeholder="/gallery" />
            </div>
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>Luma URL</Label>
            <Input value={form.lumaUrl} onChange={(e) => updateField('lumaUrl', e.target.value)} placeholder="https://lu.ma/your-event" />
          </div>
        </CardContent>
      </Card>

      {/* Livestream */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Livestream</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label>Livestream URL</Label>
            <Input value={form.livestreamUrl} onChange={(e) => updateField('livestreamUrl', e.target.value)} placeholder="https://youtube.com/embed/..." />
          </div>
        </CardContent>
      </Card>

      {/* Highlights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Highlights</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowHighlights((v) => !v)}>
              {showHighlights ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        {showHighlights && (
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Highlight Bullets (one per line)</Label>
              <Textarea rows={4} value={form.highlights} onChange={(e) => updateField('highlights', e.target.value)} placeholder={"75+ CXOs\n30+ Startups\nCurated 1-on-1s"} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Highlight Cards</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setHighlightCards((p) => [...p, { icon: '', title: '', text: '' }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Card
                </Button>
              </div>
              {highlightCards.map((card, i) => (
                <div key={i} className="flex gap-2 mb-2 items-start">
                  <Input className="w-24" placeholder="Icon URL" value={card.icon} onChange={(e) => { const next = [...highlightCards]; next[i] = { ...next[i], icon: e.target.value }; setHighlightCards(next); }} />
                  <Input className="w-32" placeholder="Title" value={card.title} onChange={(e) => { const next = [...highlightCards]; next[i] = { ...next[i], title: e.target.value }; setHighlightCards(next); }} />
                  <Input className="flex-1" placeholder="Text" value={card.text} onChange={(e) => { const next = [...highlightCards]; next[i] = { ...next[i], text: e.target.value }; setHighlightCards(next); }} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setHighlightCards((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
              ))}
              {highlightCards.length === 0 && <p className="text-sm text-slate-400">No highlight cards yet.</p>}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Speakers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Speakers ({speakers.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSpeakers((p) => [...p, { name: '', title: '', company: '', image: '' }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Speaker
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSpeakers((v) => !v)}>
                {showSpeakers ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showSpeakers && (
          <CardContent className="space-y-3">
            {speakers.map((s, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-3">
                <div className="flex gap-2">
                  <Input placeholder="Name" value={s.name} onChange={(e) => { const next = [...speakers]; next[i] = { ...next[i], name: e.target.value }; setSpeakers(next); }} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSpeakers((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input placeholder="Title" value={s.title} onChange={(e) => { const next = [...speakers]; next[i] = { ...next[i], title: e.target.value }; setSpeakers(next); }} />
                  <Input placeholder="Company" value={s.company} onChange={(e) => { const next = [...speakers]; next[i] = { ...next[i], company: e.target.value }; setSpeakers(next); }} />
                </div>
                <ImageUpload value={s.image} onChange={(v) => { const next = [...speakers]; next[i] = { ...next[i], image: v }; setSpeakers(next); }} placeholder="Speaker photo" previewHeight="h-16" folder="events/speakers" />
              </div>
            ))}
            {speakers.length === 0 && <p className="text-sm text-slate-400">No speakers added yet.</p>}
          </CardContent>
        )}
      </Card>

      {/* Sponsors */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Sponsors ({sponsors.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setSponsors((p) => [...p, { name: '', logo: '', website: '' }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Sponsor
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSponsors((v) => !v)}>
                {showSponsors ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showSponsors && (
          <CardContent className="space-y-3">
            {sponsors.map((s, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <Input placeholder="Name" value={s.name} onChange={(e) => { const next = [...sponsors]; next[i] = { ...next[i], name: e.target.value }; setSponsors(next); }} />
                  <Input placeholder="Website" value={s.website ?? ''} onChange={(e) => { const next = [...sponsors]; next[i] = { ...next[i], website: e.target.value }; setSponsors(next); }} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSponsors((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
                <ImageUpload value={s.logo} onChange={(v) => { const next = [...sponsors]; next[i] = { ...next[i], logo: v }; setSponsors(next); }} placeholder="Sponsor logo" previewHeight="h-12" folder="events/sponsors" />
              </div>
            ))}
            {sponsors.length === 0 && <p className="text-sm text-slate-400">No sponsors added yet.</p>}
          </CardContent>
        )}
      </Card>

      {/* Itinerary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Itinerary ({itinerary.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setItinerary((p) => [...p, { date: '', time: '', title: '', description: '', type: 'keynote', timeOfDay: 'morning' }])}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowItinerary((v) => !v)}>
                {showItinerary ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
        {showItinerary && (
          <CardContent className="space-y-3">
            {itinerary.map((item, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex gap-2">
                  <Input className="w-32" placeholder="Date (Day 1)" value={item.date} onChange={(e) => { const next = [...itinerary]; next[i] = { ...next[i], date: e.target.value }; setItinerary(next); }} />
                  <Input className="w-28" placeholder="9:00 AM" value={item.time} onChange={(e) => { const next = [...itinerary]; next[i] = { ...next[i], time: e.target.value }; setItinerary(next); }} />
                  <Input className="flex-1" placeholder="Session Title" value={item.title} onChange={(e) => { const next = [...itinerary]; next[i] = { ...next[i], title: e.target.value }; setItinerary(next); }} />
                  <Button type="button" variant="ghost" size="sm" onClick={() => setItinerary((p) => p.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <Select value={item.type} onValueChange={(v) => { const next = [...itinerary]; next[i] = { ...next[i], type: v as ItineraryItem['type'] }; setItinerary(next); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ITINERARY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={item.timeOfDay} onValueChange={(v) => { const next = [...itinerary]; next[i] = { ...next[i], timeOfDay: v as ItineraryItem['timeOfDay'] }; setItinerary(next); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="afternoon">Afternoon</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Textarea rows={2} placeholder="Description" value={item.description} onChange={(e) => { const next = [...itinerary]; next[i] = { ...next[i], description: e.target.value }; setItinerary(next); }} />
              </div>
            ))}
            {itinerary.length === 0 && <p className="text-sm text-slate-400">No itinerary items yet.</p>}
          </CardContent>
        )}
      </Card>

      {/* SEO Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Meta Title</Label>
            <Input value={form.metaTitle} onChange={(e) => updateField('metaTitle', e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Meta Description</Label>
            <Textarea rows={2} value={form.metaDescription} onChange={(e) => updateField('metaDescription', e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Meta Image URL</Label>
            <Input value={form.metaImage} onChange={(e) => updateField('metaImage', e.target.value)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────────── Attendees Tab ───────────────────────── */

function AttendeesTab({ slug }: { slug: string }): JSX.Element {
  const {
    users,
    registrations,
    registerAttendeeForEvent,
    importEventAttendees,
    restoreRegistration,
    updateRegistrationStatus,
    updateUserById,
  } = useAuth();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [profileMode, setProfileMode] = useState<'view' | 'edit' | null>(null);
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [attendeeSource, setAttendeeSource] = useState<'new' | 'existing'>('new');
  const [existingUserId, setExistingUserId] = useState('');
  const [existingUserPickerOpen, setExistingUserPickerOpen] = useState(false);
  const [form, setForm] = useState<AttendeeSheetRowInput>({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    companyAffiliation: '',
    role: '',
    aboutMe: '',
    tier: 'startup',
    status: 'confirmed',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const rows = useMemo(() => {
    return registrations
      .filter((r) => r.eventId === slug)
      .map((reg) => {
        const user = users.find((u) => u.id === reg.userId);
        return { ...reg, user };
      })
      .filter((r) => r.user);
  }, [registrations, slug, users]);

  const registeredUserIds = useMemo(
    () => new Set(rows.map((row) => row.user!.id)),
    [rows],
  );

  const existingUserOptions = useMemo(
    () =>
      [...users].sort((left, right) => {
        const leftKey = `${left.name} ${left.email}`.toLowerCase();
        const rightKey = `${right.name} ${right.email}`.toLowerCase();
        return leftKey.localeCompare(rightKey);
      }),
    [users],
  );

  const selectedExistingUser = useMemo(
    () => users.find((candidate) => candidate.id === existingUserId) ?? null,
    [existingUserId, users],
  );

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchTier = tierFilter === 'all' || r.user!.tier === tierFilter;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.user!.name.toLowerCase().includes(q) ||
        r.user!.companyAffiliation.toLowerCase().includes(q) ||
        r.user!.email.toLowerCase().includes(q) ||
        r.user!.role.toLowerCase().includes(q);
      return matchTier && matchStatus && matchSearch;
    });
  }, [rows, tierFilter, statusFilter, search]);

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.has(row.id)),
    [rows, selectedIds],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const allSelected =
    paged.length > 0 && paged.every((r) => selectedIds.has(r.id));

  const toggleAll = (): void => {
    if (allSelected) {
      const next = new Set(selectedIds);
      paged.forEach((r) => next.delete(r.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      paged.forEach((r) => next.add(r.id));
      setSelectedIds(next);
    }
  };

  const toggleOne = (id: string): void => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const buildExportRows = (
    sourceRows: typeof rows,
  ): Array<AttendeeSheetRowInput & { registeredAt?: string }> =>
    sourceRows.map((row) => ({
      name: row.user!.name,
      email: row.user!.email,
      phone: row.user!.phone,
      linkedin: row.user!.linkedin,
      companyAffiliation: row.user!.companyAffiliation,
      role: row.user!.role,
      aboutMe: row.user!.aboutMe,
      tier: row.user!.tier,
      status: row.status,
      registeredAt: row.registeredAt,
    }));

  const handleExport = (scope: 'filtered' | 'selected', format: 'csv' | 'xlsx'): void => {
    const sourceRows = scope === 'selected' ? selectedRows : filtered;
    if (sourceRows.length === 0) {
      toast.info(scope === 'selected' ? 'Select attendees first.' : 'No attendees to export.');
      return;
    }
    const exportRows = buildExportRows(sourceRows);
    const suffix = scope === 'selected' ? 'selected-attendees' : 'attendees';
    if (format === 'csv') {
      exportAttendeesToCsv(exportRows, `${slug}-${suffix}.csv`);
    } else {
      exportAttendeesToWorkbook(exportRows, `${slug}-${suffix}.xlsx`);
    }
    toast.success(
      `${scope === 'selected' ? 'Selected attendees' : 'Attendee sheet'} exported as ${format.toUpperCase()}.`,
    );
  };

  const handleImport = async (file: File): Promise<void> => {
    const parsed = await parseAttendeeImportFile(file);
    const result = importEventAttendees(slug, parsed);
    toast.success(
      `Import complete: ${result.added} added, ${result.updated} updated, ${result.skipped} skipped.`,
    );
  };

  const resetAddForm = (): void => {
    setAttendeeSource('new');
    setExistingUserId('');
    setExistingUserPickerOpen(false);
    setForm({
      name: '',
      email: '',
      phone: '',
      linkedin: '',
      companyAffiliation: '',
      role: '',
      aboutMe: '',
      tier: 'startup',
      status: 'confirmed',
    });
  };

  const canSaveAttendee =
    attendeeSource === 'existing'
      ? Boolean(existingUserId)
      : Boolean(form.name.trim() && form.email.trim());

  const openProfile = (mode: 'view' | 'edit', user: MockUser): void => {
    setSelectedUser(user);
    setProfileMode(mode);
  };

  const handleBulkCancel = (): void => {
    const activeSelected = selectedRows.filter((row) => row.status !== 'cancelled');
    if (activeSelected.length === 0) {
      toast.info('No active selected registrations to cancel.');
      return;
    }
    activeSelected.forEach((row) => updateRegistrationStatus(row.id, 'cancelled'));
    toast.success(`${activeSelected.length} registrations cancelled.`);
    setSelectedIds(new Set());
  };

  const handleBulkRestore = (): void => {
    const cancelledSelected = selectedRows.filter((row) => row.status === 'cancelled');
    if (cancelledSelected.length === 0) {
      toast.info('No cancelled selected registrations to restore.');
      return;
    }
    let restored = 0;
    cancelledSelected.forEach((row) => {
      const result = restoreRegistration(slug, row.user!.id);
      if (result.success) restored += 1;
    });
    toast.success(`${restored} registrations restored.`);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or company..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
        <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Tiers" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="startup">Startup</SelectItem>
            <SelectItem value="cxo">CxO</SelectItem>
            <SelectItem value="vc">VC</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(value) => { setStatusFilter(value); setPage(1); }}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="gap-1" onClick={() => fileInputRef.current?.click()}>
          <Download className="h-4 w-4" /> Import
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1"><Upload className="h-4 w-4" /> Export</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('filtered', 'csv')}>Export filtered as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('filtered', 'xlsx')}>Export filtered as XLSX</DropdownMenuItem>
            <DropdownMenuItem disabled={selectedRows.length === 0} onClick={() => handleExport('selected', 'csv')}>Export selected as CSV</DropdownMenuItem>
            <DropdownMenuItem disabled={selectedRows.length === 0} onClick={() => handleExport('selected', 'xlsx')}>Export selected as XLSX</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="sm" className="gap-1" onClick={() => { resetAddForm(); setAddOpen(true); }}>
          <UserPlus className="h-4 w-4" /> Add Attendee
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleImport(file);
            event.target.value = '';
          }}
        />
      </div>

      {selectedRows.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/60">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              {selectedRows.length} attendee{selectedRows.length !== 1 ? 's' : ''} selected
            </p>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleBulkCancel}>Cancel Selected</Button>
              <Button variant="outline" size="sm" onClick={handleBulkRestore}>Restore Selected</Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-sm text-slate-500">Showing {filtered.length} of {rows.length} attendees</p>

      {/* Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleOne(r.id)} /></TableCell>
                <TableCell className="font-medium">{r.user!.name}</TableCell>
                <TableCell className="text-slate-500">{redactEmail(r.user!.email)}</TableCell>
                <TableCell>{r.user!.companyAffiliation}</TableCell>
                <TableCell><Badge className={tierBadgeClass(r.user!.tier)}>{r.user!.tier.toUpperCase()}</Badge></TableCell>
                <TableCell><Badge className={statusBadgeClass(r.status)}>{r.status}</Badge></TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openProfile('view', r.user!)}>View</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openProfile('edit', r.user!)}>Edit</DropdownMenuItem>
                      {r.status === 'cancelled' ? (
                        <DropdownMenuItem onClick={() => { const result = restoreRegistration(slug, r.user!.id); if (result.success) toast.success(result.message); else toast.info(result.message); }}>Restore Registration</DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-red-600" onClick={() => { updateRegistrationStatus(r.id, 'cancelled'); toast.success('Registration marked as cancelled'); }}>Cancel Registration</DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {paged.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-slate-400">No attendees found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Attendee</DialogTitle>
            <DialogDescription>
              Add an existing GCXO user to this event or create a brand-new attendee profile.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="attendee-source">Attendee Source</Label>
              <Select
                value={attendeeSource}
                onValueChange={(value) => {
                  setAttendeeSource(value as 'new' | 'existing');
                  setExistingUserId('');
                  setExistingUserPickerOpen(false);
                }}
              >
                <SelectTrigger id="attendee-source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[2147483647]">
                  <SelectItem value="new">Create New Profile</SelectItem>
                  <SelectItem value="existing">Add Existing User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {attendeeSource === 'existing' && (
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="existing-user-picker">Existing User</Label>
                  <Popover open={existingUserPickerOpen} onOpenChange={setExistingUserPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="existing-user-picker"
                        variant="outline"
                        role="combobox"
                        aria-expanded={existingUserPickerOpen}
                        className="w-full justify-between"
                      >
                        <span className="truncate text-left">
                          {selectedExistingUser
                            ? `${selectedExistingUser.name} · ${selectedExistingUser.email}`
                            : 'Search all existing users'}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className="z-[2147483647] w-[var(--radix-popover-trigger-width)] p-0"
                    >
                      <Command>
                        <CommandInput placeholder="Search by name, email, company, or role..." />
                        <CommandList>
                          <CommandEmpty>No matching users found.</CommandEmpty>
                          <CommandGroup>
                            {existingUserOptions.map((user) => {
                              const alreadyRegistered = registeredUserIds.has(user.id);
                              return (
                                <CommandItem
                                  key={user.id}
                                  value={`${user.name} ${user.email} ${user.companyAffiliation} ${user.role} ${user.id}`}
                                  disabled={alreadyRegistered}
                                  onSelect={() => {
                                    if (alreadyRegistered) {
                                      return;
                                    }
                                    setExistingUserId(user.id);
                                    setExistingUserPickerOpen(false);
                                  }}
                                  className="gap-3 py-3"
                                >
                                  <Check
                                    className={cn(
                                      'h-4 w-4 shrink-0',
                                      existingUserId === user.id ? 'opacity-100' : 'opacity-0',
                                    )}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate font-medium text-slate-900">
                                      {user.name}
                                    </div>
                                    <div className="truncate text-xs text-slate-500">
                                      {user.email} · {user.companyAffiliation || 'No company listed'}
                                    </div>
                                  </div>
                                  {alreadyRegistered ? (
                                    <Badge variant="secondary" className="shrink-0">
                                      Already registered
                                    </Badge>
                                  ) : (
                                    <Badge className="shrink-0 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                      Available
                                    </Badge>
                                  )}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {selectedExistingUser ? (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-medium text-slate-900">{selectedExistingUser.name}</p>
                    <p className="text-slate-600">{selectedExistingUser.email}</p>
                    <p className="text-slate-500">
                      {selectedExistingUser.companyAffiliation || 'No company listed'} ·{' '}
                      {selectedExistingUser.role || 'No role listed'}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    Search all users and pick one to add to this event. Users already registered stay
                    visible but cannot be selected.
                  </p>
                )}
              </div>
            )}

            {attendeeSource === 'new' && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2 md:col-span-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>LinkedIn</Label>
                  <Input value={form.linkedin} onChange={(e) => setForm((prev) => ({ ...prev, linkedin: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Company</Label>
                  <Input value={form.companyAffiliation} onChange={(e) => setForm((prev) => ({ ...prev, companyAffiliation: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Input value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Tier</Label>
                  <Select value={form.tier} onValueChange={(value) => setForm((prev) => ({ ...prev, tier: value as UserTier }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[2147483647]">
                      <SelectItem value="startup">Startup</SelectItem>
                      <SelectItem value="cxo">CxO</SelectItem>
                      <SelectItem value="vc">VC</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="dev">Dev</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Registration Status</Label>
                  <Select value={form.status ?? 'confirmed'} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as RegistrationStatus }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="z-[2147483647]">
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label>About Me</Label>
                  <Textarea rows={4} value={form.aboutMe} onChange={(e) => setForm((prev) => ({ ...prev, aboutMe: e.target.value }))} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!canSaveAttendee}
              onClick={async () => {
                const result = await registerAttendeeForEvent(slug, {
                  existingUserId: attendeeSource === 'existing' ? existingUserId : undefined,
                  attendee: attendeeSource === 'new' ? form : undefined,
                });
                if (!result.success) { toast.error(result.message); return; }
                toast.success(result.message);
                setAddOpen(false);
                resetAddForm();
              }}
            >
              Save Attendee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AdminUserDialog
        open={profileMode !== null}
        onOpenChange={(open) => { if (!open) { setProfileMode(null); setSelectedUser(null); } }}
        mode={profileMode ?? 'view'}
        user={selectedUser}
        onSave={(values: AdminUserFormValues) => {
          if (!selectedUser) return;
          updateUserById(selectedUser.id, values as unknown as Parameters<typeof updateUserById>[1]);
          toast.success('Attendee profile updated.');
          setProfileMode(null);
          setSelectedUser(null);
        }}
      />
    </div>
  );
}

/* ──────────────────────── Settings Tab ────────────────────────── */

function SettingsTab({
  slug,
  form,
  setForm,
}: {
  slug: string;
  form: EditorState;
  setForm: React.Dispatch<React.SetStateAction<EditorState>>;
}): JSX.Element {
  const navigate = useNavigate();
  const {
    events,
    registrations,
    updateEvent,
    deleteEvent,
    getBackendEventIdForSlug,
    eventVisibility,
    updateEventVisibility,
  } = useAuth();
  const event = events.find((e) => e.slug === slug);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteImpact, setDeleteImpact] = useState<ApiEventDeleteImpactJson | null>(null);
  const [deleteImpactLoading, setDeleteImpactLoading] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [lumaBusy, setLumaBusy] = useState(false);

  const settings: VisibilitySetting = eventVisibility[slug] ?? {
    startupCanSee: [],
    cxoCanSee: [],
    vcCanSee: [],
  };

  const tierKeys: Array<{ key: keyof VisibilitySetting; label: string }> = [
    { key: 'startupCanSee', label: 'Startup' },
    { key: 'cxoCanSee', label: 'CxO' },
    { key: 'vcCanSee', label: 'VC' },
  ];

  const toggleTier = (settingKey: keyof VisibilitySetting, tier: UserTier): void => {
    const arr = settings[settingKey];
    const next = arr.includes(tier) ? arr.filter((t) => t !== tier) : [...arr, tier];
    updateEventVisibility(slug, { ...settings, [settingKey]: next });
  };

  const applyPreset = (preset: VisibilitySetting): void => {
    updateEventVisibility(slug, preset);
    toast.success('Visibility preset applied.');
  };

  const createLumaEvent = async (): Promise<void> => {
    if (!event) return;
    if (!USE_API_AUTH) {
      const generated = form.lumaUrl.trim() || `https://lu.ma/${slug}`;
      setForm((prev) => ({ ...prev, lumaUrl: generated }));
      updateEvent(slug, { lumaUrl: generated });
      toast.success('Generated mock Luma URL for this event.');
      return;
    }
    const eventUuid = getBackendEventIdForSlug(slug);
    if (!eventUuid) {
      toast.error('This event is not mapped to a backend record yet.');
      return;
    }
    setLumaBusy(true);
    try {
      const rawEvent = await getEventBySlugApi(slug);
      const lumaResponse = await lumaProxyEventCreateApi({
        name: rawEvent.title,
        description_md: rawEvent.overview || rawEvent.description,
        start_at: rawEvent.date_start,
        end_at: rawEvent.date_end,
        location: rawEvent.location,
      });
      const lumaEvent = (lumaResponse.event as Record<string, unknown> | undefined) ?? (lumaResponse as Record<string, unknown>);
      const externalEventId = String(lumaEvent.api_id ?? lumaEvent.id ?? lumaEvent.event_api_id ?? '').trim();
      const externalUrl = String(lumaEvent.url ?? lumaEvent.event_url ?? lumaEvent.public_url ?? '').trim();
      if (!externalEventId) throw new Error('Luma did not return an external event id.');
      await createLumaRecordApi({ event_id: eventUuid, external_event_id: externalEventId, sync_status: 'linked', raw_state: lumaResponse });
      if (externalUrl) {
        setForm((prev) => ({ ...prev, lumaUrl: externalUrl }));
        updateEvent(slug, { lumaUrl: externalUrl });
      }
      toast.success('Created Luma event and linked it to this GCXO event.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to create Luma event.');
    } finally {
      setLumaBusy(false);
    }
  };

  const syncLumaGuests = async (): Promise<void> => {
    if (!USE_API_AUTH) {
      toast.success('Event settings synced to local mock database.');
      return;
    }
    const eventUuid = getBackendEventIdForSlug(slug);
    if (!eventUuid) { toast.error('This event is not mapped to a backend record yet.'); return; }
    setLumaBusy(true);
    try {
      const lumaRecords = await listLumaRecordsApi();
      const record = lumaRecords.find((entry) => entry.event_id === eventUuid);
      if (!record) throw new Error('No linked Luma record was found for this event.');
      await syncLumaRecordGuestsApi(record.id);
      toast.success('Synced guest state from Luma.');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to sync Luma guests.');
    } finally {
      setLumaBusy(false);
    }
  };

  useEffect(() => {
    if (!deleteOpen || !event) {
      if (!deleteOpen) {
        setDeleteConfirmText('');
        setDeleteImpact(null);
        setDeleteImpactLoading(false);
      }
      return;
    }

    if (!USE_API_AUTH) {
      const registrationCount = registrations.filter((registration) => registration.eventId === slug).length;
      setDeleteImpact({
        deleted_event_id: slug,
        slug,
        title: event.title,
        registration_count: registrationCount,
        event_session_count: 0,
        meeting_request_count: 0,
        scheduled_meeting_count: 0,
        luma_record_count: 0,
        cancellation_email_count: registrationCount,
      });
      return;
    }

    const eventUuid = getBackendEventIdForSlug(slug);
    if (!eventUuid) {
      setDeleteImpact({
        deleted_event_id: slug,
        slug,
        title: event.title,
        registration_count: 0,
        event_session_count: 0,
        meeting_request_count: 0,
        scheduled_meeting_count: 0,
        luma_record_count: 0,
        cancellation_email_count: 0,
      });
      return;
    }

    let cancelled = false;
    setDeleteImpactLoading(true);
    void getEventDeleteImpactApi(eventUuid)
      .then((impact) => {
        if (!cancelled) {
          setDeleteImpact(impact);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load delete impact.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDeleteImpactLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [deleteOpen, event, getBackendEventIdForSlug, registrations, slug]);

  const canConfirmDelete = deleteConfirmText.trim() === (event?.title ?? '');

  const handleDeleteEvent = async (): Promise<void> => {
    if (!event || !canConfirmDelete) {
      return;
    }

    setDeleteBusy(true);
    try {
      const queuedEmailCount = await deleteEvent(slug);
      toast.success(
        queuedEmailCount && queuedEmailCount > 0
          ? `Event deleted. Queued ${queuedEmailCount} cancellation email(s).`
          : 'Event deleted.',
      );
      setDeleteOpen(false);
      navigate('/admin');
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete event.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Lifecycle */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lifecycle State</CardTitle>
          <CardDescription>Control whether the event is shown as current, past, or archived.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-w-xs">
            <Select value={form.lifecycleStatus} onValueChange={(value) => setForm((prev) => ({ ...prev, lifecycleStatus: value as EventLifecycleStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="past">Past</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Registration & Feature Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registration &amp; Hero Visibility</CardTitle>
          <CardDescription>Control whether new registrations are accepted and homepage hero promo card visibility.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-semibold text-slate-900">Registration Open</Label>
              <p className="text-xs text-slate-500">Allow users to register for this event.</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.registrationOpen} onCheckedChange={(v) => setForm((prev) => ({ ...prev, registrationOpen: v }))} />
              <span className="text-sm"><strong>{form.registrationOpen ? 'Open' : 'Closed'}</strong></span>
            </div>
          </div>

          <div className="border-t pt-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="font-semibold text-slate-900">Hero Section Promo Card</Label>
              <p className="text-xs text-slate-500">
                Display this event as the floating promo toast card in the homepage hero section.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={form.showHeroPromo}
                onCheckedChange={(v) => setForm((prev) => ({ ...prev, showHeroPromo: v }))}
              />
              <span className="text-sm"><strong>{form.showHeroPromo ? 'On' : 'Off'}</strong></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Price */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 max-w-xs">
            <Label>Price (optional)</Label>
            <Input value={form.price} onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))} placeholder="Contact for pricing" />
          </div>
        </CardContent>
      </Card>

      {/* Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibility Settings</CardTitle>
          <CardDescription>Which tiers can see attendees from other tiers.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(visibilityPresets).map(([key, preset]) => (
              <Button key={key} variant="outline" size="sm" onClick={() => applyPreset(preset)}>
                {key.replace(/-/g, ' ')}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {tierKeys.map(({ key, label }) => (
              <div key={key} className="rounded-lg border p-4 space-y-3">
                <p className="font-medium text-sm">{label} can see</p>
                {TIERS.map((t) => (
                  <label key={t} className="flex cursor-pointer items-center gap-2">
                    <Checkbox checked={settings[key].includes(t)} onCheckedChange={() => toggleTier(key, t)} />
                    <span className="text-sm capitalize">{t}s</span>
                  </label>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Gallery Link */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Gallery Link</CardTitle>
          <CardDescription>Optional internal or external gallery link. If populated, a Gallery button renders on the event page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            value={form.galleryUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, galleryUrl: e.target.value }))}
            placeholder="https://... or /gallery/cio-100-awards-conference"
          />
        </CardContent>
      </Card>

      {/* Luma Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Luma Integration</CardTitle>
          <CardDescription>Manage the Luma event link and sync.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={form.lumaUrl} onChange={(e) => setForm((prev) => ({ ...prev, lumaUrl: e.target.value }))} placeholder="https://lu.ma/your-event" className="flex-1" />
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" className="gap-1" disabled={lumaBusy} onClick={() => { void createLumaEvent(); }}>
              <ExternalLink className="h-4 w-4" /> Create Luma Event
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-xs text-slate-400">
              {USE_API_AUTH ? 'API-backed Luma sync active' : 'Local-first persistence active'}
            </span>
            <Button variant="outline" size="sm" className="gap-1" disabled={lumaBusy} onClick={() => { void syncLumaGuests(); }}>
              <RefreshCw className="h-4 w-4" /> Sync Now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-red-600">
            <AlertTriangle className="h-4 w-4" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Deleting this event is permanent and cannot be undone. Related registrations, agenda sessions, meetings, Luma links, and other event-linked data will be wiped.
          </p>
          <Dialog
            open={deleteOpen}
            onOpenChange={(open) => {
              setDeleteOpen(open);
              if (!open) {
                setDeleteConfirmText('');
                setDeleteImpact(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button variant="destructive">Delete Event</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Delete this event permanently?</DialogTitle>
                <DialogDescription>
                  This will permanently delete <strong>{event?.title}</strong>. There is no undo, and attendee-facing cancellation emails will be queued automatically for registered users.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
                  <p className="font-medium">This action will erase the event and its dependencies.</p>
                  <p className="mt-1 text-red-800">
                    Proceed only if you are certain this event should be fully removed from the database.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <p className="text-sm font-medium text-slate-900">Deletion impact</p>
                  {deleteImpactLoading ? (
                    <p className="mt-2 text-sm text-slate-600">Loading dependency counts...</p>
                  ) : deleteImpact ? (
                    <div className="mt-2 space-y-1 text-sm text-slate-700">
                      <p>{deleteImpact.registration_count} registration(s) will be removed.</p>
                      <p>{deleteImpact.event_session_count} agenda session(s) will be removed.</p>
                      <p>{deleteImpact.meeting_request_count} meeting request(s) will be removed.</p>
                      <p>{deleteImpact.scheduled_meeting_count} scheduled meeting(s) will be removed.</p>
                      <p>{deleteImpact.luma_record_count} Luma link record(s) will be removed.</p>
                      <p>{deleteImpact.cancellation_email_count} cancellation email(s) will be queued.</p>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-600">Dependency counts are unavailable right now.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-event-confirmation">
                    Type <span className="font-semibold">{event?.title}</span> to confirm deletion
                  </Label>
                  <Input
                    id="delete-event-confirmation"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={event?.title ?? 'Event title'}
                    autoComplete="off"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    void handleDeleteEvent();
                  }}
                  disabled={!canConfirmDelete || deleteBusy || deleteImpactLoading}
                >
                  {deleteBusy ? 'Deleting...' : 'Permanently Delete Event'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

/* ──────────────────── Preview & Deploy Tab ────────────────────── */

function PreviewDeployTab({
  slug,
  form,
  savedForm,
  speakers,
  savedSpeakers,
  sponsors,
  savedSponsors,
  itinerary,
  savedItinerary,
  highlightCards,
  savedHighlightCards,
  hasChanges,
  onDeploy,
  onDiscard,
  deploying,
}: {
  slug: string;
  form: EditorState;
  savedForm: EditorState;
  speakers: Speaker[];
  savedSpeakers: Speaker[];
  sponsors: Sponsor[];
  savedSponsors: Sponsor[];
  itinerary: ItineraryItem[];
  savedItinerary: ItineraryItem[];
  highlightCards: Array<{ icon: string; title: string; text: string }>;
  savedHighlightCards: Array<{ icon: string; title: string; text: string }>;
  hasChanges: boolean;
  onDeploy: () => void;
  onDiscard: () => void;
  deploying: boolean;
}): JSX.Element {
  const [previewOpen, setPreviewOpen] = useState(false);

  const diffs = useMemo(() => {
    const result: string[] = [];
    const keys = Object.keys(form) as (keyof EditorState)[];
    for (const k of keys) {
      if (form[k] !== savedForm[k]) {
        result.push(`${k}: "${String(savedForm[k]).slice(0, 40)}" -> "${String(form[k]).slice(0, 40)}"`);
      }
    }
    if (!arraysEqual(speakers, savedSpeakers)) result.push(`speakers: ${savedSpeakers.length} -> ${speakers.length} items`);
    if (!arraysEqual(sponsors, savedSponsors)) result.push(`sponsors: ${savedSponsors.length} -> ${sponsors.length} items`);
    if (!arraysEqual(itinerary, savedItinerary)) result.push(`itinerary: ${savedItinerary.length} -> ${itinerary.length} items`);
    if (!arraysEqual(highlightCards, savedHighlightCards)) result.push(`highlightCards: ${savedHighlightCards.length} -> ${highlightCards.length} items`);
    return result;
  }, [form, savedForm, speakers, savedSpeakers, sponsors, savedSponsors, itinerary, savedItinerary, highlightCards, savedHighlightCards]);

  const buildPreviewEvent = useCallback((): EventDetailType => {
    return {
      id: 0,
      slug,
      title: form.title,
      tagline: form.tagline,
      date: form.dateStart
        ? new Date(form.dateStart).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
        : 'TBD',
      location: form.location,
      description: form.description,
      attendees: form.attendees,
      heroImage: form.heroImage,
      heroImageMobile: form.heroImageMobile || form.heroImage,
      cardImage: form.cardImage || form.heroImage,
      bannerImage: form.bannerImage,
      gallery: [],
      overview: form.overview,
      objectives: [],
      speakers,
      sponsors,
      itinerary,
      highlights: form.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
      highlightCards,
      lifecycleStatus: form.lifecycleStatus,
      registrationOpen: form.registrationOpen,
      price: form.price || undefined,
      cta: form.ctaPrimaryLabel
        ? {
            primaryLabel: form.ctaPrimaryLabel,
            primaryUrl: form.ctaPrimaryUrl,
            isExternal: form.ctaIsExternal,
            secondaryLabel: form.ctaSecondaryLabel || undefined,
            secondaryUrl: form.ctaSecondaryUrl || undefined,
          }
        : undefined,
      metadata: {
        title: form.metaTitle || `Global CXO Circle | ${form.title}`,
        description: form.metaDescription || form.description,
        image: form.metaImage || form.bannerImage,
      },
      venue: {
        name: form.venueName || form.location,
        address: form.venueAddress || form.location,
        description: form.venueDescription,
        image: form.venueImage || form.heroImage,
        mapEmbedUrl: form.venueMapEmbedUrl || undefined,
      },
      livestreamUrl: form.livestreamUrl || undefined,
    };
  }, [form, speakers, sponsors, itinerary, highlightCards, slug]);

  return (
    <div className="space-y-6">
      {/* Diff Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change Summary</CardTitle>
          <CardDescription>
            {hasChanges
              ? `${diffs.length} field(s) have been modified.`
              : 'No unsaved changes.'}
          </CardDescription>
        </CardHeader>
        {hasChanges && (
          <CardContent>
            <ul className="space-y-1 text-sm text-slate-600 max-h-60 overflow-y-auto">
              {diffs.map((d, i) => (
                <li key={i} className="font-mono text-xs">{d}</li>
              ))}
            </ul>
          </CardContent>
        )}
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="gap-2" onClick={() => setPreviewOpen(true)}>
          <Eye className="h-4 w-4" />
          Preview Event Page
        </Button>
        <Button
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!hasChanges || deploying}
          onClick={onDeploy}
        >
          <Rocket className="h-4 w-4" />
          {deploying ? 'Saving...' : 'Save & Publish'}
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          disabled={!hasChanges}
          onClick={onDiscard}
        >
          <Undo2 className="h-4 w-4" />
          Discard Changes
        </Button>
      </div>

      {/* How it works */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-4">
          <div className="space-y-2 text-sm text-blue-900">
            <p className="font-semibold">How publishing works:</p>
            <ul className="list-disc ml-5 space-y-1 text-blue-800 text-xs">
              <li><strong>All content</strong> (text, speakers, sponsors, itinerary, settings) — saved to the database and reflected on the live website instantly.</li>
              <li><strong>Uploaded images</strong> — automatically synced to GoDaddy via FTP and visible on the live website within seconds.</li>
              <li><strong>URL-referenced images</strong> (external links) — work instantly since they're served from their source.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Full-screen Preview Overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <Button
            variant="outline"
            size="sm"
            className="fixed top-4 right-4 z-[60] gap-1 bg-white shadow-lg"
            onClick={() => setPreviewOpen(false)}
          >
            <X className="h-4 w-4" />
            Exit Preview
          </Button>
          <div>
            <EventDetail previewEvent={buildPreviewEvent()} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Main Component ─────────────────────── */

export default function AdminEventDetail(): JSX.Element {
  const { events, registrations, updateEvent, getBackendEventIdForSlug, eventVisibility, catalogHydrated } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const event = events.find((e) => e.slug === slug);

  // Editor form state
  const [form, setForm] = useState<EditorState>(() =>
    event ? buildEditorState(event) : buildEditorState({} as EventDetailType),
  );
  const [speakers, setSpeakers] = useState<Speaker[]>(() => event?.speakers ?? []);
  const [sponsors, setSponsors] = useState<Sponsor[]>(() => event?.sponsors ?? []);
  const [itinerary, setItinerary] = useState<ItineraryItem[]>(() => event?.itinerary ?? []);
  const [highlightCards, setHighlightCards] = useState<Array<{ icon: string; title: string; text: string }>>(() => event?.highlightCards ?? []);

  // Saved state (for diff and discard)
  const [savedForm, setSavedForm] = useState<EditorState>(() =>
    event ? buildEditorState(event) : buildEditorState({} as EventDetailType),
  );
  const [savedSpeakers, setSavedSpeakers] = useState<Speaker[]>(() => event?.speakers ?? []);
  const [savedSponsors, setSavedSponsors] = useState<Sponsor[]>(() => event?.sponsors ?? []);
  const [savedItinerary, setSavedItinerary] = useState<ItineraryItem[]>(() => event?.itinerary ?? []);
  const [savedHighlightCards, setSavedHighlightCards] = useState<Array<{ icon: string; title: string; text: string }>>(() => event?.highlightCards ?? []);

  const [deploying, setDeploying] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const buildPreviewEvent = useCallback((): EventDetailType => {
    return {
      id: 0,
      slug: slug || 'preview-event',
      title: form.title,
      tagline: form.tagline,
      date: form.dateStart
        ? new Date(form.dateStart).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
        : (event?.date || 'TBD'),
      location: form.location,
      description: form.description,
      attendees: form.attendees,
      heroImage: form.heroImage,
      heroImageMobile: form.heroImageMobile || form.heroImage,
      cardImage: form.cardImage || form.heroImage,
      bannerImage: form.bannerImage,
      gallery: [],
      overview: form.overview,
      objectives: [],
      speakers,
      sponsors,
      itinerary,
      highlights: form.highlights ? form.highlights.split('\n').map((h) => h.trim()).filter(Boolean) : [],
      highlightCards,
      lifecycleStatus: form.lifecycleStatus,
      registrationOpen: form.registrationOpen,
      price: form.price || undefined,
      cta: form.ctaPrimaryLabel
        ? {
            primaryLabel: form.ctaPrimaryLabel,
            primaryUrl: form.ctaPrimaryUrl,
            isExternal: form.ctaIsExternal,
            secondaryLabel: form.ctaSecondaryLabel || undefined,
            secondaryUrl: form.ctaSecondaryUrl || undefined,
          }
        : undefined,
      metadata: {
        title: `Global CXO Circle | ${form.title}`,
        description: form.description,
        image: form.bannerImage || form.heroImage,
      },
      venue: {
        name: form.venueName,
        address: form.venueAddress,
        description: form.venueDescription,
        image: form.venueImage || form.heroImage,
        mapEmbedUrl: form.venueMapEmbedUrl,
      },
      livestreamUrl: form.livestreamUrl || undefined,
    };
  }, [form, speakers, sponsors, itinerary, highlightCards, slug, event?.date]);

  // Try to fetch real date_start/date_end from backend
  const fetchedSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (!slug || fetchedSlugRef.current === slug) return;
    fetchedSlugRef.current = slug;
    void (async () => {
      try {
        const raw = await getEventBySlugApi(slug);
        if (raw.date_start) {
          const startLocal = raw.date_start.slice(0, 16);
          const endLocal = raw.date_end.slice(0, 16);
          setForm((prev) => ({ ...prev, dateStart: startLocal, dateEnd: endLocal }));
          setSavedForm((prev) => ({ ...prev, dateStart: startLocal, dateEnd: endLocal }));
        }
      } catch {
        // Backend may not be available; keep empty dates
      }
    })();
  }, [slug]);

  // Sync when event changes externally or slug changes
  const prevSlugRef = useRef<string | null>(null);
  useEffect(() => {
    if (!event) return;
    if (prevSlugRef.current !== event.slug) {
      prevSlugRef.current = event.slug;
      const fresh = buildEditorState(event);
      setForm(fresh);
      setSavedForm(fresh);
      setSpeakers(event.speakers);
      setSavedSpeakers(event.speakers);
      setSponsors(event.sponsors);
      setSavedSponsors(event.sponsors);
      setItinerary(event.itinerary);
      setSavedItinerary(event.itinerary);
      setHighlightCards(event.highlightCards);
      setSavedHighlightCards(event.highlightCards);
    }
  }, [event]);

  const hasChanges = useMemo(() => {
    return (
      !statesEqual(form, savedForm) ||
      !arraysEqual(speakers, savedSpeakers) ||
      !arraysEqual(sponsors, savedSponsors) ||
      !arraysEqual(itinerary, savedItinerary) ||
      !arraysEqual(highlightCards, savedHighlightCards)
    );
  }, [form, savedForm, speakers, savedSpeakers, sponsors, savedSponsors, itinerary, savedItinerary, highlightCards, savedHighlightCards]);

  const handleDiscard = useCallback(() => {
    setForm(savedForm);
    setSpeakers(savedSpeakers);
    setSponsors(savedSponsors);
    setItinerary(savedItinerary);
    setHighlightCards(savedHighlightCards);
    toast.info('All changes discarded.');
  }, [savedForm, savedSpeakers, savedSponsors, savedItinerary, savedHighlightCards]);

  const handleDeploy = useCallback(() => {
    if (!slug) return;
    void (async () => {
      setDeploying(true);
      try {
        const eventUuid = getBackendEventIdForSlug(slug);

        // Build the PATCH body matching API schema
        const ctaConfig = form.ctaPrimaryLabel
          ? {
              primary_label: form.ctaPrimaryLabel,
              primary_url: form.ctaPrimaryUrl,
              is_external: form.ctaIsExternal,
              ...(form.ctaSecondaryLabel ? { secondary_label: form.ctaSecondaryLabel, secondary_url: form.ctaSecondaryUrl } : {}),
            }
          : null;

        const visibility = eventVisibility[slug];
        const visibilityApi = visibility ? mapVisibilityToApi(visibility) : undefined;

        const patchBody: Record<string, unknown> = {
          title: form.title,
          tagline: form.tagline || null,
          location: form.location,
          description: form.description,
          overview: form.overview,
          hero_image: form.heroImage,
          banner_image: form.bannerImage,
          registration_open: form.registrationOpen,
          lifecycle_status: form.lifecycleStatus,
          luma_event_url: form.lumaUrl || null,
          gallery_url: form.galleryUrl || null,
          venue: {
            name: form.venueName,
            address: form.venueAddress,
            description: form.venueDescription,
            image: form.venueImage,
            mapEmbedUrl: form.venueMapEmbedUrl,
          },
          event_metadata: {
            gallery: [],
            highlights: form.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
            highlightCards,
            heroImageMobile: form.heroImageMobile,
            cardImage: form.cardImage,
            title: form.metaTitle,
            description: form.metaDescription,
            image: form.metaImage,
            livestreamUrl: form.livestreamUrl,
          },
          cta_config: ctaConfig,
          speakers_json: speakers.map((s) => ({ name: s.name, title: s.title, company: s.company, image: s.image })),
          sponsors_json: sponsors.map((s) => ({ name: s.name, logo: s.logo, website: s.website })),
          itinerary_json: itinerary.map((item) => ({
            date: item.date,
            time: item.time,
            title: item.title,
            description: item.description,
            type: item.type,
            time_of_day: item.timeOfDay,
          })),
        };

        if (form.dateStart) patchBody.date_start = new Date(form.dateStart).toISOString();
        if (form.dateEnd) patchBody.date_end = new Date(form.dateEnd).toISOString();
        if (visibilityApi) patchBody.visibility_setting = visibilityApi;

        if (eventUuid && USE_API_AUTH) {
          await patchEventApi(eventUuid, patchBody);
        }

        // Also update the local state and context (skip secondary patch because we just awaited patchEventApi)
        updateEvent(
          slug,
          {
            title: form.title,
            tagline: form.tagline,
            location: form.location,
            attendees: form.attendees,
            description: form.description,
            overview: form.overview,
            heroImage: form.heroImage,
            heroImageMobile: form.heroImageMobile,
            bannerImage: form.bannerImage,
            cardImage: form.cardImage,
            venueName: form.venueName,
            venueAddress: form.venueAddress,
            venueDescription: form.venueDescription,
            venueImage: form.venueImage,
            venueMapEmbedUrl: form.venueMapEmbedUrl,
            ctaPrimaryLabel: form.ctaPrimaryLabel,
            ctaPrimaryUrl: form.ctaPrimaryUrl,
            ctaIsExternal: form.ctaIsExternal,
            ctaSecondaryLabel: form.ctaSecondaryLabel,
            ctaSecondaryUrl: form.ctaSecondaryUrl,
            lumaUrl: form.lumaUrl,
            lifecycleStatus: form.lifecycleStatus,
            registrationOpen: form.registrationOpen,
            showHeroPromo: form.showHeroPromo,
            highlights: form.highlights.split('\n').map((h) => h.trim()).filter(Boolean),
            highlightCards,
            speakers,
            sponsors,
            itinerary,
            livestreamUrl: form.livestreamUrl,
          },
          true,
        );

        // Save current state as the new baseline
        setSavedForm({ ...form });
        setSavedSpeakers([...speakers]);
        setSavedSponsors([...sponsors]);
        setSavedItinerary([...itinerary]);
        setSavedHighlightCards([...highlightCards]);

        toast.success('Changes saved and live on the public website.');
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : 'Failed to deploy changes.');
      } finally {
        setDeploying(false);
      }
    })();
  }, [slug, form, speakers, sponsors, itinerary, highlightCards, getBackendEventIdForSlug, updateEvent, eventVisibility]);

  // Three-state guard:
  //   1. No slug at all → URL is broken, show "not found".
  //   2. Slug valid, catalog still hydrating → show skeleton; we don't
  //      know yet whether this event exists, so rendering "not found"
  //      would be a lie for the ~hundreds of ms between mount and
  //      catalog arrival.
  //   3. Catalog hydrated, event truly missing → real "not found".
  if (!slug) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Event not found.</p>
      </div>
    );
  }
  if (!event && !catalogHydrated) {
    return (
      <div className="p-4 sm:p-6">
        <EventDetailSkeleton />
      </div>
    );
  }
  if (!event) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-slate-500">Event not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
              Event Editor Studio
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{event.title}</h1>
          <p className="text-sm text-slate-500">
            {event.date} &middot; {event.location} &middot;{' '}
            {registrations.filter((r) => r.eventId === event.slug).length} registrations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview Event Page
          </Button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            You have unsaved changes.
          </p>
          <Button variant="outline" size="sm" className="gap-1 shrink-0" onClick={handleDiscard}>
            <Undo2 className="h-3 w-3" /> Discard
          </Button>
          <Button size="sm" className="gap-1 shrink-0 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDeploy} disabled={deploying}>
            {deploying ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      )}

      <Tabs defaultValue="content" className="space-y-6">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="attendees">Attendees</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="deploy">Preview &amp; Deploy</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <ContentTab
            form={form}
            setForm={setForm}
            speakers={speakers}
            setSpeakers={setSpeakers}
            sponsors={sponsors}
            setSponsors={setSponsors}
            itinerary={itinerary}
            setItinerary={setItinerary}
            highlightCards={highlightCards}
            setHighlightCards={setHighlightCards}
          />
        </TabsContent>

        <TabsContent value="attendees">
          <AttendeesTab slug={slug} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsTab slug={slug} form={form} setForm={setForm} />
        </TabsContent>

        <TabsContent value="deploy">
          <PreviewDeployTab
            slug={slug}
            form={form}
            savedForm={savedForm}
            speakers={speakers}
            savedSpeakers={savedSpeakers}
            sponsors={sponsors}
            savedSponsors={savedSponsors}
            itinerary={itinerary}
            savedItinerary={savedItinerary}
            highlightCards={highlightCards}
            savedHighlightCards={savedHighlightCards}
            hasChanges={hasChanges}
            onDeploy={handleDeploy}
            onDiscard={handleDiscard}
            deploying={deploying}
          />
        </TabsContent>
      </Tabs>

      {/* Full-screen Preview Overlay */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
          <Button
            variant="outline"
            size="sm"
            className="fixed top-4 right-4 z-[60] gap-1 bg-white shadow-lg border-slate-300"
            onClick={() => setPreviewOpen(false)}
          >
            <X className="h-4 w-4" />
            Exit Preview
          </Button>
          <div>
            <EventDetail previewEvent={buildPreviewEvent()} />
          </div>
        </div>
      )}
    </div>
  );
}
