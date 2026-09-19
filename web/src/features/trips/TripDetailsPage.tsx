import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import axios from 'axios';
import { apiError } from '../../api/client';
import { getTrip } from './api';
import type { TripRequest } from './types';

function value(value: string | number | null | undefined) {
  return value === null || value === undefined || value === '' ? 'Not provided' : String(value);
}

export function TripDetailsPage() {
  const { id } = useParams();
  const [trip, setTrip] = useState<TripRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setLoading(true);
    setError(null);
    setTrip(null);
    if (!id) {
      setError('Trip request ID is missing.');
      setLoading(false);
      return;
    }
    getTrip(id, controller.signal)
      .then((data) => { if (current) setTrip(data); })
      .catch((failure) => {
        if (!current || failure?.code === 'ERR_CANCELED') return;
        setError(axios.isAxiosError(failure) && failure.response?.status === 404
          ? 'Trip request not found.' : apiError(failure));
      })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; controller.abort(); };
  }, [id, retry]);

  return <main className="trips-page">
    <Link className="back-link" to="/staff/trips">Back to trip requests</Link>
    <p className="eyebrow">Trip request details</p>
    <h1>Trip Request</h1>
    {loading ? <p className="state" role="status">Loading trip request...</p> :
      error ? <section className="empty-state" role="alert">
        <h2>Could not load trip request</h2><p>{error}</p>
        <button type="button" onClick={() => setRetry((count) => count + 1)}>Retry</button>
      </section> : trip && <>
        <div className="detail-card">
          <div className="detail-heading"><h2>{trip.objective}</h2>
            <span className="status-pill">{trip.status.replaceAll('_', ' ')}</span></div>
          <dl className="detail-grid">
            <div><dt>Trip ID</dt><dd className="mono">{trip.id}</dd></div>
            <div><dt>Traveler ID</dt><dd className="mono">{trip.travelerId}</dd></div>
            <div><dt>Start date</dt><dd>{trip.startDate}</dd></div>
            <div><dt>End date</dt><dd>{trip.endDate}</dd></div>
            <div><dt>Budget</dt><dd>{trip.currency} {trip.budget.toLocaleString()}</dd></div>
            <div><dt>Party size</dt><dd>{trip.partySize}</dd></div>
            <div><dt>Starting latitude</dt><dd>{value(trip.startingLatitude)}</dd></div>
            <div><dt>Starting longitude</dt><dd>{value(trip.startingLongitude)}</dd></div>
            <div className="detail-wide"><dt>Accessibility needs</dt><dd>{value(trip.accessibilityNeeds)}</dd></div>
            <div><dt>Created</dt><dd>{new Date(trip.createdAtUtc).toLocaleString()}</dd></div>
            <div><dt>Updated</dt><dd>{new Date(trip.updatedAtUtc).toLocaleString()}</dd></div>
          </dl>
        </div>
        <section className="detail-card" aria-label="Workflow execution">
          <h2>Workflow</h2>
          {trip.workflowExecution ? <dl className="detail-grid">
            <div><dt>Execution ID</dt><dd className="mono">{trip.workflowExecution.id}</dd></div>
            <div><dt>Status</dt><dd>{trip.workflowExecution.status}</dd></div>
          </dl> : <p>Workflow execution ID and status are not included in the current trip API response.</p>}
        </section>
      </>}
  </main>;
}
