# ClaroCues ✦ Accessible Event Planning & DeafSpace Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg?logo=tailwindcss)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Google Gemini API](https://img.shields.io/badge/Google_Gemini-3.8_Flash_%26_Live-4285F4.svg?logo=google)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)

**ClaroCues** is a full-stack, GenAI-orchestrated event planning and execution suite engineered from the ground up for Deaf, DeafBlind, and Hard-of-Hearing accessibility. By synthesizing **DeafSpace architectural principles**, real-time geometric sightline analysis, sensory cue choreography, and Google's Gemini models, ClaroCues transforms how inclusive weddings, community summits, galas, and milestones are designed and hosted.

---

## 🌟 Key Highlights

- **✅ Access Readiness Audit**  
  A score out of 100 recomputed from the plan itself: teamed interpreters and rotation length, CART booking, accessibility budget share, interpreter/caption coverage of every spoken segment, visual equivalents for sound cues, emergency alerting, DeafBlind provision, prep-material lead time and floorplan sightlines. Each failing check says how to fix it, and the result is included in the PDF export.
- **📐 DeafSpace Floorplan Architect & Sightline Raycaster**  
  Interactive 2D drag-and-drop floorplan canvas with dynamic raycasting. Calculates real-time visual clearance from every guest seat to the ASL Dais, CART caption screens, and the acoustic vibration dance floor.
- **🏷️ Visual Sightline Legend & Accessibility Pods**  
  Color-coded status indicators distinguishing unobstructed priority sightlines, caution zones, and occluded angles. Supports specialized table configurations including Crescent Arc Tables, Wheelchair Companions (ADA 60″ turning radius), CART Alignment Pods, and DeafBlind Frontline rumble seating.
- **🌸 Centerpiece Height Guardrail**  
  Enforces strict DeafSpace physical constraints (centerpieces capped at $\le 9.5''$ or $8.5''$ on banquet tables) to prevent blocking facial expressions, lipreading, and signing space.
- **💬 Captioned Live Concierge (Gemini Live)**  
  Real-time planning conversation with Gemini Live. Both sides are captioned live (input and output audio transcription), and users can type instead of speaking, so the concierge works for Deaf and Hard-of-Hearing planners. The browser connects to Gemini directly with a single-use ephemeral token from `/api/live-token`, so it runs on serverless hosts like Vercel and the API key never reaches the client.
- **🗺️ Google Maps Grounded Venue Radar**  
  AI discovery grounded with Google Maps Platform to inspect venues for physical accessibility, step-free access, non-glare lighting, and low reverberation acoustic ceilings.
- **💰 Budget Planner with Benchmark Warning System**  
  Dynamic budget allocation engine with real-time divergence checks against industry standards (Catering, Venue, Accessibility/ASL/CART, AV & Lighting, Decor). Triggers proactive warnings when allocations deviate from recommended safety bands.
- **💡 Sensory Choreography & Visual Ambient Cues**  
  Synchronizes lighting color pulses, sub-bass tactile floor cues, and visual countdowns with ceremony milestones (toasts, vow exchanges, first dance, program shifts).
- **📋 Certified ASL & CART Vendor Workflow**  
  Dedicated checklist managing RID-certified interpreters, cued speech transliterators, and high-contrast projection equipment.
- **📄 Vector PDF Master Dossier Export**  
  Client-side multi-page PDF generation via `jspdf`, producing print-ready executive summaries, sightline metrics, budget allocations, and day-of schedules.
- **🗣️ Speech & Vow Studio → Interpreter Prep**  
  Record toasts and vows, get a verbatim transcript, and send it straight to the ASL gloss tool so interpreters and captioners receive scripts and names ahead of the event.
- **🤟 ASL Prep & Sign Practice**  
  Drafts ASL gloss with non-manual markers for interpreter preparation, and gives hearing hosts camera feedback on practice signs via Gemini vision. Both are labelled as preparation aids, not replacements for qualified interpreters.

