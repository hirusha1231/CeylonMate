import { useEffect, useState } from 'react';
import { fetchDestinations, fetchDestinationSuitability } from './api';
import { Destination, DestinationSuitability } from './types';

export function DestinationsManagementPage() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [suitability, setSuitability] = useState<DestinationSuitability | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    loadDestinations();
  }, [categoryFilter]);

  async function loadDestinations() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDestinations({
        category: categoryFilter || undefined,
        search: search || undefined
      });
      setDestinations(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to load destinations.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectDestination(dest: Destination) {
    setSelectedDest(dest);
    try {
      const suit = await fetchDestinationSuitability(dest.id);
      setSuitability(suit);
    } catch {
      setSuitability(null);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0 }}>📍 Destinations & Attractions Management</h2>
          <p style={{ color: '#666', margin: '4px 0 0 0' }}>Manage travel spots, opening rules, active advisories, and local guide condition reports.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadDestinations()}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #ccc', borderRadius: '4px' }}
        >
          <option value="">All Categories</option>
          <option value="NATURE">Nature</option>
          <option value="WILDLIFE">Wildlife</option>
          <option value="HERITAGE">Heritage</option>
          <option value="CULTURE">Culture</option>
        </select>
        <button onClick={loadDestinations} style={{ padding: '8px 16px', background: '#008080', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          Search
        </button>
      </div>

      {error && <div style={{ padding: '12px', background: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '16px' }}>{error}</div>}

      {loading ? (
        <p>Loading destinations...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h3>All Registered Destinations ({destinations.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {destinations.map((d) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDestination(d)}
                  style={{
                    padding: '16px',
                    border: selectedDest?.id === d.id ? '2px solid #008080' : '1px solid #e0e0e0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: '#fff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h4 style={{ margin: 0 }}>{d.name}</h4>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '12px', background: d.status === 'ACTIVE' ? '#e6f4ea' : '#fce8e6', color: d.status === 'ACTIVE' ? '#137333' : '#c5221f' }}>
                      {d.status}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#666', margin: '6px 0' }}>Region: <strong>{d.region}</strong> | Category: <strong>{d.category}</strong></p>
                  <p style={{ fontSize: '13px', margin: 0 }}>{d.description}</p>
                  {d.attractions?.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#333' }}>
                      🎟️ {d.attractions.length} attraction(s) listed
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3>Destination Details & Suitability Live Check</h3>
            {selectedDest ? (
              <div style={{ padding: '20px', background: '#f9f9f9', borderRadius: '8px', border: '1px solid #e0e0e0' }}>
                <h4>{selectedDest.name}</h4>
                <p><strong>Region:</strong> {selectedDest.region} ({selectedDest.latitude}, {selectedDest.longitude})</p>
                <p>{selectedDest.description}</p>

                {suitability && (
                  <div style={{ marginTop: '16px', padding: '12px', background: suitability.isSuitable ? '#e6f4ea' : '#fce8e6', borderRadius: '6px' }}>
                    <h5 style={{ margin: '0 0 6px 0', color: suitability.isSuitable ? '#137333' : '#c5221f' }}>
                      {suitability.isSuitable ? '✅ Suitable for Travel' : '⛔ Not Suitable (Blocked)'}
                    </h5>
                    <p style={{ margin: '0 0 8px 0', fontSize: '13px' }}>{suitability.summary}</p>
                    {suitability.blockingReasons?.length > 0 && (
                      <ul style={{ margin: 0, paddingLeft: '20px', color: '#c5221f', fontSize: '12px' }}>
                        {suitability.blockingReasons.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    )}
                  </div>
                )}

                <h5 style={{ marginTop: '20px' }}>Attractions</h5>
                {selectedDest.attractions?.map((a) => (
                  <div key={a.id} style={{ padding: '10px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '8px' }}>
                    <strong>{a.name}</strong> (${a.basePrice} {a.currency}) - Status: {a.status}
                    {a.accessibilityNotes && <div style={{ fontSize: '12px', color: '#555' }}>♿ {a.accessibilityNotes}</div>}
                  </div>
                ))}

                <h5 style={{ marginTop: '20px' }}>Local Guide Reports ({selectedDest.guideReports?.length || 0})</h5>
                {selectedDest.guideReports?.length === 0 && <p style={{ fontSize: '13px', color: '#777' }}>No condition reports submitted yet.</p>}
                {selectedDest.guideReports?.map((r) => (
                  <div key={r.id} style={{ padding: '8px', background: '#fff', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '6px', fontSize: '13px' }}>
                    <strong>[{r.reportType}]</strong> {r.message} <span style={{ color: '#888', fontSize: '11px' }}>({new Date(r.reportedAtUtc).toLocaleDateString()})</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#777' }}>Select a destination on the left to view details, active advisories, guide reports, and suitability status.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
