import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { useParams, Navigate, useLocation, Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Star, ArrowRight, ChevronDown, ChevronUp, Download } from 'lucide-react';
import SponsorsGallery from '../SponsorsGallery';
import { EventDetail } from '../../data/EventsData';
import type { ItineraryItem, SubEvent } from '../../data/itinerary';
import ZoomableImage from '../ui/ZoomableImage';
import { useAuth } from '@/portal/hooks/useAuth';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/portal/components/ui/dialog';
import { Button } from '@/portal/components/ui/button';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { Textarea } from '@/portal/components/ui/textarea';
import { resolveEventLifecycle } from '@/portal/lib/eventLifecycle';

const DEFAULT_METADATA = {
  title: 'Global CXO Circle | Uniting Visionary Technology Leaders',
  description: 'An exclusive circle for CXOs to collaborate, learn, and shape the future of enterprise technology.',
  image: 'https://globalcxocircle.com/og-image.jpg',
};

declare global {
  interface Window {
    bannerModalCleanup?: () => void;
  }
}

const EventDetails = ({ previewEvent }: { previewEvent?: EventDetail }) => {
  const location = useLocation();
  const {
    isAuthenticated,
    user,
    events,
    catalogHydrated,
    registerForEvent,
    createStartupProfile,
    getLinkedStartup,
    getUserRegistrations,
  } = useAuth();
  const { slug } = useParams<{ slug?: string }>();
  const rawSlug = slug || 'sri-lanka-2025';
  const resolvedSlug = rawSlug === 'cio-100' || rawSlug === 'cio100' ? 'cio-100-awards-conference' : rawSlug;
  const event = previewEvent ?? events.find(e => e.slug === resolvedSlug);

  // State for collapsible overview
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);

  // State for itinerary day navigation
  const [activeDay, setActiveDay] = useState(0);

  // State for venue maps modal
  const [showMapsModal, setShowMapsModal] = useState(false);

  // State for banner zoom modal (mobile)
  const [showBannerModal, setShowBannerModal] = useState(false);

  // Store scroll position to prevent jumping
  const [scrollPosition, setScrollPosition] = useState(0);

  // State for dropdown sections
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});
  const [showStartupDialog, setShowStartupDialog] = useState(false);
  const [startupForm, setStartupForm] = useState({
    companyName: '',
    companyWebsite: '',
    description: '',
  });

  useEffect(() => {
    if (!event) {
      return;
    }

    const previousTitle = document.title;
    const cleanupFns: Array<() => void> = [];
    const applyMeta = (attr: 'name' | 'property', key: string, value: string) => {
      let element = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      const isNew = !element;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attr, key);
        document.head.appendChild(element);
      }
      const previousContent = element.getAttribute('content') || '';
      element.setAttribute('content', value);
      const target = element;
      cleanupFns.push(() => {
        if (!target) {
          return;
        }
        if (isNew) {
          target.remove();
        } else {
          target.setAttribute('content', previousContent);
        }
      });
    };

    const meta = event.metadata || DEFAULT_METADATA;
    document.title = meta.title || DEFAULT_METADATA.title;
    applyMeta('name', 'description', meta.description || DEFAULT_METADATA.description);
    applyMeta('property', 'og:title', meta.title || DEFAULT_METADATA.title);
    applyMeta('property', 'og:description', meta.description || DEFAULT_METADATA.description);
    applyMeta('property', 'og:image', meta.image || DEFAULT_METADATA.image);
    applyMeta('name', 'twitter:title', meta.title || DEFAULT_METADATA.title);
    applyMeta('name', 'twitter:description', meta.description || DEFAULT_METADATA.description);
    applyMeta('name', 'twitter:image', meta.image || DEFAULT_METADATA.image);

    return () => {
      document.title = previousTitle;
      cleanupFns.forEach(fn => fn());
    };
  }, [event]);

  useEffect(() => {
    setIsOverviewExpanded(false);
    setActiveDay(0);
    setExpandedSections({});
  }, [event?.slug]);

  // Note: Auto-collapsing disabled - sections remain expanded when switching days

  // Refs to support collapse/expand behavior
  const sectionContentRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Handle scroll to agenda when URL contains /agenda or scroll to speakers when requested
  useEffect(() => {
    if (location.pathname.includes('/agenda')) {
      const agendaSection = document.getElementById('agenda-section');
      if (agendaSection) {
        setTimeout(() => {
          const navbarHeight = 100; // Estimate of navbar (80px) + padding (20px)
          // const navbarHeight = 180; // Estimate of marketing banner (64px) + navbar (80px) + padding
          const y = agendaSection.getBoundingClientRect().top + window.scrollY - navbarHeight;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 150);
      }
    } else if (location.state?.scrollToSpeakers) {
      const speakersSection = document.getElementById('speakers-section');
      if (speakersSection) {
        setTimeout(() => {
          const navbarHeight = 100; // Estimate of navbar (80px) + padding (20px)
          // const navbarHeight = 180; // Estimate of marketing banner (64px) + navbar (80px) + padding
          const y = speakersSection.getBoundingClientRect().top + window.scrollY - navbarHeight;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }, 150);
      }
    }
  }, [location.pathname, location.state]);

  // Close banner modal on large desktop screen sizes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && showBannerModal) {
        setShowBannerModal(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [showBannerModal]);

  // Lock/unlock body scroll when banner modal opens/closes
  useEffect(() => {
    if (showBannerModal) {
      // Store current scroll position
      const currentScrollY = window.scrollY;
      setScrollPosition(currentScrollY);

      // Simple overflow lock - don't change position
      document.body.style.overflow = 'hidden';

      // Prevent scrolling on mobile with touch events
      const preventScroll = (e: TouchEvent) => {
        e.preventDefault();
      };

      document.addEventListener('touchmove', preventScroll, { passive: false });

      // Store the cleanup function
      window.bannerModalCleanup = () => {
        document.removeEventListener('touchmove', preventScroll);
      };
    } else {
      // Restore scroll
      document.body.style.overflow = '';

      // Clean up touch event listener
      if (window.bannerModalCleanup) {
        window.bannerModalCleanup();
        delete window.bannerModalCleanup;
      }

      // Restore exact scroll position
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'instant'
        });
      }, 0);
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      if (window.bannerModalCleanup) {
        window.bannerModalCleanup();
        delete window.bannerModalCleanup;
      }
    };
  }, [showBannerModal, scrollPosition]);

  // Show nothing while catalog is still loading — a premature <Navigate>
  // during the hydration window causes the SPA to yank the user off their
  // current page when refreshCatalog() re-fetches the events array.
  if (!event) {
    if (!catalogHydrated) return null;
    return <Navigate to="/events" replace />;
  }

  // Group itinerary by days
  const groupedItinerary = event.itinerary?.reduce<Record<string, ItineraryItem[]>>((acc, item) => {
    const day = item.date;
    if (!acc[day]) {
      acc[day] = [];
    }
    acc[day].push(item);
    return acc;
  }, {}) || {};

  const days = Object.keys(groupedItinerary);

  // Highlights data with logos
  const highlightCards = event.highlightCards?.length ? event.highlightCards : [];
  const secondaryCtaIsExternal = !!(event.cta?.secondaryUrl && event.cta.secondaryUrl.startsWith('http'));
  const existingRegistration = isAuthenticated && event
    ? getUserRegistrations(user.id).find(
        (registration) => registration.eventId === event.slug && registration.status !== 'cancelled',
      )
    : undefined;
  const linkedStartup = isAuthenticated ? getLinkedStartup(user.id) : undefined;
  const canRegisterForEvent = resolveEventLifecycle(event) === 'current';

  const handleRegister = () => {
    if (!isAuthenticated) {
      return;
    }

    if (!canRegisterForEvent) {
      toast.info('Registration is only available for current events.');
      return;
    }

    if (user.tier === 'startup' && !linkedStartup) {
      setShowStartupDialog(true);
      return;
    }

    void (async () => {
      const result = await registerForEvent(event.slug);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.info(result.message);
      }
    })();
  };

  const handleCreateStartupAndRegister = () => {
    void (async () => {
      if (!startupForm.companyName || !startupForm.companyWebsite || !startupForm.description) {
        toast.error('Please complete all startup profile fields.');
        return;
      }

      const startup = await createStartupProfile(startupForm);
      if (!startup) {
        toast.error('Could not create startup profile.');
        return;
      }

      const result = await registerForEvent(event.slug);
      toast.success(
        result.success ? `${startup.companyName} created and event registration confirmed.` : result.message,
      );
      setShowStartupDialog(false);
      setStartupForm({
        companyName: '',
        companyWebsite: '',
        description: '',
      });
    })();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'keynote': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'panel': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'workshop': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'networking': return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'break': return 'bg-gradient-to-r from-gray-400 to-gray-500';
      case 'cultural': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      case 'travel': return 'bg-gradient-to-r from-teal-500 to-blue-500';
      case 'arrival': return 'bg-gradient-to-r from-teal-500 to-blue-500';
      case 'breakfast': return 'bg-gradient-to-r from-yellow-500 to-orange-500';
      case 'pitch': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'lunch': return 'bg-gradient-to-r from-orange-500 to-red-500';
      case 'cocktails': return 'bg-gradient-to-r from-pink-500 to-purple-500';
      case 'dinner': return 'bg-gradient-to-r from-red-500 to-orange-500';
      case 'announcements': return 'bg-gradient-to-r from-red-600 to-red-500';
      default: return 'bg-gradient-to-r from-blue-500 to-purple-500';
    }
  };

  // Helper function to categorize events by time of day using the timeOfDay field
  const categorizeEventsByTime = (events: ItineraryItem[]) => {
    const morning = events.filter(event => event.timeOfDay === 'morning');
    const afternoon = events.filter(event => event.timeOfDay === 'afternoon');
    const evening = events.filter(event => event.timeOfDay === 'evening');

    return { morning, afternoon, evening };
  };

  const formatDayLabel = (day: string) => {
    if (!day) return '';
    const [month = '', ...rest] = day.split(' ');
    const monthAbbrev = month.length > 3 ? `${month.slice(0, 3)}` : month;
    const remainder = rest.join(' ').trim();
    return remainder ? `${monthAbbrev} ${remainder}` : monthAbbrev;
  };

  // Helper function to determine if dropdowns should be used
  const shouldUseDropdowns = (dayEvents: ItineraryItem[]) => {
    return dayEvents.length >= 8; // Threshold for using dropdowns
  };

  return (
    <div className="min-h-screen">
      {/* <div className="min-h-screen pt-20"> */}
      {/* <div className="min-h-screen pt-40"> */}
      {/* Banner Section - responsive heights for mobile & desktop */}
      <div className="relative min-h-[360px] sm:min-h-[420px] lg:min-h-[520px] overflow-hidden pt-[120px] sm:pt-[130px] lg:pt-[140px]">
        <picture>
          {event.heroImageMobile && (
            <source media="(max-width: 768px)" srcSet={event.heroImageMobile} />
          )}
          <img
            src={event.heroImage}
            alt={event.title}
            className="w-full h-full object-cover object-center max-h-[110vh] min-h-[360px]"
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 lg:px-8 pb-10 sm:pb-12 md:pb-16 text-white">
          <div className="max-w-7xl mx-auto space-y-4 sm:space-y-5">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-3 sm:mb-4">
              {event.title}
            </h1>
            {event.tagline && (
              <p className="text-lg sm:text-xl md:text-2xl text-white/90 mb-3 sm:mb-4 max-w-3xl">
                {event.tagline}
              </p>
            )}
            <div className="flex flex-wrap gap-4 sm:gap-6 text-base sm:text-lg md:text-xl">
              <div className="flex items-center gap-2">
                <Calendar size={24} />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={24} />
                <span>{event.location}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users size={24} />
                <span>{event.attendees} attendees{event.registrationOpen ? ' expected' : ''}</span>
              </div>
            </div>
            {/* Watch Livestream Button */}
            {event.livestreamUrl && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    const livestreamSection = document.getElementById('livestream-section');
                    if (livestreamSection) {
                      livestreamSection.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-full transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  Watch Livestream
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Overview - Collapsible */}
        {event.overview && event.overview.trim().length > 0 && (
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-navy-dark mb-8">Overview</h2>
            <div className="bg-transparent p-0">
              <p className="text-lg text-gray-700 leading-relaxed">
                {isOverviewExpanded || event.overview.length <= 300
                  ? event.overview
                  : `${event.overview.substring(0, 300)}...`
                }
              </p>
              {event.overview.length > 300 && (
                <button
                  onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                  className="flex items-center gap-2 text-blue-600 font-semibold mt-4 hover:text-blue-700 transition-colors"
                >
                  {isOverviewExpanded ? 'Read Less' : 'Read More'}
                  {isOverviewExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
              )}

              {(event.brochureUrl || event.slug === 'cio-100-awards-conference' || event.galleryUrl) && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  {(event.brochureUrl || event.slug === 'cio-100-awards-conference') && (
                    <a
                      href={event.brochureUrl || "/resources/gcxo-cio100-Brochure.pdf"}
                      download="CIO_100_Brochure.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-bold hover:opacity-95 transition-all shadow-md text-sm"
                    >
                      <Download size={18} /> Download Brochure
                    </a>
                  )}

                  {event.galleryUrl && (() => {
                    const isInternal = event.galleryUrl.startsWith('/') ||
                      event.galleryUrl.includes('globalcxocircle.com') ||
                      event.galleryUrl.includes('azurestaticapps.net') ||
                      event.galleryUrl.includes('global-cxo-mother-website.vercel.app');

                    return isInternal ? (
                      <Link
                        to={event.galleryUrl}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-bold hover:opacity-95 transition-all shadow-md text-sm"
                      >
                        View Event Gallery
                      </Link>
                    ) : (
                      <a
                        href={event.galleryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-700 to-indigo-600 text-white font-bold hover:opacity-95 transition-all shadow-md text-sm"
                      >
                        View Event Gallery
                      </a>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Sponsors Section */}
        {event.sponsors && event.sponsors.length > 0 && event.sponsors.some(s => s.logo || s.name) && (
          <div className="mb-20">
            <SponsorsGallery sponsors={event.sponsors} />
          </div>
        )}

        {/* Highlights Section - Horizontal Strip with Icons */}
        {highlightCards.length > 0 && (
          <div className="mb-24">
            <h2 className="text-3xl font-bold text-navy-dark mb-10">Highlights</h2>
            {/* Desktop: Horizontal scroll */}
            <div className="hidden md:block highlights-desktop-scroll">
              <div className="flex gap-3 lg:gap-4 xl:gap-5 2xl:gap-6">
                {highlightCards.map((highlight, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transition-shadow duration-300 flex-shrink-0 w-[clamp(14rem,calc((100%-2.25rem)/4),18rem)] lg:w-[clamp(14rem,calc((100%-3rem)/4),18rem)] xl:w-[clamp(14rem,calc((100%-3.75rem)/4),18rem)] 2xl:w-[clamp(14rem,calc((100%-4.5rem)/4),18rem)] highlight-card">
                    <div className="flex justify-center items-center mb-3 h-24">
                      <img src={highlight.icon} alt={highlight.title} className="w-20 h-20 object-contain mx-auto" />
                    </div>
                    <h3 className="text-lg font-bold text-navy-dark mb-2">{highlight.title}</h3>
                    <p className="text-gray-600 text-sm">{highlight.text}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile: Horizontal scroll */}
            <div className="md:hidden highlights-mobile-scroll">
              <div className="flex gap-4">
                {highlightCards.map((highlight, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-lg border border-gray-100 text-center hover:shadow-xl transition-shadow duration-300 flex-shrink-0 w-[clamp(14rem,85vw,18rem)] highlight-card">
                    <div className="flex justify-center items-center mb-3 h-24">
                      <img src={highlight.icon} alt={highlight.title} className="w-20 h-20 object-contain mx-auto" />
                    </div>
                    <h3 className="text-lg font-bold text-navy-dark mb-2">{highlight.title}</h3>
                    <p className="text-gray-600 text-sm">{highlight.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Livestream Section */}
        {event.livestreamUrl && event.livestreamUrl.trim().length > 0 && (
          <div id="livestream-section" className="mb-24">
            <h2 className="text-3xl font-bold text-navy-dark mb-10">Live Stream</h2>
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full"
                  src={event.livestreamUrl}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
            </div>
          </div>
        )}

        {/* Speakers Section */}
        {event.speakers && event.speakers.length > 0 && (
          <div id="speakers-section" className="mb-24">
            <h2 className="text-3xl font-bold text-navy-dark mb-10">Speakers</h2>
            {/* Desktop: Grid layout */}
            <div className="hidden md:block">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {event.speakers.map((speaker, index) => (
                  <div key={index} className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                      <img
                        src={speaker.image}
                        alt={speaker.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-navy-dark mb-2">{speaker.name}</h3>
                    <p className="text-blue-600 font-semibold mb-1">{speaker.title}</p>
                    <p className="text-gray-600 text-sm mb-3">{speaker.company}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Mobile: Horizontal scroll */}
            <div className="md:hidden speakers-mobile-scroll">
              <div className="flex gap-4">
                {event.speakers.map((speaker, index) => (
                  <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center flex-shrink-0 w-80 speaker-card">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-full overflow-hidden border-4 border-gray-200 shadow-lg">
                      <img
                        src={speaker.image}
                        alt={speaker.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-navy-dark mb-2">{speaker.name}</h3>
                    <p className="text-blue-600 font-semibold mb-1">{speaker.title}</p>
                    <p className="text-gray-600 text-sm mb-3">{speaker.company}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Agenda Section with Calendar */}
        {event.itinerary && event.itinerary.length > 0 && (
          <div id="agenda-section" className="mb-24">
            <h2 className="text-3xl font-bold text-navy-dark mb-10">Agenda</h2>

            {/* Day Taskbar - Visible on all viewports */}
            <div className="mb-8 agenda-buttons-container">
              <div className="agenda-buttons-scroll overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 sm:gap-3 lg:gap-8 pb-4 min-w-max" style={{ zIndex: 9999 }}>
                  {days.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveDay(index)}
                      className={`px-4 py-2 sm:px-6 sm:py-2 lg:px-8 lg:py-3 rounded-full font-semibold text-xs sm:text-sm lg:text-base whitespace-nowrap flex-shrink-0 transition-all duration-200 relative ${activeDay === index
                        ? 'bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-lg transform scale-105'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-105'
                        }`}
                      style={{ zIndex: 9999 }}
                    >
                      {formatDayLabel(day)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Add extra spacing on mobile to prevent content overlap */}
            <div className="block sm:hidden mb-4"></div>

            <div>
              {/* Calendar commented out for desktop parity with mobile */}
              {/**
              <div className="hidden lg:flex lg:col-span-1 order-1 lg:order-2 lg:justify-end">
                <div className="bg-white rounded-xl p-4 shadow-lg sticky top-8 w-full">
                  <h3 className="text-xl font-bold text-navy-dark mb-6 text-center">September 2025</h3>
                  <div className="grid grid-cols-7 gap-4 mb-0 w-fit ml-0">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <div key={index} className="text-center text-gray-500 text-sm font-medium p-1 w-fit leading-none">{day}</div>
                    ))}
                    {(() => { return []; })()}
                  </div>
                </div>
              </div>
              **/}

              {/* Schedule Content - Full width on Mobile, Right Side on Desktop */}
              <div>
                {/* Schedule Content for Active Day */}
                <div className="space-y-4">
                  {days[activeDay] && groupedItinerary[days[activeDay]] && (() => {
                    const dayEvents = groupedItinerary[days[activeDay]] || [];
                    const useDropdowns = shouldUseDropdowns(dayEvents);

                    if (useDropdowns) {
                      const { morning, afternoon, evening } = categorizeEventsByTime(dayEvents);
                      const sections: { title: string; events: ItineraryItem[]; key: string }[] = [
                        { title: 'Morning', events: morning, key: 'morning' },
                        { title: 'Afternoon', events: afternoon, key: 'afternoon' },
                        { title: 'Evening', events: evening, key: 'evening' }
                      ];

                      return sections.map((section) => (
                        <div key={section.key} className="bg-white rounded-lg shadow-md border border-gray-200">
                          <button
                            onClick={() => {
                              // Simple toggle - no auto-collapsing of other sections
                              const targetKey = `${days[activeDay]}-${section.key}`;
                              setExpandedSections(prev => ({
                                ...prev,
                                [targetKey]: !prev[targetKey]
                              }));
                            }}
                            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-navy-dark">{section.title}</h3>
                              <span className="text-sm text-gray-500">({section.events.length} events)</span>
                            </div>
                            {expandedSections[`${days[activeDay]}-${section.key}`] ? (
                              <ChevronUp size={20} className="text-gray-500" />
                            ) : (
                              <ChevronDown size={20} className="text-gray-500" />
                            )}
                          </button>
                          <div
                            ref={(el) => { sectionContentRefs.current[`${days[activeDay]}-${section.key}`] = el; }}
                            style={{
                              // Use a generous max-height so nested accordions (subEvents) don't get clipped.
                              maxHeight: expandedSections[`${days[activeDay]}-${section.key}`] ? '5000px' : 0,
                            }}
                            className="border-t border-gray-200 overflow-hidden transition-[max-height] duration-300 ease-in-out"
                          >
                            {section.events.map((item: ItineraryItem, index: number) => (
                              <div key={index} className="p-4 border-l-3 border-blue-500 bg-gray-50">
                                <div className="flex flex-col gap-2">
                                  {/* Mobile: Stack time above content, Desktop: Side by side */}
                                  <div className="sm:hidden mb-2">
                                    <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-md font-bold text-xs w-fit">
                                      {item.time}
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-3">
                                    <div className="hidden sm:block bg-blue-100 text-blue-600 px-3 py-1 rounded-md font-bold text-xs lg:text-sm w-fit shrink-0 whitespace-nowrap">
                                      {item.time}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <h3 className="text-sm lg:text-base font-bold text-navy-dark">{item.title}</h3>
                                        <span className={`px-2 py-1 rounded-full text-white text-xs lg:text-sm font-medium ${getTypeColor(item.type)}`}>
                                          {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                        </span>
                                      </div>

                                      {/* Sponsors */}
                                      {item.sponsors && item.sponsors.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                          <span className="text-blue-600 font-bold text-xs lg:text-sm">Sponsored by:</span>
                                          <span className="text-xs lg:text-sm text-gray-700">{item.sponsors.join(', ')}</span>
                                        </div>
                                      )}

                                      {/* Speakers */}
                                      {item.speakers && item.speakers.length > 0 && (
                                        <div className="mb-1">
                                          <span className="text-blue-600 font-bold text-xs lg:text-sm block mb-1">Speakers:</span>
                                          <div className="text-xs lg:text-sm text-gray-700">
                                            {(() => {
                                              const shouldUseBullets = item.speakers.length > 3 || item.speakers.some(speaker => speaker.length > 35) || item.speakers.join(', ').length > 50;

                                              if (shouldUseBullets) {
                                                return (
                                                  <div>
                                                    {item.speakers.map((speaker, idx) => (
                                                      <div key={idx} className="flex items-start gap-2 mb-1">
                                                        <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                                                        <span className="leading-relaxed">{speaker}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                );
                                              } else {
                                                return <span>{item.speakers.join(', ')}</span>;
                                              }
                                            })()}
                                          </div>
                                        </div>
                                      )}

                                      {/* Moderators */}
                                      {item.moderators && item.moderators.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                          <span className="text-blue-600 font-bold text-xs lg:text-sm">Moderator{item.moderators.length > 1 ? 's' : ''}:</span>
                                          <span className="text-xs lg:text-sm text-gray-700">{item.moderators.join(', ')}</span>
                                        </div>
                                      )}

                                      {/* Workshop Leaders */}
                                      {item.workshopLeaders && item.workshopLeaders.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                          <span className="text-blue-600 font-bold text-xs lg:text-sm">Led by:</span>
                                          <span className="text-xs lg:text-sm text-gray-700">{item.workshopLeaders.join(', ')}</span>
                                        </div>
                                      )}

                                      {/* Description */}
                                      {item.type !== 'break' && item.type !== 'announcements' && item.description && (
                                        <p className="text-xs lg:text-sm text-gray-700 mt-2" dangerouslySetInnerHTML={{
                                          __html: DOMPurify.sanitize(item.description)
                                        }} />
                                      )}

                                      {/* Sub-events Accordion */}
                                      {item.subEvents && item.subEvents.length > 0 && (
                                        <div className="mt-4">
                                          <button
                                            onClick={() => {
                                              const targetKey = `${days[activeDay]}-${section.key}-${index}-subevents`;
                                              setExpandedSections(prev => ({
                                                ...prev,
                                                [targetKey]: !prev[targetKey]
                                              }));
                                            }}
                                            className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                          >
                                            {expandedSections[`${days[activeDay]}-${section.key}-${index}-subevents`] ? (
                                              <ChevronUp size={16} />
                                            ) : (
                                              <ChevronDown size={16} />
                                            )}
                                            View Detailed Timeline ({item.subEvents.length} events)
                                          </button>

                                          {expandedSections[`${days[activeDay]}-${section.key}-${index}-subevents`] && (
                                            <div className="mt-3 space-y-3 border-l-2 border-blue-200 pl-4">
                                              {item.subEvents.map((subEvent, subIndex) => (
                                                <div key={subIndex} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                                  {/* Mobile: Stack time above content, Desktop: Side by side */}
                                                  <div className="sm:hidden mb-2">
                                                    <div className="bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-bold w-fit">
                                                      {subEvent.time}
                                                    </div>
                                                  </div>
                                                  <div className="flex items-start gap-3">
                                                    <div className="hidden sm:block bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-bold shrink-0 w-fit">
                                                      {subEvent.time}
                                                    </div>
                                                    <div className="flex-1">
                                                      <h4 className="font-semibold text-sm text-navy-dark mb-1">
                                                        {subEvent.title}
                                                      </h4>

                                                      {/* Sub-event speakers */}
                                                      {subEvent.speakers && subEvent.speakers.length > 0 && (
                                                        <div className="mb-1">
                                                          <span className="text-blue-600 font-bold text-xs block mb-1">
                                                            {subEvent.speakers.length > 3 ? 'Panel Members:' : 'Speakers:'}
                                                          </span>
                                                          {subEvent.speakers.length > 3 ? (
                                                            <div className="text-xs text-gray-700">
                                                              {subEvent.speakers.map((speaker, idx) => (
                                                                <div key={idx} className="flex items-start gap-2 mb-1">
                                                                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                                                                  <span className="leading-relaxed">{speaker}</span>
                                                                </div>
                                                              ))}
                                                            </div>
                                                          ) : (
                                                            <div className="text-xs text-gray-700">
                                                              {(() => {
                                                                const shouldUseBullets = subEvent.speakers.length > 2 || subEvent.speakers.some(speaker => speaker.length > 30) || subEvent.speakers.join(', ').length > 40;

                                                                if (shouldUseBullets) {
                                                                  return (
                                                                    <div>
                                                                      {subEvent.speakers.map((speaker, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 mb-1">
                                                                          <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                                                                          <span className="leading-relaxed">{speaker}</span>
                                                                        </div>
                                                                      ))}
                                                                    </div>
                                                                  );
                                                                } else {
                                                                  return <span>{subEvent.speakers.join(', ')}</span>;
                                                                }
                                                              })()}
                                                            </div>
                                                          )}
                                                        </div>
                                                      )}

                                                      {/* Sub-event moderators */}
                                                      {subEvent.moderators && subEvent.moderators.length > 0 && (
                                                        <div className="flex flex-wrap items-center gap-1 mb-1">
                                                          <span className="text-blue-600 font-bold text-xs">Moderator{subEvent.moderators.length > 1 ? 's' : ''}:</span>
                                                          <span className="text-xs text-gray-700">{subEvent.moderators.join(', ')}</span>
                                                        </div>
                                                      )}

                                                      {/* Sub-event description */}
                                                      {subEvent.description && (
                                                        <p className="text-xs text-gray-700 mt-1">{subEvent.description}</p>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    } else {
                      // Show all events without dropdowns for days with fewer events
                      return dayEvents.map((item: ItineraryItem, index: number) => (
                        <div key={index} className="bg-white rounded-lg p-4 shadow-md border-l-3 border-blue-500">
                          <div className="flex flex-col gap-2">
                            {/* Mobile: Stack time above content, Desktop: Side by side */}
                            <div className="sm:hidden mb-2">
                              <div className="bg-blue-100 text-blue-600 px-3 py-1 rounded-md font-bold text-xs w-fit">
                                {[0, 5, 6].includes(activeDay) ? 'All Day' : item.time}
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="hidden sm:block bg-blue-100 text-blue-600 px-3 py-1 rounded-md font-bold text-xs lg:text-sm w-fit shrink-0 whitespace-nowrap">
                                {[0, 5, 6].includes(activeDay) ? 'All Day' : item.time}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h3 className="text-sm lg:text-base font-bold text-navy-dark">{item.title}</h3>
                                  <span className={`px-2 py-1 rounded-full text-white text-xs lg:text-sm font-medium ${getTypeColor(item.type)}`}>
                                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                  </span>
                                </div>

                                {/* Sponsors */}
                                {item.sponsors && item.sponsors.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mb-1">
                                    <span className="text-blue-600 font-bold text-xs lg:text-sm">Sponsored by:</span>
                                    <span className="text-xs lg:text-sm text-gray-700">{item.sponsors.join(', ')}</span>
                                  </div>
                                )}

                                {/* Speakers */}
                                {item.speakers && item.speakers.length > 0 && (
                                  <div className="mb-1">
                                    <span className="text-blue-600 font-bold text-xs lg:text-sm block mb-1">Speakers:</span>
                                    <div className="text-xs lg:text-sm text-gray-700">
                                      {(() => {
                                        const shouldUseBullets = item.speakers.length > 3 || item.speakers.some(speaker => speaker.length > 35) || item.speakers.join(', ').length > 50;

                                        if (shouldUseBullets) {
                                          return (
                                            <div>
                                              {item.speakers.map((speaker, idx) => (
                                                <div key={idx} className="flex items-start gap-2 mb-1">
                                                  <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                                                  <span className="leading-relaxed">{speaker}</span>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        } else {
                                          return <span>{item.speakers.join(', ')}</span>;
                                        }
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Moderators */}
                                {item.moderators && item.moderators.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mb-1">
                                    <span className="text-blue-600 font-bold text-xs lg:text-sm">Moderator{item.moderators.length > 1 ? 's' : ''}:</span>
                                    <span className="text-xs lg:text-sm text-gray-700">{item.moderators.join(', ')}</span>
                                  </div>
                                )}

                                {/* Workshop Leaders */}
                                {item.workshopLeaders && item.workshopLeaders.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-1 mb-1">
                                    <span className="text-blue-600 font-bold text-xs lg:text-sm">Led by:</span>
                                    <span className="text-xs lg:text-sm text-gray-700">{item.workshopLeaders.join(', ')}</span>
                                  </div>
                                )}

                                {/* Description */}
                                {item.type !== 'break' && item.type !== 'announcements' && item.description && (
                                  <p className="text-xs lg:text-sm text-gray-700 mt-2" dangerouslySetInnerHTML={{
                                    __html: DOMPurify.sanitize(item.description)
                                  }} />
                                )}

                                {/* Sub-events Accordion */}
                                {item.subEvents && item.subEvents.length > 0 && (
                                  <div className="mt-4">
                                    <button
                                      onClick={() => {
                                        const targetKey = `${days[activeDay]}-${index}-subevents`;
                                        setExpandedSections(prev => ({
                                          ...prev,
                                          [targetKey]: !prev[targetKey]
                                        }));
                                      }}
                                      className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                                    >
                                      {expandedSections[`${days[activeDay]}-${index}-subevents`] ? (
                                        <ChevronUp size={16} />
                                      ) : (
                                        <ChevronDown size={16} />
                                      )}
                                      View Detailed Timeline ({item.subEvents.length} events)
                                    </button>

                                    {expandedSections[`${days[activeDay]}-${index}-subevents`] && (
                                      <div className="mt-3 space-y-3 border-l-2 border-blue-200 pl-4">
                                        {item.subEvents.map((subEvent, subIndex) => (
                                          <div key={subIndex} className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                            {/* Mobile: Stack time above content, Desktop: Side by side */}
                                            <div className="sm:hidden mb-2">
                                              <div className="bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-bold w-fit">
                                                {subEvent.time}
                                              </div>
                                            </div>
                                            <div className="flex items-start gap-3">
                                              <div className="hidden sm:block bg-blue-200 text-blue-700 px-2 py-1 rounded text-xs font-bold shrink-0 w-fit">
                                                {subEvent.time}
                                              </div>
                                              <div className="flex-1">
                                                <h4 className="font-semibold text-sm text-navy-dark mb-1">
                                                  {subEvent.title}
                                                </h4>

                                                {/* Sub-event speakers */}
                                                {subEvent.speakers && subEvent.speakers.length > 0 && (
                                                  <div className="mb-1">
                                                    <span className="text-blue-600 font-bold text-xs block mb-1">
                                                      {subEvent.speakers.length > 3 ? 'Panel Members:' : 'Speakers:'}
                                                    </span>
                                                    {subEvent.speakers.length > 3 ? (
                                                      <div className="text-xs text-gray-700">
                                                        {subEvent.speakers.map((speaker, idx) => (
                                                          <div key={idx} className="flex items-start gap-2 mb-1">
                                                            <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                                                            <span className="leading-relaxed">{speaker}</span>
                                                          </div>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs text-gray-700">
                                                        {(() => {
                                                          const shouldUseBullets = subEvent.speakers.length > 2 || subEvent.speakers.some(speaker => speaker.length > 30) || subEvent.speakers.join(', ').length > 40;

                                                          if (shouldUseBullets) {
                                                            return (
                                                              <div>
                                                                {subEvent.speakers.map((speaker, idx) => (
                                                                  <div key={idx} className="flex items-start gap-2 mb-1">
                                                                    <span className="text-blue-600 mt-0.5 flex-shrink-0">•</span>
                                                                    <span className="leading-relaxed">{speaker}</span>
                                                                  </div>
                                                                ))}
                                                              </div>
                                                            );
                                                          } else {
                                                            return <span>{subEvent.speakers.join(', ')}</span>;
                                                          }
                                                        })()}
                                                      </div>
                                                    )}
                                                  </div>
                                                )}

                                                {/* Sub-event moderators */}
                                                {subEvent.moderators && subEvent.moderators.length > 0 && (
                                                  <div className="flex flex-wrap items-center gap-1 mb-1">
                                                    <span className="text-blue-600 font-bold text-xs">Moderator{subEvent.moderators.length > 1 ? 's' : ''}:</span>
                                                    <span className="text-xs text-gray-700">{subEvent.moderators.join(', ')}</span>
                                                  </div>
                                                )}

                                                {/* Sub-event description */}
                                                {subEvent.description && (
                                                  <p className="text-xs text-gray-700 mt-1">{subEvent.description}</p>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ));
                    }
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Banner Section */}
        {(event.bannerImage || event.heroImage) && (
          <div className="mb-24">
            <div className="max-w-5xl mx-auto">
              <img
                src={event.bannerImage || event.heroImage}
                alt={`${event.title} banner`}
                className="w-full rounded-2xl shadow-lg cursor-pointer lg:cursor-default"
                onClick={() => {
                  // Enable click-to-zoom on mobile and tablet (below lg breakpoint - 1024px)
                  if (window.innerWidth < 1024) {
                    setShowBannerModal(true);
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Venue Section with Maps Integration */}
        {event.venue && (event.venue.name?.trim() || event.venue.address?.trim() || event.venue.image?.trim() || event.venue.description?.trim()) && (
          <div className="mb-24">
          <h2 className="text-3xl font-bold text-navy-dark mb-10">Venue</h2>
          <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden max-w-5xl mx-auto">
            {/* Venue Content */}
            <div className={`transition-all duration-500 ${showMapsModal ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="grid md:grid-cols-5 gap-0">
                <div className="md:col-span-3 relative overflow-hidden">
                  <img
                    src={event.venue.image}
                    alt={event.venue.name}
                    className="w-full h-full object-cover object-center min-h-[400px]"
                  />
                </div>
                <div className="md:col-span-2 p-8 flex flex-col justify-center bg-gradient-to-br from-gray-50 to-white">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                      <MapPin size={28} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-navy-dark mb-3">{event.venue.name}</h3>
                    <p className="text-gray-600 mb-4 text-sm leading-relaxed">{event.venue.address}</p>
                    <p className="text-gray-700 text-sm leading-relaxed mb-8">{event.venue.description}</p>
                    {event.venue.mapEmbedUrl && (
                      <button
                        onClick={() => setShowMapsModal(true)}
                        className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2 mx-auto"
                      >
                        SHOW ON MAP
                        <ArrowRight size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps Modal Overlay */}
            {showMapsModal && event.venue.mapEmbedUrl && (
              <div className="absolute inset-0 bg-white z-10 flex items-center justify-center">
                <div className="w-full h-full relative">
                  <button
                    onClick={() => setShowMapsModal(false)}
                    className="absolute top-4 right-4 z-20 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-shadow duration-200"
                  >
                    <ArrowRight size={24} className="text-gray-600 transform rotate-45" />
                  </button>
                  {/* Google Maps Embed */}
                  <iframe
                    src={event.venue.mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    className="rounded-2xl"
                    title="Taj Samudra Hotel Location"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Registration/Action Section */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 text-center">
          <div>
            <h3 className="text-2xl font-bold text-navy-dark mb-4">
              {event.registrationOpen ? 'Secure Your Invite' : 'Stay Connected'}
            </h3>
            <p className="text-lg text-gray-700 mb-6">
              {event.registrationOpen
                ? 'Secure your spot at this invite-only experience. Seats are limited to keep conversations meaningful.'
                : 'This gathering has concluded, but our team can share recaps and upcoming opportunities to engage.'}
            </p>
            {event.price && event.registrationOpen && (
              <p className="text-xl font-bold text-blue-600 mb-6">
                {event.price}
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              {event.registrationOpen && (
                !isAuthenticated ? (
                  <a
                    href={`/login?redirect=${encodeURIComponent(`/events/${event.slug}`)}`}
                    className="bg-navy-dark text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2 mx-auto sm:mx-0"
                  >
                    Log in to Register
                    <ArrowRight size={20} />
                  </a>
                ) : existingRegistration ? (
                  <div className="bg-emerald-600 text-white px-8 py-4 rounded-full font-semibold shadow-lg flex items-center gap-2 mx-auto sm:mx-0">
                    Registered
                  </div>
                ) : !canRegisterForEvent ? (
                  <div className="bg-slate-500 text-white px-8 py-4 rounded-full font-semibold shadow-lg flex items-center gap-2 mx-auto sm:mx-0">
                    Registration Closed
                  </div>
                ) : (
                  <button
                    onClick={handleRegister}
                    className="bg-navy-dark text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2 mx-auto sm:mx-0"
                  >
                    Register via GCXO
                    <ArrowRight size={20} />
                  </button>
                )
              )}
              {event.cta?.primaryLabel && event.cta.primaryUrl && (
                <a
                  href={event.cta.primaryUrl}
                  target={event.cta.isExternal ? '_blank' : undefined}
                  rel={event.cta.isExternal ? 'noreferrer noopener' : undefined}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2 mx-auto sm:mx-0"
                >
                  {event.cta.primaryLabel}
                  <ArrowRight size={20} />
                </a>
              )}
              {event.cta?.secondaryLabel && event.cta.secondaryUrl && (
                <a
                  href={event.cta.secondaryUrl}
                  target={secondaryCtaIsExternal ? '_blank' : undefined}
                  rel={secondaryCtaIsExternal ? 'noreferrer noopener' : undefined}
                  className="border border-blue-200 text-blue-600 px-8 py-4 rounded-full font-semibold hover:scale-105 transition-transform duration-200 shadow-lg flex items-center gap-2 mx-auto sm:mx-0 bg-white"
                >
                  {event.cta.secondaryLabel}
                  <ArrowRight size={20} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Banner Zoom Modal (Mobile & Tablet) */}
        {showBannerModal && (
          <ZoomableImage
            src={event.bannerImage}
            alt={`${event.title} banner - zoomed`}
            onClose={() => setShowBannerModal(false)}
          />
        )}

        <Dialog open={showStartupDialog} onOpenChange={setShowStartupDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Create startup profile before registering</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="event-startup-name">Company Name</Label>
                <Input
                  id="event-startup-name"
                  value={startupForm.companyName}
                  onChange={(e) => setStartupForm((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-startup-website">Company Website</Label>
                <Input
                  id="event-startup-website"
                  placeholder="https://yourstartup.com"
                  value={startupForm.companyWebsite}
                  onChange={(e) => setStartupForm((prev) => ({ ...prev, companyWebsite: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="event-startup-description">Description</Label>
                <Textarea
                  id="event-startup-description"
                  rows={4}
                  value={startupForm.description}
                  onChange={(e) => setStartupForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setShowStartupDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateStartupAndRegister}>Create Startup & Register</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default EventDetails; 