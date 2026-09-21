import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { apiError } from '../../api/client';
import { searchTrips } from './api';
import { emptyTripFilters, tripStatuses } from './types';
import type { TripFilters, TripPage, TripStatus } from './types';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function filtersFromUrl(params: URLSearchParams): TripFilters {
  const status = params.get('status') ?? '';
  return {
    travelerId: params.get('travelerId') ?? '',
    objective: params.get('objective') ?? '',
    status: tripStatuses.includes(status as TripStatus) ? status as TripStatus : '',
    startFrom: params.get('startFrom') ?? '',
    startTo: params.get('startTo') ?? '',
  };
}

export function TripRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const active = filtersFromUrl(searchParams);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const [draft, setDraft] = useState<TripFilters>(active);
  const [validation, setValidation] = useState<string | null>(null);
  const [result, setResult] = useState<TripPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError(null);
    searchTrips(active, page, controller.signal)
      .then((data) => { if (current) setResult(data); })
      .catch((failure) => {
        if (current && failure?.code !== 'ERR_CANCELED') setError(apiError(failure));
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [searchParams, retry]);

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const travelerId = draft.travelerId.trim();
    if (travelerId && !uuidPattern.test(travelerId)) {
      setValidation('Traveler search requires a complete UUID.');
      return;
    }
    if (draft.startFrom && draft.startTo && draft.startFrom > draft.startTo) {
      setValidation('Start date “To” must be on or after “From”.');
      return;
    }
    setValidation(null);
    const next = new URLSearchParams();
    if (travelerId) next.set('travelerId', travelerId);
    if (draft.objective.trim()) next.set('objective', draft.objective.trim());
    if (draft.status) next.set('status', draft.status);
    if (draft.startFrom) next.set('startFrom', draft.startFrom);
    if (draft.startTo) next.set('startTo', draft.startTo);
    setSearchParams(next);
  }

  function changePage(next: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
  }

  return <main className="trips-page">
    <p className="eyebrow">Trip requests</p>
    <h1>Trip Requests</h1>
    <form className="filter-card" onSubmit={apply}>
      <div className="filter-grid">
        <label>Traveler ID
          <input value={draft.travelerId} placeholder="UUID"
            onChange={(event) => setDraft({ ...draft, travelerId: event.target.value })} />
        </label>
        <label>Objective contains
          <input value={draft.objective} placeholder="e.g. wildlife"
            onChange={(event) => setDraft({ ...draft, objective: event.target.value })} />
        </label>
        <label>Status
          <select value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value as TripFilters['status'] })}>
            <option value="">All statuses</option>
            {tripStatuses.map((status) => <option key={status} value={status}>
              {status.replaceAll('_', ' ')}
            </option>)}
          </select>
        </label>
        <label>Start date from
          <input type="date" value={draft.startFrom}
            onChange={(event) => setDraft({ ...draft, startFrom: event.target.value })} />
        </label>
        <label>Start date to
          <input type="date" value={draft.startTo}
            onChange={(event) => setDraft({ ...draft, startTo: event.target.value })} />
        </label>
      </div>
      {validation && <p className="form-error" role="alert">{validation}</p>}
      <div className="filter-actions">
        <button type="submit">Search</button>
        <button type="button" className="secondary" onClick={() => {
          setDraft(emptyTripFilters);
          setValidation(null);
          setSearchParams(new URLSearchParams());
        }}>Clear</button>
      </div>
    </form>

    {(active.objective || active.startFrom || active.startTo) &&
      <p className="filter-note">Objective and date filters run across all matching API pages.</p>}
    {loading ? <p className="state" role="status">Loading trip requests…</p> :
      error ? <section className="empty-state" role="alert">
        <h2>Could not load trip requests</h2><p>{error}</p>
        <button type="button" onClick={() => setRetry((count) => count + 1)}>Retry</button>
      </section> : !result || result.items.length === 0 ?
        <section className="empty-state">
          <h2>No trip requests found</h2>
          <p>Try changing the search or filters.</p>
        </section> : <>
          <p>{result.totalCount} matching trip request{result.totalCount === 1 ? '' : 's'}</p>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Objective</th><th>Traveler</th><th>Dates</th><th>Status</th><th>Budget</th></tr></thead>
              <tbody>{result.items.map((trip) => <tr key={trip.id}>
                <td><Link to={`/staff/trips/${trip.id}`}>{trip.objective}</Link></td>
                <td className="mono">{trip.travelerId}</td>
                <td>{trip.startDate} – {trip.endDate}</td>
                <td><span className="status-pill">{trip.status.replaceAll('_', ' ')}</span></td>
                <td>{trip.currency} {trip.budget.toLocaleString()}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="pagination">
            <button type="button" className="secondary" disabled={page <= 1}
              onClick={() => changePage(page - 1)}>Previous</button>
            <span>Page {page} of {Math.max(1, Math.ceil(result.totalCount / result.pageSize))}</span>
            <button type="button" className="secondary"
              disabled={page * result.pageSize >= result.totalCount}
              onClick={() => changePage(page + 1)}>Next</button>
          </div>
        </>}
  </main>;
}
