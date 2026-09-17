import { api } from '../../api/client';
import type { TripFilters, TripPage, TripRequest } from './types';

const pageSize = 20;
const allPageSize = 100;

export async function getTrip(id: string, signal?: AbortSignal): Promise<TripRequest> {
  const response = await api.get<TripRequest>(`/api/trips/${encodeURIComponent(id)}`, { signal });
  return response.data;
}

export async function searchTrips(filters: TripFilters, page: number,
  signal?: AbortSignal): Promise<TripPage> {
  const serverParams = {
    ...(filters.travelerId ? { travelerId: filters.travelerId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  };
  const needsClientFilter = Boolean(filters.objective || filters.startFrom || filters.startTo);

  if (!needsClientFilter) {
    const response = await api.get<TripPage>('/api/trips', {
      params: { ...serverParams, page, pageSize }, signal,
    });
    return response.data;
  }

  // The current API does not accept objective/date filters. Read its complete
  // server-filtered result set before client-side filtering and pagination.
  const rows: TripRequest[] = [];
  let currentPage = 1;
  let totalCount = 0;
  do {
    const response = await api.get<TripPage>('/api/trips', {
      params: { ...serverParams, page: currentPage, pageSize: allPageSize }, signal,
    });
    rows.push(...response.data.items);
    totalCount = response.data.totalCount;
    if (response.data.items.length === 0) break;
    currentPage += 1;
  } while (rows.length < totalCount);

  const objective = filters.objective.toLocaleLowerCase();
  const filtered = rows.filter((trip) =>
    (!objective || trip.objective.toLocaleLowerCase().includes(objective)) &&
    (!filters.startFrom || trip.startDate >= filters.startFrom) &&
    (!filters.startTo || trip.startDate <= filters.startTo));

  return {
    items: filtered.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    totalCount: filtered.length,
  };
}
