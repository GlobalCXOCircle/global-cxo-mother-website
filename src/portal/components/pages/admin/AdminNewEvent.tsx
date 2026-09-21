import type { JSX } from 'react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarPlus, Eye, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/portal/components/ui/image-upload';
import { toast } from 'sonner';

import { useAuth } from '@/portal/hooks/useAuth';
import type { EventLifecycleStatus } from '@/portal/data/EventsData';
import type { Speaker } from '@/portal/data/speakers';
import type { Sponsor } from '@/portal/data/sponsors';
import type { ItineraryItem } from '@/portal/data/itinerary';
import { Button } from '@/portal/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/portal/components/ui/card';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { Textarea } from '@/portal/components/ui/textarea';
import { Switch } from '@/portal/components/ui/switch';
import { Separator } from '@/portal/components/ui/separator';
import { Badge } from '@/portal/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/portal/components/ui/select';

const ITINERARY_TYPES = ['keynote', 'panel', 'workshop', 'networking', 'break', 'cultural', 'travel', 'arrival', 'breakfast', 'pitch', 'lunch', 'cocktails', 'dinner', 'announcements'] as const;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminNewEvent(): JSX.Element {
  const navigate = useNavigate();
  const { events, createEvent } = useAuth();
  const [form, setForm] = useState({
    title: '',
    slug: '',
    tagline: '',
    date: '',
    location: '',
    attendees: '50+',
    description: '',
    overview: '',
    objectives: '',
    lifecycleStatus: 'current' as EventLifecycleStatus,
    registrationOpen: true,
    venueName: '',
    venueAddress: '',
    venueDescription: '',
    lumaUrl: '',
    galleryUrl: '',
    heroImage: '',
    bannerImage: '',
    venueImage: '',
    venueMapEmbedUrl: '',
    ctaPrimaryLabel: '',
    ctaPrimaryUrl: '',
    ctaIsExternal: false,
    highlights: '',
  });

  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [itinerary, setItinerary] = useState<Array<ItineraryItem>>([]);
  const [highlightCards, setHighlightCards] = useState<Array<{ icon: string; title: string; text: string }>>([]);

  const suggestedSlug = useMemo(
    () => slugify(form.slug || form.title),
    [form.slug, form.title],
  );

  const slugAvailable = useMemo(
    () => suggestedSlug.length > 0 && !events.some((event) => event.slug === suggestedSlug),
    [events, suggestedSlug],
  );

  const updateField = (field: keyof typeof form, value: string | boolean): void => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (): void => {
    void (async () => {
      if (!form.title || !form.date || !form.location || !form.description || !form.overview) {
        toast.error('Please complete the required event fields.');
        return;
      }

      if (!suggestedSlug) {
        toast.error('Please enter a valid event title or slug.');
        return;
      }

      const created = await createEvent({
        title: form.title,
        slug: form.slug,
        tagline: form.tagline,
        date: form.date,
        location: form.location,
        attendees: form.attendees,
        description: form.description,
        overview: form.overview,
        objectives: form.objectives
          .split('\n')
          .map((objective) => objective.trim())
          .filter(Boolean),
        lifecycleStatus: form.lifecycleStatus,
        registrationOpen: form.registrationOpen,
        venueName: form.venueName,
        venueAddress: form.venueAddress,
        venueDescription: form.venueDescription,
        venueImage: form.venueImage,
        venueMapEmbedUrl: form.venueMapEmbedUrl,
        lumaUrl: form.lumaUrl,
        galleryUrl: form.galleryUrl,
        heroImage: form.heroImage,
        bannerImage: form.bannerImage,
        ctaPrimaryLabel: form.ctaPrimaryLabel,
        ctaPrimaryUrl: form.ctaPrimaryUrl,
        ctaIsExternal: form.ctaIsExternal,
        highlights: form.highlights
          .split('\n')
          .map((h) => h.trim())
          .filter(Boolean),
        highlightCards,
        speakers,
        sponsors,
        itinerary,
      });

      toast.success(`${created.title} created.`);
      navigate(`/admin/events/${created.slug}`);
    })();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Link>
            </Button>
            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
              Mock Builder
            </Badge>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create New Event</h1>
          <p className="text-sm text-slate-500">
            Build a new GCXO event in mock state. It will immediately appear on the public site
            and in the admin console.
          </p>
        </div>
        <Button onClick={handleSubmit} className="gap-2">
          <CalendarPlus className="h-4 w-4" />
          Create Event
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Event Details</CardTitle>
            <CardDescription>
              Required fields are enough to publish a working mock event page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="event-title">Title</Label>
                <Input
                  id="event-title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="GCXO Founder Roundtable 2026"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-slug">Slug Override</Label>
                <Input
                  id="event-slug"
                  value={form.slug}
                  onChange={(e) => updateField('slug', e.target.value)}
                  placeholder="Optional manual slug"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-attendees">Expected Attendance</Label>
                <Input
                  id="event-attendees"
                  value={form.attendees}
                  onChange={(e) => updateField('attendees', e.target.value)}
                  placeholder="75+"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-date">Date</Label>
                <Input
                  id="event-date"
                  value={form.date}
                  onChange={(e) => updateField('date', e.target.value)}
                  placeholder="May 18, 2026"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-location">Location</Label>
                <Input
                  id="event-location"
                  value={form.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="San Francisco, California"
                />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="event-tagline">Tagline</Label>
                <Input
                  id="event-tagline"
                  value={form.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  placeholder="A curated gathering for enterprise leaders and founders."
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                rows={4}
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Short summary used across cards and the event hero."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-overview">Overview</Label>
              <Textarea
                id="event-overview"
                rows={6}
                value={form.overview}
                onChange={(e) => updateField('overview', e.target.value)}
                placeholder="Longer event narrative for the full event page."
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event-objectives">Objectives</Label>
              <Textarea
                id="event-objectives"
                rows={4}
                value={form.objectives}
                onChange={(e) => updateField('objectives', e.target.value)}
                placeholder={'One objective per line\nValidate sponsor outreach\nDrive founder signups'}
              />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="event-lifecycle">Lifecycle State</Label>
                <Select
                  value={form.lifecycleStatus}
                  onValueChange={(value) => updateField('lifecycleStatus', value as EventLifecycleStatus)}
                >
                  <SelectTrigger id="event-lifecycle">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium text-slate-900">Registration Open</p>
                  <p className="text-sm text-slate-500">
                    Controls whether the event appears as upcoming on the public site.
                  </p>
                </div>
                <Switch
                  checked={form.registrationOpen}
                  onCheckedChange={(checked) => updateField('registrationOpen', checked)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="luma-url">Luma URL</Label>
                <div className="relative">
                  <LinkIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <Input
                    id="luma-url"
                    className="pl-10"
                    value={form.lumaUrl}
                    onChange={(e) => updateField('lumaUrl', e.target.value)}
                    placeholder="https://lu.ma/your-event"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div>
                <h2 className="font-semibold text-slate-900">Venue Details</h2>
                <p className="text-sm text-slate-500">
                  Optional. If left blank, the event location will be reused.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="venue-name">Venue Name</Label>
                  <Input
                    id="venue-name"
                    value={form.venueName}
                    onChange={(e) => updateField('venueName', e.target.value)}
                    placeholder="GCXO Innovation Studio"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="venue-address">Venue Address</Label>
                  <Input
                    id="venue-address"
                    value={form.venueAddress}
                    onChange={(e) => updateField('venueAddress', e.target.value)}
                    placeholder="Palo Alto, California"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="venue-description">Venue Description</Label>
                <Textarea
                  id="venue-description"
                  rows={3}
                  value={form.venueDescription}
                  onChange={(e) => updateField('venueDescription', e.target.value)}
                  placeholder="Optional venue narrative shown on the event page."
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <ImageUpload label="Venue Image" value={form.venueImage} onChange={(v) => updateField('venueImage', v)} folder="events/venues" />
                <div className="grid gap-2">
                  <Label htmlFor="venue-map">Venue Map Embed URL</Label>
                  <Input id="venue-map" value={form.venueMapEmbedUrl} onChange={(e) => updateField('venueMapEmbedUrl', e.target.value)} placeholder="https://maps.google.com/maps?q=...&output=embed" />
                </div>
              </div>
            </div>

            <Separator />

            {/* Images */}
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Images</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <ImageUpload label="Hero Image" value={form.heroImage} onChange={(v) => updateField('heroImage', v)} folder="events/hero" />
                <ImageUpload label="Banner Image" value={form.bannerImage} onChange={(v) => updateField('bannerImage', v)} folder="events/banner" />
              </div>
            </div>

            <Separator />

            {/* CTA */}
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Call to Action</h2>
              <p className="text-sm text-slate-500">If empty, defaults to the Luma URL or built-in registration.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>CTA Button Label</Label>
                  <Input value={form.ctaPrimaryLabel} onChange={(e) => updateField('ctaPrimaryLabel', e.target.value)} placeholder="Register Now" />
                </div>
                <div className="grid gap-2">
                  <Label>CTA Button URL</Label>
                  <Input value={form.ctaPrimaryUrl} onChange={(e) => updateField('ctaPrimaryUrl', e.target.value)} placeholder="https://lu.ma/your-event" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.ctaIsExternal} onCheckedChange={(v) => updateField('ctaIsExternal', v)} />
                <Label>Opens in new tab (external link)</Label>
              </div>
            </div>

            <Separator />

            {/* Highlights */}
            <div className="space-y-4">
              <h2 className="font-semibold text-slate-900">Highlights</h2>
              <div className="grid gap-2">
                <Label>Highlight Bullets (one per line)</Label>
                <Textarea rows={3} value={form.highlights} onChange={(e) => updateField('highlights', e.target.value)} placeholder={"75+ CXOs\n30+ Startups\nCurated 1-on-1s"} />
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
              </div>
            </div>

            <Separator />

            {/* Speakers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Speakers</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => setSpeakers((p) => [...p, { name: '', title: '', company: '', image: '' }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Speaker
                </Button>
              </div>
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
            </div>

            <Separator />

            {/* Sponsors */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Sponsors</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => setSponsors((p) => [...p, { name: '', logo: '', website: '' }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Sponsor
                </Button>
              </div>
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
            </div>

            <Separator />

            {/* Itinerary */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Itinerary</h2>
                <Button type="button" variant="outline" size="sm" onClick={() => setItinerary((p) => [...p, { date: '', time: '', title: '', description: '', type: 'keynote', timeOfDay: 'morning' }])}>
                  <Plus className="h-3 w-3 mr-1" /> Add Item
                </Button>
              </div>
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
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Title</p>
                <p className="text-lg font-semibold text-slate-900">
                  {form.title || 'Untitled Event'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Slug</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-slate-700">
                    /events/{suggestedSlug || 'event-slug'}
                  </p>
                  <Badge
                    className={
                      slugAvailable
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                    }
                  >
                    {slugAvailable ? 'available' : 'will auto-adjust'}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Public Status</p>
                <p className="text-sm text-slate-700">
                  {form.lifecycleStatus === 'archived'
                    ? 'Archived / hidden from public event lists'
                    : form.lifecycleStatus === 'current'
                      ? 'Current / visible in active event lists'
                      : 'Past / visible in the past events list'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">CTA</p>
                <p className="text-sm text-slate-700">
                  {form.lumaUrl ? 'Opens external Luma event' : 'Uses built-in GCXO event page'}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What happens next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>The event will appear in the admin sidebar immediately.</p>
              <p>It will also show on the public `Events` page and in the homepage swiper if registration is open.</p>
              <p>Admins can then open the event detail view to manage attendees and settings.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
