// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { TripRequestsPage } from './TripRequestsPage';
import { searchTrips } from './api';

vi.mock('./api', () => ({ searchTrips: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test('renders a successful API result', async () => {
  vi.mocked(searchTrips).mockResolvedValue({
    items: [{
      id: '11111111-1111-1111-1111-111111111111',
      travelerId: '22222222-2222-2222-2222-222222222222',
      travelerProfileId: '33333333-3333-3333-3333-333333333333',
      objective: 'Wildlife journey', startDate: '2026-12-01', endDate: '2026-12-05',
      budget: 50000, currency: 'LKR', partySize: 2,
      startingLatitude: null, startingLongitude: null, accessibilityNeeds: null,
      status: 'SUBMITTED', createdAtUtc: '2026-09-16T10:00:00Z',
      updatedAtUtc: '2026-09-16T10:00:00Z',
    }], page: 1, pageSize: 20, totalCount: 1,
  });
  render(<MemoryRouter><TripRequestsPage /></MemoryRouter>);
  expect((await screen.findByRole('link', { name: 'Wildlife journey' })).getAttribute('href'))
    .toBe('/staff/trips/11111111-1111-1111-1111-111111111111');
  expect(screen.getByRole('cell', { name: 'SUBMITTED' })).toBeTruthy();
});

test('renders API error state and retry', async () => {
  vi.mocked(searchTrips).mockRejectedValue(new Error('offline'));
  render(<MemoryRouter><TripRequestsPage /></MemoryRouter>);
  expect((await screen.findByRole('alert')).textContent).toContain('Could not load trip requests');
  expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
});
