// Reference content returned when Gemini is unavailable. Every response built here carries
// `source: 'fallback'` so the UI can label it; nothing here pretends to be live model output.
// Transcription, ASL gloss and sign recognition deliberately have no fallback: inventing a
// transcript or a translation for a Deaf user would be worse than an honest error.

export function mapsFallback(query: string) {
  return {
    source: 'fallback' as const,
    content:
      `Live Google Maps results are unavailable right now, so these are sample listings to show the kind of ` +
      `access detail to look for when searching for "${query}".\n\n` +
      `1. **Sample: Glasshouse Pavilion**: step-free entry, even daylight for signing, open radial seating.\n` +
      `2. **Sample: Heritage Atrium**: pre-wired hearing loop, stage ramp, acoustic damping panels.\n` +
      `3. **Sample: Skyline Loft**: lift access, low-glare lighting, room for a sound-to-light dance floor.`,
    places: [
      { title: 'Sample: Glasshouse Pavilion', uri: '', reviewSnippets: ['Example of what to verify: even, non-glare lighting'] },
      { title: 'Sample: Heritage Atrium', uri: '', reviewSnippets: ['Example of what to verify: working hearing loop'] },
      { title: 'Sample: Skyline Loft', uri: '', reviewSnippets: ['Example of what to verify: step-free route to stage'] },
    ],
  };
}

export function searchFallback(eventType: string) {
  return {
    source: 'fallback' as const,
    content:
      `### Reference pricing ranges for ${eventType} (not live search results)\n\n` +
      `• **Catering**: roughly $45–$85 per guest for buffet/stations; $85–$140 for plated dinner.\n` +
      `• **ASL interpreters**: certified interpreter teams typically bill $85–$130 per interpreter-hour, often with 2-hour minimums. Assignments over an hour need two interpreters.\n` +
      `• **CART captioning**: commonly $150–$220 per hour.\n` +
      `• **Venue**: off-peak days (Friday, Sunday afternoon) are often 15–20% cheaper.\n\n` +
      `Verify current local rates with providers before budgeting.`,
    sources: [
      { title: 'Registry of Interpreters for the Deaf (RID)', uri: 'https://rid.org' },
      { title: 'National Association of the Deaf (NAD)', uri: 'https://www.nad.org' },
    ],
  };
}

export function chatFallback() {
  return {
    source: 'fallback' as const,
    content:
      `The AI assistant is offline right now. Here are general accessibility planning checks that apply to most events:\n\n` +
      `1. **Book access early**: certified interpreter teams and CART captioners are often booked 3–6 months out.\n` +
      `2. **Budget for it**: set aside a dedicated accessibility line, usually 8–15% of the total.\n` +
      `3. **Pair every sound with a sight**: dinner calls, toasts and alarms need a visual or tactile cue.\n` +
      `4. **Protect sightlines**: keep centerpieces at or below 9.5" and light signers from the front.`,
    suggestions: [
      'What questions should I ask an interpreter agency?',
      'How do I schedule interpreter swaps during speeches?',
      'What should go in an accessibility RSVP form?',
    ],
  };
}

export function ideasFallback() {
  return {
    source: 'fallback' as const,
    ideas: [
      {
        category: 'Inclusive Touch',
        title: 'Sign-Name Welcome Wall',
        description: 'Guests learn the hosts’ sign names from a looping video and illustrated cards at the entrance.',
        budgetImpact: 'Low',
        implementationTip: 'Ask your interpreter team to record a 20-second clip during prep.',
      },
      {
        category: 'Interactive Experience',
        title: 'Sound-to-Light Dance Floor',
        description: 'LED panels and sub-floor transducers let Deaf and hearing guests share the beat visually and through vibration.',
        budgetImpact: 'Medium',
        implementationTip: 'Request a slow, non-strobing colour palette (no more than 3 flashes per second).',
      },
      {
        category: 'Theme & Palette',
        title: 'High-Contrast Midnight & Amber',
        description: 'Dark, matte backdrops behind speakers and signers make hands and faces easy to read.',
        budgetImpact: 'Low',
        implementationTip: 'Avoid patterned or shiny backdrops directly behind the interpreter.',
      },
    ],
  };
}

