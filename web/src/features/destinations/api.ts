import { api } from '../../api/client';
import { Destination, DestinationSuitability, GuideReport } from './types';

export async function fetchDestinations(params?: { category?: string; region?: string; search?: string }): Promise<Destination[]> {
  const res = await api.get<Destination[]>('/api/destinations', { params });
  return res.data;
}

export async function fetchDestinationById(id: string): Promise<Destination> {
  const res = await api.get<Destination>(`/api/destinations/${id}`);
  return res.data;
}

export async function fetchDestinationSuitability(id: string, date?: string): Promise<DestinationSuitability> {
  const res = await api.get<DestinationSuitability>(`/api/destinations/${id}/suitability`, {
    params: { date }
  });
  return res.data;
}

export async function fetchGuideReports(destinationId: string): Promise<GuideReport[]> {
  const res = await api.get<GuideReport[]>(`/api/destinations/${destinationId}/reports`);
  return res.data;
}

export async function createDestination(data: Partial<Destination>): Promise<Destination> {
  const res = await api.post<Destination>('/api/destinations', data);
  return res.data;
}