---

## 🏛️ DeafSpace Architectural Principles in ClaroCues

ClaroCues applies the 5 DeafSpace principles pioneered at Gallaudet University:

| Principle                 | ClaroCues Implementation                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Sensory Reach**         | Raycasting sightline algorithms ensure unobstructed 360° visual perimeter between speakers, interpreters, and guests.   |
| **Space & Proximity**     | Crescent arc seating and 60″ ADA turning radiuses accommodate natural signing distance and companion mobility devices.  |
| **Light & Color**         | Venue checks verify indirect, diffused ambient lighting that prevents eye fatigue and avoids backlighting interpreters. |
| **Acoustics & Vibration** | Sensory floor staging leverages tactile bass resonance and wooden subflooring for shared musical rhythm.                |
| **Mobility & Flow**       | Wide corridor clearances prevent signing interruptions while attendees walk and converse simultaneously.                |

---

## 🛠️ Technology Stack

### Frontend

- **Framework**: React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";`)
- **Icons**: Lucide React
- **Animations**: Motion
- **Document Generation**: `jspdf` (client-side vector document generation)
- **Bundler**: Vite 8

### Backend & AI

- **Server**: Express 4 + Node.js (via `tsx`)
- **Real-Time Voice**: Gemini Live from the browser via ephemeral tokens
- **AI SDK**: `@google/genai` TypeScript SDK
- **Models**:
  - `gemini-3.8-flash`: Blueprint generation, budget recommendations, venue radar grounding, and conversational assistant.
  - `gemini-3.8-live`: Low-latency bidirectional voice concierge session.
  - `gemini-3.5-transcribe`: High-accuracy speech-to-text transcription for vows, speeches, and remarks.

---

## 📂 Project Structure

```
├── server.ts                  # Bootstrap: config, Gemini clients, HTTP server, Vite/static
├── api/index.ts               # Vercel serverless entry for the same Express app
├── server/
│   ├── app.ts                 # createApp(): composes security, routes and error handling
│   ├── http/                  # Helmet/CSP + rate limits, origin checks, JSON/URL parsing, responses
│   ├── routes/                # /api/gemini/* and /api/live-token routers
│   ├── ai.ts                  # AiGateway interface + Gemini implementation (faked in tests)
│   ├── liveToken.ts           # Locked, single-use Gemini Live ephemeral tokens
│   ├── validation.ts          # zod request schemas
│   ├── prompts.ts             # Prompt builders (user input fenced as data)
│   └── fallbacks.ts           # Labelled reference content when Gemini is unavailable
└── src/
    ├── App.tsx                # Layout, plan state, lazily loaded tab panels
    ├── services/apiClient.ts  # Typed client for every /api endpoint
    ├── hooks/                 # useDictation (record + transcribe), useCamera
    ├── live/                  # Gemini Live session hook, audio playback/capture, captions
    ├── shared/                # Types shared by client and server
    ├── components/
    │   ├── ui/                # Accessible Modal, Tabs, SourceBadge/ErrorNotice
    │   ├── assistant/         # Chat, market research and dictation panels
    │   ├── floorplan/         # Canvas, seating palette, table inspector
    │   ├── budget/            # Alerts, benchmarks, add-item form, ledger
    │   ├── sign/              # Avatar, ASL gloss drafting, sign practice
    │   └── *.tsx              # Feature screens composing the pieces above
    └── utils/                 # Pure, unit-tested logic: audit, sightlines, layout, budget, normalisation, PCM, CSV, PDF
```

**Conventions:** feature components stay presentational and delegate logic to pure functions in `src/utils` (unit-tested) and side effects to hooks in `src/hooks` / `src/live`. All network access goes through `src/services/apiClient.ts`. Model output is always treated as untrusted and normalised before it reaches state.

---

## 🚀 Quickstart & Setup

### Prerequisites

