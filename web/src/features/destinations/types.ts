export interface Destination {
  id: string;
  name: string;
  region: string;
  description?: string;
  latitude: number;
  longitude: number;
  category: string;
  status: 'ACTIVE' | 'INACTIVE' | 'UNDER_MAINTENANCE';
  createdAtUtc: string;
  attractions: Attraction[];
  advisories: Advisory[];
  guideReports: GuideReport[];
}

export interface Attraction {
  id: string;
  destinationId: string;
  name: string;
  category: string;
  basePrice: number;
  currency: string;
  accessibilityNotes?: string;
  status: 'ACTIVE' | 'CLOSED_TEMPORARILY' | 'INACTIVE';
  openingRules: OpeningRule[];
}

export interface OpeningRule {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  lastEntryTime?: string;
}

export interface Advisory {
  id: string;
  destinationId: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  startsAtUtc: string;
  endsAtUtc?: string;
  status: 'ACTIVE' | 'RESOLVED' | 'EXPIRED';
}

export interface GuideReport {
  id: string;
  destinationId: string;
  guideId: string;
  reportType: 'WEATHER' | 'CROWD' | 'ROAD_BLOCK' | 'CLOSURE' | 'SAFETY';
  message: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  reportedAtUtc: string;
}

export interface DestinationSuitability {
  destinationId: string;
  destinationName: string;
  evaluatedDate: string;
  isSuitable: boolean;
  summary: string;
  passedChecks: string[];
  warnings: string[];
  blockingReasons: string[];
  weather?: {
    condition: string;
    temperatureC: number;
    precipitationProbability: number;
    advisoryNotice: string;
  };
}
