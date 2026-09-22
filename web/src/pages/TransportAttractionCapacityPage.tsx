import React, { useState, useEffect } from 'react';

export interface TransportSlot {
  id: string;
  transportOptionId: string;
  optionTitle?: string;
  vehicleType: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string;
  totalSeats: number;
  availableSeats: number;
  pricePerSeat: number;
  currency: string;
  rowVersion?: string;
}

export interface AttractionSlot {
  id: string;
  attractionId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  status: string;
  maxCapacity: number;
  bookedCapacity: number;
  priceAmount: number;
  currency: string;
  notes?: string;
  rowVersion?: string;
}

export const TransportAttractionCapacityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transport' | 'attractions'>('transport');

  const [transportSlots, setTransportSlots] = useState<TransportSlot[]>([]);
  const [attractionSlots, setAttractionSlots] = useState<AttractionSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals for Transport Create/Edit/Delete
  const [isCreatingTransport, setIsCreatingTransport] = useState(false);
  const [editingTransport, setEditingTransport] = useState<TransportSlot | null>(null);
  const [deletingTransport, setDeletingTransport] = useState<TransportSlot | null>(null);

  // Modals for Attraction Create/Edit/Delete
  const [isCreatingAttraction, setIsCreatingAttraction] = useState(false);
  const [editingAttraction, setEditingAttraction] = useState<AttractionSlot | null>(null);
  const [deletingAttraction, setDeletingAttraction] = useState<AttractionSlot | null>(null);

  // Form inputs state - Transport
  const [tStartTime, setTStartTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [tEndTime, setTEndTime] = useState<string>(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [tVehicleType, setTVehicleType] = useState<string>('VAN');
  const [tTotalSeats, setTTotalSeats] = useState<number>(12);
  const [tAvailableSeats, setTAvailableSeats] = useState<number>(12);
  const [tPricePerSeat, setTPricePerSeat] = useState<number>(3500);
  const [tCurrency, setTCurrency] = useState<string>('LKR');
  const [tStatus, setTStatus] = useState<string>('AVAILABLE');

  // Form inputs state - Attraction
  const [aStartTime, setAStartTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [aEndTime, setAEndTime] = useState<string>(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
  const [aMaxCapacity, setAMaxCapacity] = useState<number>(100);
  const [aBookedCapacity, setABookedCapacity] = useState<number>(0);
  const [aPriceAmount, setAPriceAmount] = useState<number>(2000);
  const [aCurrency, setACurrency] = useState<string>('LKR');
  const [aStatus, setAStatus] = useState<string>('AVAILABLE');
  const [aNotes, setANotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);

  const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:5084';
  const defaultOptionId = '00000000-0000-0000-0000-000000000001';

  // Helper to extract detailed error messages from responses
  const parseErrorMessage = async (res: Response, fallback: string) => {
    try {
      const text = await res.text();
      if (text) {
        const json = JSON.parse(text);
        if (json.errors && typeof json.errors === 'object') {
          const messages = Object.values(json.errors).flat();
          if (messages.length > 0) return messages.join(' ');
        }
        return json.detail || json.message || json.title || text;
      }
    } catch {
      // ignore JSON parse failure
    }
    return fallback;
  };

  // Read (GET)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'transport') {
        const res = await fetch(`${API_BASE}/api/transport/${defaultOptionId}/availability`);
        if (res.ok) {
          const data = await res.json();
          setTransportSlots(data);
        } else {
          const errDetail = await parseErrorMessage(res, `(${res.status} ${res.statusText})`);
          setError(`Failed to fetch transport slots: ${errDetail}`);
        }
      } else {
        const res = await fetch(`${API_BASE}/api/attractions/${defaultOptionId}/availability`);
        if (res.ok) {
          const data = await res.json();
          setAttractionSlots(data);
        } else {
          const errDetail = await parseErrorMessage(res, `(${res.status} ${res.statusText})`);
          setError(`Failed to fetch attraction slots: ${errDetail}`);
        }
      }
    } catch (e: any) {
      console.error('Error fetching capacity data:', e);
      setError(e?.message ? `API Error: ${e.message}` : 'Error connecting to API server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  // Handle Create Transport (POST)
  const openCreateTransport = () => {
    setTStartTime(new Date().toISOString().slice(0, 16));
    setTEndTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setTVehicleType('VAN');
    setTTotalSeats(12);
    setTPricePerSeat(3500);
    setTCurrency('LKR');
    setIsCreatingTransport(true);
  };

  const handleCreateTransport = async () => {
    setSubmitting(true);
    try {
      const startTimeIso = new Date(tStartTime).toISOString();
      const endTimeIso = new Date(tEndTime).toISOString();

      const payload = {
        startTimeUtc: startTimeIso,
        endTimeUtc: endTimeIso,
        departureTimeUtc: startTimeIso,
        arrivalTimeUtc: endTimeIso,
        vehicleType: tVehicleType,
        totalSeats: tTotalSeats,
        availableSeats: tTotalSeats,
        pricePerSeat: tPricePerSeat,
        priceLkr: tPricePerSeat,
        currency: tCurrency,
        status: 'AVAILABLE',
      };

      const res = await fetch(`${API_BASE}/api/transport/${defaultOptionId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 201) {
        setIsCreatingTransport(false);
        fetchData();
      } else {
        const errDetail = await parseErrorMessage(res, 'Failed to create transport slot.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error creating transport slot: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Transport (PUT)
  const openEditTransport = (slot: TransportSlot) => {
    setEditingTransport(slot);
    setTStartTime(new Date(slot.startTimeUtc).toISOString().slice(0, 16));
    setTEndTime(new Date(slot.endTimeUtc).toISOString().slice(0, 16));
    setTVehicleType(slot.vehicleType || 'VAN');
    setTTotalSeats(slot.totalSeats);
    setTAvailableSeats(slot.availableSeats);
    setTPricePerSeat(slot.pricePerSeat);
    setTCurrency(slot.currency || 'LKR');
    setTStatus(slot.status);
  };

  const handleUpdateTransport = async () => {
    if (!editingTransport) return;
    setSubmitting(true);
    try {
      const startTimeIso = new Date(tStartTime).toISOString();
      const endTimeIso = new Date(tEndTime).toISOString();

      const payload = {
        startTimeUtc: startTimeIso,
        endTimeUtc: endTimeIso,
        departureTimeUtc: startTimeIso,
        arrivalTimeUtc: endTimeIso,
        vehicleType: tVehicleType,
        status: tStatus,
        totalSeats: tTotalSeats,
        availableSeats: tAvailableSeats,
        pricePerSeat: tPricePerSeat,
        priceLkr: tPricePerSeat,
        currency: tCurrency,
        rowVersion: editingTransport.rowVersion,
      };

      const res = await fetch(`${API_BASE}/api/transport/slots/${editingTransport.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingTransport(null);
        fetchData();
      } else if (res.status === 409) {
        alert('Concurrency conflict detected! Slot was modified by another user.');
      } else {
        const errDetail = await parseErrorMessage(res, 'Failed to update transport slot.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error updating transport slot: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Transport Block/Unblock Status (PUT)
  const toggleTransportStatus = async (slot: TransportSlot) => {
    const newStatus = slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    try {
      const payload = {
        startTimeUtc: slot.startTimeUtc,
        endTimeUtc: slot.endTimeUtc,
        vehicleType: slot.vehicleType,
        status: newStatus,
        totalSeats: slot.totalSeats,
        availableSeats: slot.availableSeats,
        pricePerSeat: slot.pricePerSeat,
        currency: slot.currency || 'LKR',
        rowVersion: slot.rowVersion,
      };

      const res = await fetch(`${API_BASE}/api/transport/slots/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchData();
      } else {
        const errDetail = await parseErrorMessage(res, 'Failed to update slot status.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error toggling status: ${e.message}`);
    }
  };

  // Handle Delete Transport (DELETE)
  const handleDeleteTransport = async () => {
    if (!deletingTransport) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/transport/slots/${deletingTransport.id}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        setDeletingTransport(null);
        fetchData();
      } else {
        const errDetail = await parseErrorMessage(res, 'Cannot delete slot with active reservations.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error deleting transport slot: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Create Attraction (POST)
  const openCreateAttraction = () => {
    setAStartTime(new Date().toISOString().slice(0, 16));
    setAEndTime(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setAMaxCapacity(100);
    setAPriceAmount(2000);
    setACurrency('LKR');
    setANotes('');
    setIsCreatingAttraction(true);
  };

  const handleCreateAttraction = async () => {
    setSubmitting(true);
    try {
      const payload = {
        startTimeUtc: new Date(aStartTime).toISOString(),
        endTimeUtc: new Date(aEndTime).toISOString(),
        maxCapacity: aMaxCapacity,
        priceAmount: aPriceAmount,
        currency: aCurrency,
        notes: aNotes,
      };

      const res = await fetch(`${API_BASE}/api/attractions/${defaultOptionId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok || res.status === 201) {
        setIsCreatingAttraction(false);
        fetchData();
      } else {
        const errDetail = await parseErrorMessage(res, 'Failed to create attraction slot.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error creating attraction slot: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Edit Attraction (PUT)
  const openEditAttraction = (slot: AttractionSlot) => {
    setEditingAttraction(slot);
    setAStartTime(new Date(slot.startTimeUtc).toISOString().slice(0, 16));
    setAEndTime(new Date(slot.endTimeUtc).toISOString().slice(0, 16));
    setAMaxCapacity(slot.maxCapacity);
    setABookedCapacity(slot.bookedCapacity);
    setAPriceAmount(slot.priceAmount);
    setACurrency(slot.currency || 'LKR');
    setAStatus(slot.status);
    setANotes(slot.notes || '');
  };

  const handleUpdateAttraction = async () => {
    if (!editingAttraction) return;
    setSubmitting(true);
    try {
      const payload = {
        startTimeUtc: new Date(aStartTime).toISOString(),
        endTimeUtc: new Date(aEndTime).toISOString(),
        status: aStatus,
        maxCapacity: aMaxCapacity,
        bookedCapacity: aBookedCapacity,
        priceAmount: aPriceAmount,
        currency: aCurrency,
        notes: aNotes,
        rowVersion: editingAttraction.rowVersion,
      };

      const res = await fetch(`${API_BASE}/api/attractions/slots/${editingAttraction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingAttraction(null);
        fetchData();
      } else if (res.status === 409) {
        alert('Concurrency conflict detected! Slot was modified by another user.');
      } else {
        const errDetail = await parseErrorMessage(res, 'Failed to update attraction slot.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error updating attraction slot: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Attraction Status (PUT)
  const toggleAttractionStatus = async (slot: AttractionSlot) => {
    const newStatus = slot.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE';
    try {
      const payload = {
        startTimeUtc: slot.startTimeUtc,
        endTimeUtc: slot.endTimeUtc,
        status: newStatus,
        maxCapacity: slot.maxCapacity,
        bookedCapacity: slot.bookedCapacity,
        priceAmount: slot.priceAmount,
        currency: slot.currency || 'LKR',
        notes: slot.notes,
        rowVersion: slot.rowVersion,
      };

      const res = await fetch(`${API_BASE}/api/attractions/slots/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        fetchData();
      } else {
        const errDetail = await parseErrorMessage(res, 'Failed to update slot status.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error toggling status: ${e.message}`);
    }
  };

  // Handle Delete Attraction (DELETE)
  const handleDeleteAttraction = async () => {
    if (!deletingAttraction) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/attractions/slots/${deletingAttraction.id}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        setDeletingAttraction(null);
        fetchData();
      } else {
        const errDetail = await parseErrorMessage(res, 'Cannot delete attraction slot with active bookings.');
        alert(`Error (${res.status}): ${errDetail}`);
      }
    } catch (e: any) {
      alert(`Error deleting attraction slot: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      <div className="header-bar">
        <div>
          <h2>Transport & Attraction Capacity Engine</h2>
          <p className="subtitle">Manage vehicle seat inventories and attraction entrance quotas</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={fetchData}>
            🔄 Refresh
          </button>
          {activeTab === 'transport' ? (
            <button className="btn-primary" onClick={openCreateTransport}>
              ➕ Add Transport Slot
            </button>
          ) : (
            <button className="btn-primary" onClick={openCreateAttraction}>
              ➕ Add Attraction Quota
            </button>
          )}
        </div>
      </div>

      <div className="tab-switcher">
        <button
          className={`tab-btn ${activeTab === 'transport' ? 'active' : ''}`}
          onClick={() => setActiveTab('transport')}
        >
          🚌 Transport Slots ({transportSlots.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'attractions' ? 'active' : ''}`}
          onClick={() => setActiveTab('attractions')}
        >
          🏛️ Attraction Slots ({attractionSlots.length})
        </button>
      </div>

      {loading && <div className="spinner">Loading capacity slots...</div>}
      {error && <div className="error-card">{error}</div>}

      {!loading && !error && activeTab === 'transport' && (
        <div className="table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Vehicle & Route</th>
                <th>Type</th>
                <th>Status</th>
                <th>Seats Available</th>
                <th>Price / Seat</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transportSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No transport capacity slots found. Click "+ Add Transport Slot" to create one.
                  </td>
                </tr>
              ) : (
                transportSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <strong>{slot.optionTitle || 'Transport Option'}</strong>
                      <div>
                        <small style={{ opacity: 0.7 }}>
                          {new Date(slot.startTimeUtc).toLocaleDateString()} ({new Date(slot.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </small>
                      </div>
                    </td>
                    <td><span className="badge-outline">{slot.vehicleType}</span></td>
                    <td>
                      <span className={`status-badge status-${slot.status.toLowerCase()}`}>
                        {slot.status}
                      </span>
                    </td>
                    <td>{slot.availableSeats} / {slot.totalSeats} seats</td>
                    <td>{slot.currency || 'LKR'} {slot.pricePerSeat.toLocaleString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn-action ${slot.status === 'AVAILABLE' ? 'btn-block' : 'btn-unblock'}`}
                          onClick={() => toggleTransportStatus(slot)}
                          title="Toggle Status"
                        >
                          {slot.status === 'AVAILABLE' ? '⛔ Block' : '✅ Unblock'}
                        </button>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => openEditTransport(slot)}
                          title="Edit Transport Slot"
                        >
                          Edit ✏️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => setDeletingTransport(slot)}
                          title="Delete Transport Slot"
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && activeTab === 'attractions' && (
        <div className="table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Attraction Name & Notes</th>
                <th>Time Window</th>
                <th>Status</th>
                <th>Quota Booked</th>
                <th>Ticket Price</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attractionSlots.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                    No attraction entrance slots found. Click "+ Add Attraction Quota" to create one.
                  </td>
                </tr>
              ) : (
                attractionSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <strong>{slot.notes || 'Attraction Entry Slot'}</strong>
                    </td>
                    <td>
                      {new Date(slot.startTimeUtc).toLocaleDateString()}
                      <div>
                        <small style={{ opacity: 0.7 }}>
                          {new Date(slot.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(slot.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge status-${slot.status.toLowerCase()}`}>
                        {slot.status}
                      </span>
                    </td>
                    <td>{slot.bookedCapacity} / {slot.maxCapacity} visitor tickets</td>
                    <td>{slot.currency || 'LKR'} {slot.priceAmount.toLocaleString()}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className={`btn-action ${slot.status === 'AVAILABLE' ? 'btn-block' : 'btn-unblock'}`}
                          onClick={() => toggleAttractionStatus(slot)}
                          title="Toggle Status"
                        >
                          {slot.status === 'AVAILABLE' ? '⛔ Block' : '✅ Unblock'}
                        </button>
                        <button
                          className="btn-icon btn-edit"
                          onClick={() => openEditAttraction(slot)}
                          title="Edit Attraction Slot"
                        >
                          Edit ✏️
                        </button>
                        <button
                          className="btn-icon btn-delete"
                          onClick={() => setDeletingAttraction(slot)}
                          title="Delete Attraction Slot"
                        >
                          Delete 🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Create Transport Slot */}
      {isCreatingTransport && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>➕ Add Transport Capacity Slot</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time (UTC)</label>
                <input type="datetime-local" value={tStartTime} onChange={(e) => setTStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End Time (UTC)</label>
                <input type="datetime-local" value={tEndTime} onChange={(e) => setTEndTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={tVehicleType} onChange={(e) => setTVehicleType(e.target.value)}>
                  <option value="SEDAN">SEDAN</option>
                  <option value="SUV">SUV</option>
                  <option value="VAN">VAN</option>
                  <option value="MINI_BUS">MINI_BUS</option>
                  <option value="BUS">BUS</option>
                </select>
              </div>
              <div className="form-group">
                <label>Total Seats</label>
                <input type="number" value={tTotalSeats} onChange={(e) => setTTotalSeats(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price Per Seat</label>
                <input type="number" value={tPricePerSeat} onChange={(e) => setTPricePerSeat(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input type="text" value={tCurrency} onChange={(e) => setTCurrency(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsCreatingTransport(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateTransport} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Transport Slot */}
      {editingTransport && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Transport Capacity Slot</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time (UTC)</label>
                <input type="datetime-local" value={tStartTime} onChange={(e) => setTStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End Time (UTC)</label>
                <input type="datetime-local" value={tEndTime} onChange={(e) => setTEndTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Vehicle Type</label>
                <select value={tVehicleType} onChange={(e) => setTVehicleType(e.target.value)}>
                  <option value="SEDAN">SEDAN</option>
                  <option value="SUV">SUV</option>
                  <option value="VAN">VAN</option>
                  <option value="MINI_BUS">MINI_BUS</option>
                  <option value="BUS">BUS</option>
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={tStatus} onChange={(e) => setTStatus(e.target.value)}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="BOOKED">BOOKED</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Total Seats</label>
                <input type="number" value={tTotalSeats} onChange={(e) => setTTotalSeats(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Available Seats</label>
                <input type="number" value={tAvailableSeats} onChange={(e) => setTAvailableSeats(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price Per Seat</label>
                <input type="number" value={tPricePerSeat} onChange={(e) => setTPricePerSeat(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Currency</label>
                <input type="text" value={tCurrency} onChange={(e) => setTCurrency(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingTransport(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateTransport} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Transport Slot */}
      {deletingTransport && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ color: '#ff4d4f' }}>Confirm Delete Transport Slot</h3>
            <p>Are you sure you want to delete this transport slot?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeletingTransport(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteTransport} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Attraction Slot */}
      {isCreatingAttraction && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>➕ Add Attraction Quota Slot</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time (UTC)</label>
                <input type="datetime-local" value={aStartTime} onChange={(e) => setAStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End Time (UTC)</label>
                <input type="datetime-local" value={aEndTime} onChange={(e) => setAEndTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Max Visitor Capacity</label>
                <input type="number" value={aMaxCapacity} onChange={(e) => setAMaxCapacity(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Ticket Price</label>
                <input type="number" value={aPriceAmount} onChange={(e) => setAPriceAmount(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Currency</label>
                <input type="text" value={aCurrency} onChange={(e) => setACurrency(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notes / Inclusions</label>
                <input type="text" value={aNotes} onChange={(e) => setANotes(e.target.value)} placeholder="e.g. Foreign Entry Ticket + Tour Guide" />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setIsCreatingAttraction(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreateAttraction} disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Quota'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Attraction Slot */}
      {editingAttraction && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Attraction Entrance Slot</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Start Time (UTC)</label>
                <input type="datetime-local" value={aStartTime} onChange={(e) => setAStartTime(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End Time (UTC)</label>
                <input type="datetime-local" value={aEndTime} onChange={(e) => setAEndTime(e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select value={aStatus} onChange={(e) => setAStatus(e.target.value)}>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="BOOKED">BOOKED</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>
              <div className="form-group">
                <label>Max Visitor Capacity</label>
                <input type="number" value={aMaxCapacity} onChange={(e) => setAMaxCapacity(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Booked Capacity</label>
                <input type="number" value={aBookedCapacity} onChange={(e) => setABookedCapacity(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Ticket Price</label>
                <input type="number" value={aPriceAmount} onChange={(e) => setAPriceAmount(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Currency</label>
                <input type="text" value={aCurrency} onChange={(e) => setACurrency(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Notes / Inclusions</label>
                <input type="text" value={aNotes} onChange={(e) => setANotes(e.target.value)} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingAttraction(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdateAttraction} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Attraction Slot */}
      {deletingAttraction && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ color: '#ff4d4f' }}>Confirm Delete Attraction Slot</h3>
            <p>Are you sure you want to delete this attraction slot?</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeletingAttraction(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteAttraction} disabled={submitting}>
                {submitting ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