export function planFallback(input: { eventType: string; guestCount: number; budget: number; dhhRatio: number }) {
  const { eventType, guestCount, budget, dhhRatio } = input;
  const share = (pct: number) => Math.round(budget * pct);
  const title = /wedding/i.test(eventType)
    ? 'Accessible Wedding Plan'
    : /birthday/i.test(eventType)
    ? 'Accessible Birthday Plan'
    : 'Accessible Community Gathering Plan';

  return {
    source: 'fallback' as const,
    title,
    theme: 'Warm Terracotta & Midnight Navy',
    executiveSummary: `A template plan for ${guestCount} guests on a $${budget.toLocaleString()} budget with ${dhhRatio}% Deaf/HoH guests. Generated from built-in defaults because the AI planner is unavailable; edit each section to fit your event.`,
    budgetAllocation: [
      { category: 'Venue Rental & Staging', amount: share(0.25), priority: 'Essential', notes: 'Hall with room for radial seating' },
      { category: 'Catering & Beverage', amount: share(0.3), priority: 'Essential', notes: 'Dietary cards with visual icons' },
      { category: 'Accessibility: ASL Interpreters & CART', amount: share(0.12), priority: 'Essential', notes: 'Teamed interpreters + live captioning' },
      { category: 'Photography & Video', amount: share(0.1), priority: 'High', notes: 'Captioned highlight reel' },
      { category: 'Music & Sound-to-Light Entertainment', amount: share(0.08), priority: 'High', notes: 'DJ with DMX lighting, no strobe' },
      { category: 'Florals & Low-Profile Decor', amount: share(0.08), priority: 'High', notes: 'Centerpieces ≤ 9.5"' },
      { category: 'Contingency', amount: share(0.05), priority: 'Base', notes: 'Day-of reserve' },
    ],
    countdownPhases: [
      {
        timeframe: '6–9 Months Before',
        description: 'Foundations and access bookings',
        tasks: [
          { title: 'Book venue after an accessibility walkthrough', category: 'Venue' },
          { title: 'Book a certified interpreter team and CART provider', category: 'Accessibility' },
          { title: 'Add an access-needs question to the RSVP', category: 'Stationery' },
        ],
      },
      {
        timeframe: '1 Month Before',
        description: 'Prep materials and layout',
        tasks: [
          { title: 'Send speeches, vows and names to interpreters and captioners', category: 'Accessibility' },
          { title: 'Finalize seating with clear sightlines to interpreter and screens', category: 'Layout' },
        ],
      },
    ],
    vendorChecklist: [
      {
        category: 'Accessibility & AV',
        name: 'Interpreter agency (to be sourced)',
        contact: '',
        emailPhone: '',
        status: 'To Research',
        estimatedCost: share(0.08),
        keyQuestions: ['Are interpreters certified and teamed for assignments over an hour?', 'Can you provide DeafBlind / pro-tactile interpreters?'],
        deadline: '6 Months Out',
        notes: '',
      },
      {
        category: 'Accessibility & AV',
        name: 'CART captioning provider (to be sourced)',
        contact: '',
        emailPhone: '',
        status: 'To Research',
        estimatedCost: share(0.04),
        keyQuestions: ['What caption latency should we expect?', 'Can captions be shown on two large screens?'],
        deadline: '4 Months Out',
        notes: '',
      },
    ],
    timelineMilestones: [
      { time: '15:00', title: 'Tech check', details: 'Test captions, interpreter lighting and visual cues', cueType: 'caption' },
      { time: '16:00', title: 'Welcome & opening remarks', details: 'Interpreter team in position, captions live', cueType: 'interpreter', interpreterRotation: true },
      { time: '18:00', title: 'Dinner call', details: 'Lights dim to 60% three times', cueType: 'visual' },
      { time: '19:00', title: 'Toasts', details: 'Speaker lit beside interpreter; captions on screens', cueType: 'interpreter', interpreterRotation: true },
      { time: '20:00', title: 'Dancing', details: 'Sound-to-light floor and tactile transducers on', cueType: 'haptic' },
    ],
    personalizedIdeas: ideasFallback().ideas,
    sightlineAndSeating: {
      recommendedLayout: 'Radial semi-circle facing stage and interpreter',
      focalZones: ['Interpreter platform', 'Speaker', 'Caption screens'],
      lightingGuidance: 'Even front lighting on signers; no backlighting.',
    },
    interpreterStaffing: { teamSize: 2, rotationIntervalMinutes: 20, qualifications: 'Certified interpreter team', prepMaterialWindowDays: 7 },
    sensoryAndVisualCues: [
      { trigger: 'Dinner Call', visualCue: 'Lights dim to 60% three times', hapticCue: 'Wearable double pulse', captionMode: 'Screen: "Dinner is served"' },
      { trigger: 'Toast Begins', visualCue: 'Spotlight on speaker and interpreter', hapticCue: 'Single long pulse', captionMode: 'Live CART' },
    ],
    readinessChecklist: [
      { item: 'Interpreter team booked', status: 'In Progress', detail: 'Template item: confirm booking' },
      { item: 'CART captioning booked', status: 'In Progress', detail: 'Template item: confirm booking' },
    ],
  };
}
