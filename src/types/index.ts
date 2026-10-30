export type EventCategory = 'wedding' | 'birthday' | 'community' | 'corporate';

export interface SensoryCue {
  id: string;
  trigger: string;
  visualCue: string;
  hapticCue: string;
  captionMode: string;
  active?: boolean;
}

export interface BudgetItem {
  id: string;
  category: string;
  amount: number;
  priority: 'Essential' | 'High' | 'Recommended' | 'Base';
  notes: string;
  status: 'Estimated' | 'Booked' | 'Paid';
  vendorId?: string;
}

export interface TimelineMilestone {
  id: string;
  time: string;
  title: string;
  details: string;
  cueType: 'visual' | 'interpreter' | 'caption' | 'haptic' | 'milestone';
  interpreterRotation?: boolean;
}

export interface CountdownTask {
  id: string;
  title: string;
  completed: boolean;
  category: string;
  dueDate?: string;
  notes?: string;
}

export interface CountdownPhase {
  id: string;
  timeframe: string;
  description: string;
  tasks: CountdownTask[];
}

export interface VendorItem {
  id: string;
  category: string;
  name: string;
  contact: string;
  emailPhone: string;
  status: 'To Research' | 'Contacted' | 'Proposal Received' | 'Booked' | 'Paid';
  estimatedCost: number;
  keyQuestions: string[];
  deadline: string;
  notes: string;
}

export interface PersonalizedIdea {
  id: string;
  category: 'Theme & Palette' | 'Food & Beverage' | 'Interactive Experience' | 'Atmosphere & Decor' | 'Inclusive Touch';
  title: string;
  description: string;
  budgetImpact: 'Low' | 'Medium' | 'High';
  implementationTip: string;
  isSaved?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  source?: 'gemini' | 'fallback';
}

export interface SightlineTable {
  id: string;
  name: string;
  x: number;
  y: number;
  shape: 'crescent' | 'u-shape' | 'radial';
  seats: number;
  centerpieceHeightInches: number;
  dhhGuestCount: number;
  tableType?: 'dhh-crescent' | 'wheelchair-pod' | 'cart-pod' | 'tactile-close' | 'standard';
  wheelchairSpots?: number;
  notes?: string;
}

export interface EventPlan {
  id: string;
  title: string;
  eventType: EventCategory;
  guestCount: number;
  dhhPercentage: number;
  totalBudget: number;
  venueName: string;
  dateStr: string;
  theme: string;
  executiveSummary: string;
  budgetAllocation: BudgetItem[];
  countdownPhases: CountdownPhase[];
  timelineMilestones: TimelineMilestone[];
  vendorChecklist: VendorItem[];
  personalizedIdeas: PersonalizedIdea[];
  sightlineAndSeating: {
    recommendedLayout: string;
    focalZones: string[];
    lightingGuidance: string;
  };
  interpreterStaffing: {
    teamSize: number;
    rotationIntervalMinutes: number;
    qualifications: string;
    prepMaterialWindowDays: number;
  };
  sensoryAndVisualCues: SensoryCue[];
  readinessChecklist: {
    item: string;
    status: 'Verified' | 'Ready' | 'In Progress';
    detail: string;
  }[];
  /** Floorplan tables; when absent the default sample layout is used. */
  seatingLayout?: SightlineTable[];
}

// Backwards compatibility alias
export type EventBlueprint = EventPlan;

export interface AslSignItem {
  gloss: string;
  english: string;
  category: 'Greeting' | 'Celebration' | 'Toast' | 'Logistics' | 'Emergency';
  handshape: string;
  movement: string;
  nonManual: string;
  keyframes: {
    leftHand: { x: number; y: number; open: boolean };
    rightHand: { x: number; y: number; open: boolean };
    headTilt: number;
    brows: 'neutral' | 'raised' | 'lowered';
  }[];
}

export interface MapsPlace {
  title: string;
  uri: string;
  reviewSnippets?: string[];
  address?: string;
  category?: string;
}

export interface SearchSource {
  title: string;
  uri: string;
}