- **Node.js** $\ge 20.0.0$
- **npm** $\ge 10.0.0$
- A valid **Google Gemini API Key** (obtainable from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/supermanyu90/ClaroCues.git
cd ClaroCues
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Populate your environment variables in `.env`:

```env
# Gemini API Key for server-side generation, radar, and live sessions
GEMINI_API_KEY="your-gemini-api-key-here"

# Application hosting URL (optional in local development)
APP_URL="http://localhost:3000"

# Server Port (defaults to 3000)
PORT=3000
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The Express server serves the API endpoints (`/api/*`) and the Vite development middleware.

### Deploying to Vercel

`vercel.json` serves the built SPA and runs the Express API as a serverless function (`api/index.ts`). Set `GEMINI_API_KEY` in the Vercel project's environment variables. The live concierge works on Vercel because the browser connects to Gemini Live directly with an ephemeral token. One limit applies: Vercel caps request bodies at 4.5 MB, which limits dictation uploads to a few minutes.

### 4. Build for Production

```bash
npm run build
npm start
```

---

## ✅ Quality gates

```bash
npm run typecheck      # TypeScript strict mode (+ noUnusedLocals/Parameters, noImplicitReturns)
npm run lint           # ESLint: typescript-eslint strict, React Hooks (incl. React Compiler rules), jsx-a11y; zero warnings
npm run format:check   # Prettier
npm test               # Vitest: unit, API (Supertest) and component (Testing Library) tests
npm run test:coverage  # V8 coverage with enforced thresholds for src/utils and server
npm run check          # everything above + production build (what CI runs)
```

Server routes are tested against a fake `AiGateway` and a fake token client, so no API key or network is needed. Component tests check behaviour and accessibility (dialog focus management, ARIA tabs, keyboard-operable floorplan, labelled forms).

---

## ♿ Accessibility of the app itself

- Skip link, one `h1`, labelled landmarks, and ARIA tab patterns with Arrow/Home/End keys.
- Dialogs trap focus, close on Escape and return focus to the button that opened them.
- Every form control has a label; icon-only buttons have accessible names.
- Floorplan tables can be moved with arrow keys, and sightline changes are announced; a text summary of every table's status is provided for screen readers.
- Chat, captions and status messages use live regions.
- Honors `prefers-reduced-motion`; animations can be paused (WCAG 2.2.2), and visual cues use a steady tint, never flashes (WCAG 2.3.1).
- Text contrast meets WCAG AA on the dark theme.

---

## 🔒 Security & Privacy

- **Server-side keys**: Gemini calls run on the server; the live concierge gets only a short-lived, locked ephemeral token, never the API key.
- **Input validation**: every endpoint validates its body with zod (length caps, numeric ranges, base64 and MIME allow-lists). Per-route body-size limits are 100 KB by default, 3 MB for images and 15 MB for audio.
- **Prompt-injection hardening**: user text is passed to the model as a fenced JSON data block that the model is told to treat as data only.
- **Output handling**: model JSON is parsed defensively and normalized, links are restricted to `http(s)`, and CSV export neutralizes spreadsheet formulas.
- **HTTP hardening**: Helmet headers, a strict Content-Security-Policy in production, per-IP rate limiting on `/api/*`, and generic error messages with no stack traces.
- **Live concierge tokens**: `/api/live-token` only serves same-origin requests (plus `ALLOWED_ORIGINS`), is limited to 6 per minute per IP, and returns `no-store` tokens. Each token works once, must be used within 60 seconds, expires after 30 minutes, and has the model, instructions, voice and captions locked, so a leaked token can't be repurposed. The Origin check stops other websites but not scripted clients, so per-IP rate limits and Gemini quota alerts are the backstop.
- **No fabricated output**: without Gemini, planning endpoints return content labelled _Offline reference_. Transcription, ASL gloss and sign recognition return an error instead of inventing text.
- **Ephemeral media**: audio and camera frames are only sent while the user is actively recording or checking a sign, and are not stored. Microphone and camera tracks are released when no longer needed.

---

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).
