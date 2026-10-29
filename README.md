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

- **📐 DeafSpace Floorplan Architect & Sightline Raycaster**  
  Interactive 2D drag-and-drop floorplan canvas with dynamic raycasting. Calculates real-time visual clearance from every guest seat to the ASL Dais, CART caption screens, and the acoustic vibration dance floor.
- **🏷️ Visual Sightline Legend & Accessibility Pods**  
  Color-coded status indicators distinguishing unobstructed priority sightlines, caution zones, and occluded angles. Supports specialized table configurations including Crescent Arc Tables, Wheelchair Companions (ADA 60″ turning radius), CART Alignment Pods, and DeafBlind Frontline rumble seating.
- **🌸 Centerpiece Height Guardrail**  
  Enforces strict DeafSpace physical constraints (centerpieces capped at $\le 9.5''$ or $8.5''$ on banquet tables) to prevent blocking facial expressions, lipreading, and signing space.
- **🎙️ Real-Time Gemini 3.8 Live Voice Concierge**  
  Bidirectional voice assistant streaming low-latency PCM audio over WebSockets (`ws`) to plan, troubleshoot, and adapt events on the fly with spoken or sign-interpreted guidance.
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
- **🗣️ Speech & Vow Studio (Gemini 3.5)**  
  Dictation and speech transcription engine allowing speakers, hosts, and couples to record toasts and vows with instant clean-text transcription.

---

## 🏛️ DeafSpace Architectural Principles in ClaroCues

ClaroCues applies the 5 DeafSpace principles pioneered at Gallaudet University:

| Principle | ClaroCues Implementation |
|---|---|
| **Sensory Reach** | Raycasting sightline algorithms ensure unobstructed 360° visual perimeter between speakers, interpreters, and guests. |
| **Space & Proximity** | Crescent arc seating and 60″ ADA turning radiuses accommodate natural signing distance and companion mobility devices. |
| **Light & Color** | Venue checks verify indirect, diffused ambient lighting that prevents eye fatigue and avoids backlighting interpreters. |
| **Acoustics & Vibration** | Sensory floor staging leverages tactile bass resonance and wooden subflooring for shared musical rhythm. |
| **Mobility & Flow** | Wide corridor clearances prevent signing interruptions while attendees walk and converse simultaneously. |

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
- **Real-Time Streaming**: Native WebSockets (`ws`)
- **AI SDK**: `@google/genai` TypeScript SDK
- **Models**:
  - `gemini-3.8-flash`: Blueprint generation, budget recommendations, venue radar grounding, and conversational assistant.
  - `gemini-3.8-live`: Low-latency bidirectional voice concierge session.
  - `gemini-3.5-transcribe`: High-accuracy speech-to-text transcription for vows, speeches, and remarks.

---

## 📂 Project Structure

```
├── .env.example                  # Environment configuration template
├── index.html                    # Single-page entry with accessibility metadata
├── metadata.json                 # AI Studio applet specifications & permissions
├── package.json                  # Dependencies, scripts, and build pipeline
├── server.ts                     # Express + WebSocket gateway with Gemini integrations
├── tsconfig.json                 # TypeScript compiler configuration
├── vite.config.ts                # Vite build and Tailwind CSS configuration
└── src/
    ├── main.tsx                  # Application bootstrap
    ├── App.tsx                   # Main layout, tab navigation, and event state provider
    ├── index.css                 # Global styling and Tailwind directives
    ├── components/
    │   ├── AiAssistantChat.tsx           # Multi-turn conversational planning assistant
    │   ├── BudgetPlanner.tsx             # Budget matrix with industry benchmark warnings
    │   ├── FloorplanArchitect.tsx        # 2D visual sightline canvas with drag-and-drop
    │   ├── FloorplanLegend.tsx           # Legend for priority seating & sightline indicators
    │   ├── GeminiBlueprintModal.tsx      # GenAI event blueprint generator
    │   ├── Header.tsx                    # Top navigation, live concierge button, brand header
    │   ├── LiveVoiceAssistantModal.tsx   # Real-time WebSockets Gemini Live audio interface
    │   ├── LocalVenueRadar.tsx           # Maps-grounded venue accessibility inspector
    │   ├── PdfReportModal.tsx            # Printable report previewer & vector exporter
    │   ├── PersonalizedIdeasView.tsx     # Custom sensory & inclusive entertainment concepts
    │   ├── RunOfShowTimeline.tsx         # Minute-by-minute ceremony & reception timeline
    │   ├── SensoryVisualConsole.tsx      # Visual lighting cues & haptic pulse controller
    │   ├── SignInterpreterEngine.tsx     # ASL/CART team rotation & sightline coordinator
    │   ├── TimelineManager.tsx           # High-level milestone management
    │   └── VendorChecklist.tsx           # Vendor coordination with accessibility vetting
    ├── data/
    │   └── initialEventData.ts           # Preloaded accessible event templates & defaults
    ├── types/
    │   └── index.ts                      # Central TypeScript schemas & domain models
    └── utils/
        ├── budgetBenchmark.ts            # Industry average ratios & threshold calculation
        └── pdfGenerator.ts               # jsPDF document layout & vector formatting
```

---

## 🚀 Quickstart & Setup

### Prerequisites
- **Node.js** $\ge 20.0.0$
- **npm** $\ge 10.0.0$
- A valid **Google Gemini API Key** (obtainable from [Google AI Studio](https://aistudio.google.com/))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/clarocues.git
cd clarocues
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
Open [http://localhost:3000](http://localhost:3000) in your browser. The Express server serves both the API endpoints (`/api/*`), WebSockets gateway (`/live-audio`), and Vite development middleware.

### 4. Build for Production
```bash
npm run build
npm start
```

---

## 🔒 Security & Privacy

- **Server-Side API Proxying**: All calls to the Google Gemini API are encapsulated in `server.ts`. Raw API keys are never leaked to client browsers.
- **Ephemeral Audio**: Bidirectional voice streams processed during live concierge sessions are transiently routed through secure WebSockets and not persisted to disk.
- **Client-Side Document Export**: PDF generation is performed entirely in-memory inside the user's browser using client-side vector synthesis.

---

## 📄 License

This project is licensed under the [Apache-2.0 License](LICENSE).
