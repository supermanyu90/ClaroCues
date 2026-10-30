import { useState } from 'react';
import { type EventPlan, type MapsPlace, type VendorItem } from '../types';
import type { ResponseSource } from '../shared/api';
import { searchVenues } from '../services/apiClient';
import { errorMessage, safeExternalUrl } from '../utils/api';
import { ErrorNotice, SourceBadge } from './ui/SourceBadge';
import { createId } from '../utils/id';

interface LocalVenueRadarProps {
  currentPlan: EventPlan;
  onUpdatePlanVenue?: (venueName: string) => void;
  onAddVendor?: (vendor: VendorItem) => void;
}

export const LocalVenueRadar = ({ currentPlan, onUpdatePlanVenue, onAddVendor }: LocalVenueRadarProps) => {
  const [searchQuery, setSearchQuery] = useState<string>(
    `${currentPlan.venueName || 'Accessible event venues'} suitable for ${currentPlan.guestCount} guests with barrier-free access`
  );
  const [cityLocation, setCityLocation] = useState<string>('');
  const [geoCoordinates, setGeoCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{
    content: string;
    places: MapsPlace[];
    source: ResponseSource | 'sample';
  }>({
    source: 'sample',
    content:
      `Search for venues to get Gemini recommendations grounded in Google Maps, with links and review snippets.\n\n` +
      `Until you search, the cards above are examples of the access features worth checking: step-free routes, ` +
      `even non-glare lighting for signing, hearing loops and low reverberation.`,
    places: [
      {
        title: 'Example: daylight pavilion',
        uri: '',
        reviewSnippets: [
          'Even, non-glare lighting so signing is easy to read',
          'Single level with step-free terrace access',
        ],
      },
      {
        title: 'Example: heritage hall',
        uri: '',
        reviewSnippets: [
          'Working induction hearing loop throughout',
          'Stage ramp and front lighting for the interpreter',
        ],
      },
      {
        title: 'Example: modern loft',
        uri: '',
        reviewSnippets: [
          'Acoustic baffling that cuts reverberation',
          'Wide lifts and clear sightlines from every table',
        ],
      },
    ],
  });

  const [addedVenues, setAddedVenues] = useState<Record<string, boolean>>({});

  const handleGeoLocate = () => {
    if (!navigator.geolocation) {
      setError('Location is not available in this browser. Type a city instead.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoCoordinates({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation failed:', err);
        setError('Could not get your location. Type a city instead.');
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const handleSearch = async (overrideQuery?: string) => {
    const q = (overrideQuery || searchQuery).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const fullQuery = cityLocation ? `${q} in ${cityLocation}` : q;
      const data = await searchVenues(fullQuery, geoCoordinates ?? undefined);
      setResults({ content: data.content || '', places: data.places || [], source: data.source });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToPlan = (place: MapsPlace) => {
    if (onUpdatePlanVenue) {
      onUpdatePlanVenue(place.title);
    }
    if (onAddVendor) {
      const newVendor: VendorItem = {
        id: createId('v-map'),
        category: 'Venue & Facilities',
        name: place.title,
        contact: 'Manager on Duty',
        emailPhone: '',
        status: 'Contacted',
        estimatedCost: Math.round(currentPlan.totalBudget * 0.28),
        keyQuestions: [
          'Verify zero-threshold stage access ramp and wide radial seating clearance',
          'Confirm pre-installed audio induction loop or RF assistive listening system',
          'Review acoustic wall baffle absorption ratings to prevent echo',
        ],
        deadline: '2 Weeks Out',
        notes: place.uri ? `Found via Google Maps: ${place.uri}` : 'Added from sample listings; verify details',
      };
      onAddVendor(newVendor);
    }

    setAddedVenues((prev) => ({ ...prev, [place.title]: true }));
  };

  const presetFilters = [
    {
      label: '🏛️ Barrier-Free Banquet Halls',
      query: `Accessible banquet halls and ballrooms with step-free entry for ${currentPlan.guestCount} guests`,
    },
    {
      label: '🌿 Natural Light Garden & Lofts',
      query: `High natural daylight venues and lofts with open sightlines for ${currentPlan.eventType}`,
    },
    {
      label: '🎧 Induction Loop Venues',
      query: `Event venues with pre-wired hearing loops and low acoustic reverberation`,
    },
    {
      label: '🍷 Accessible Culinary & Caterers',
      query: `High-end dietary-inclusive catering and tasting studios for ${currentPlan.eventType}`,
    },
    {
      label: '💡 Frequency-Reactive Lighting',
      query: `Event lighting production vendors with sound-to-light LED dance floor systems`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row gap-6 items-start justify-between bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="space-y-2 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-medium">
            <span className="text-teal-400 font-semibold">Google Maps Grounding</span>
            <span aria-hidden="true">·</span>
            <span>Gemini 3.8 Flash</span>
            <span aria-hidden="true">·</span>
            <span>Live Geospatial Retrieval</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Venue & Vendor Radar (Google Maps Grounded)</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Find venues and vendors with Gemini grounded in Google Maps, then check each one for step-free access,
            lighting suited to signing, hearing loops and acoustics.
          </p>
        </div>

        {/* Current Active Venue Display */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 text-xs space-y-1 shrink-0">
          <div className="text-slate-400">Current Plan Venue:</div>
          <div className="font-semibold text-white truncate max-w-xs">{currentPlan.venueName}</div>
          <div className="text-[11px] text-teal-400 font-mono">
            {currentPlan.guestCount} Guests · {currentPlan.dhhPercentage}% Accessibility Target
          </div>
        </div>
      </div>

      {/* Search Input Bar & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                aria-label="Venue search"
                maxLength={500}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search venues, ballrooms, acoustic spaces, caterers..."
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="w-full sm:w-56 relative">
              <input
                type="text"
                aria-label="City or neighborhood"
                maxLength={120}
                value={cityLocation}
                onChange={(e) => setCityLocation(e.target.value)}
                placeholder="City / Neighborhood (e.g. Seattle, WA)"
                disabled={isLoading}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <button
              type="button"
              onClick={handleGeoLocate}
              disabled={isLocating || isLoading}
              title="Use current GPS location"
              aria-pressed={Boolean(geoCoordinates)}
              className={`px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center justify-center gap-1.5 shrink-0 ${
                geoCoordinates
                  ? 'bg-teal-500/20 border-teal-500 text-teal-300'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span>{isLocating ? 'Locating...' : geoCoordinates ? '📍 GPS Active' : '📍 Use GPS'}</span>
            </button>

            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-6 py-2.5 text-sm font-semibold text-slate-950 bg-teal-400 hover:bg-teal-300 disabled:opacity-50 rounded-lg transition-colors cursor-pointer shrink-0 shadow-sm"
            >
              {isLoading ? 'Grounding...' : 'Search Maps'}
            </button>
          </div>

          {/* Quick Query Presets */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Quick Scouts:</span>
            {presetFilters.map((filter, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSearchQuery(filter.query);
                  handleSearch(filter.query);
                }}
                className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800 hover:border-teal-500/50 text-slate-300 hover:text-teal-200 transition-colors cursor-pointer"
              >
                {filter.label}
              </button>
            ))}
          </div>
        </form>
      </div>

      <ErrorNotice message={error} onDismiss={() => setError(null)} />

      {/* Loading Indicator */}
      {isLoading && (
        <div role="status" className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center space-y-3">
          <div className="inline-block w-8 h-8 border-3 border-teal-400 border-t-transparent rounded-full motion-safe:animate-spin" />
          <div className="text-sm font-medium text-slate-200">
            Querying Gemini 3.8 Flash with Google Maps Grounding tool...
          </div>
          <div className="text-xs text-slate-400 max-w-md mx-auto">
            Looking up places, map links and review snippets.
          </div>
        </div>
      )}

      {/* Results Section */}
      {!isLoading && (
        <div className="space-y-6">
          {/* Real Google Maps Place Cards */}
          {results.places.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 tracking-wide uppercase">
                  {results.source === 'gemini' ? 'Google Maps places' : 'Example venues'} ({results.places.length})
                </h3>
                <SourceBadge source={results.source} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.places.map((place, idx) => {
                  const isAdded = addedVenues[place.title];
                  return (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-white text-base leading-snug">{place.title}</h4>
                          {results.source === 'gemini' && (
                            <span className="shrink-0 text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/30">
                              Google Maps
                            </span>
                          )}
                        </div>

                        {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <div className="text-[11px] font-medium text-slate-400">
                              {results.source === 'gemini' ? 'Google review insights:' : 'What to check:'}
                            </div>
                            {place.reviewSnippets.map((snippet, sIdx) => (
                              <blockquote
                                key={sIdx}
                                className="text-xs text-slate-300 italic bg-slate-950/60 border-l-2 border-teal-500/60 pl-2.5 py-1 rounded-r"
                              >
                                &ldquo;{snippet}&rdquo;
                              </blockquote>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
                        {safeExternalUrl(place.uri) ? (
                          <a
                            href={safeExternalUrl(place.uri) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-center px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-teal-300 hover:text-teal-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <span>Open in Maps</span>
                            <span aria-hidden="true">↗</span>
                            <span className="sr-only">: {place.title} (opens in a new tab)</span>
                          </a>
                        ) : null}

                        <button
                          onClick={() => handleAddToPlan(place)}
                          disabled={isAdded}
                          aria-label={isAdded ? `${place.title} added to plan` : `Select ${place.title} as venue`}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isAdded
                              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                              : 'bg-teal-400 hover:bg-teal-300 text-slate-950'
                          }`}
                        >
                          {isAdded ? '✓ Added to Plan' : 'Select Venue'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Scouting Synthesis */}
          {results.content && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="text-sm font-bold text-white">Scouting Analysis & Architectural Notes</div>
                <SourceBadge source={results.source} />
              </div>
              <div className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap space-y-2">
                {results.content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
