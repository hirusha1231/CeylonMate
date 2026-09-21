export const tripStatuses = [
  'DRAFT', 'SUBMITTED', 'PLANNING', 'PROPOSED', 'PENDING_APPROVAL',
  'APPROVED', 'REVISION_REQUIRED', 'BOOKED', 'CANCELLED', 'FAILED',
] as const;

export type TripStatus = (typeof tripStatuses)[number];

export interface WorkflowSummary {
  id: string;
  status: string;
}

export interface TripRequest {
  id: string;
  travelerId: string;
  travelerProfileId: string;
  objective: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  partySize: number;
  startingLatitude: number | null;
  startingLongitude: number | null;
  accessibilityNeeds: string | null;
  status: TripStatus;
  createdAtUtc: string;
  updatedAtUtc: string;
  workflowExecution?: WorkflowSummary | null;
}

export interface TripPage {
  items: TripRequest[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface TripFilters {
  travelerId: string;
  objective: string;
  status: TripStatus | '';
  startFrom: string;
  startTo: string;
}

export const emptyTripFilters: TripFilters = {
  travelerId: '', objective: '', status: '', startFrom: '', startTo: '',
};
