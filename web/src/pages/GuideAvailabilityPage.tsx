import React, { useState, useEffect } from 'react';

export interface GuideSlot {
  id: string;
  localGuideUserId: string;
  startTimeUtc: string;
  endTimeUtc: string;
  slotType: string;
  status: string;
  maxCapacity: number;
  bookedCapacity: number;
  priceAmount: number;
  currency: string;
  notes?: string;
  rowVersion?: string;
}

export const GuideAvailabilityPage: React.FC = () => {
  const [slots, setSlots] = useState<GuideSlot[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Edit Modal State
  const [editingSlot, setEditingSlot] = useState<GuideSlot | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editCapacity, setEditCapacity] = useState<number>(1);
  const [editSlotType, setEditSlotType] = useState<string>('FULL_DAY');
  const [editStatus, setEditStatus] = useState<string>('AVAILABLE');
  const [editNotes, setEditNotes] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Delete Modal State
  const [deletingSlot, setDeletingSlot] = useState<GuideSlot | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '') || 'http://localhost:5084';
  const guideId = '00000000-0000-0000-0000-000000000000';

  const fetchSlots = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/guides/${guideId}/availability`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      } else {
        setError(`Failed to fetch availability (${res.status} ${res.statusText})`);
      }
    } catch (e: any) {
      console.error('Error fetching guide availability:', e);
      setError(
        e?.message
          ? `Failed to connect to API (${e.message}). Ensure backend API is running at ${API_BASE}.`
          : `Error connecting to API server at ${API_BASE}`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const openEditModal = (slot: GuideSlot) => {
    setEditingSlot(slot);
    setEditPrice(slot.priceAmount);
    setEditCapacity(slot.maxCapacity);
    setEditSlotType(slot.slotType);
    setEditStatus(slot.status);
    setEditNotes(slot.notes || '');
  };

  const handleUpdate = async () => {
    if (!editingSlot) return;
    setIsUpdating(true);
    try {
      const payload = {
        startTimeUtc: editingSlot.startTimeUtc,
        endTimeUtc: editingSlot.endTimeUtc,
        slotType: editSlotType,
        status: editStatus,
        maxCapacity: editCapacity,
        priceAmount: editPrice,
        currency: editingSlot.currency || 'LKR',
        notes: editNotes,
        rowVersion: editingSlot.rowVersion,
      };

      const res = await fetch(`${API_BASE}/api/guides/availability/${editingSlot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingSlot(null);
        fetchSlots();
      } else if (res.status === 409) {
        alert('Concurrency conflict detected! Slot was modified by another user.');
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Failed to update slot.');
      }
    } catch (e: any) {
      alert(`Error updating slot: ${e.message}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSlot) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/guides/availability/${deletingSlot.id}`, {
        method: 'DELETE',
      });

      if (res.ok || res.status === 204) {
        setDeletingSlot(null);
        fetchSlots();
      } else if (res.status === 409) {
        const errData = await res.json().catch(() => ({}));
        alert(errData.message || 'Cannot delete slot with active reservations or holds.');
      } else {
        alert('Failed to delete slot.');
      }
    } catch (e: any) {
      alert(`Error deleting slot: ${e.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredSlots = slots.filter((s) => {
    if (statusFilter === 'ALL') return true;
    return s.status.toUpperCase() === statusFilter.toUpperCase();
  });

  return (
    <div className="page-container">
      <div className="header-bar">
        <div>
          <h2>Guide Availability Management</h2>
          <p className="subtitle">Publish, update, and manage local guide daily schedules</p>
        </div>
        <button className="btn-primary" onClick={fetchSlots}>
          🔄 Refresh
        </button>
      </div>

      <div className="filter-bar">
        <label>Status Filter:</label>
        {['ALL', 'AVAILABLE', 'RESERVED', 'BOOKED', 'BLOCKED'].map((st) => (
          <button
            key={st}
            className={`chip ${statusFilter === st ? 'active' : ''}`}
            onClick={() => setStatusFilter(st)}
          >
            {st}
          </button>
        ))}
      </div>

      {loading && <div className="spinner">Loading availability slots...</div>}
      {error && <div className="error-card">{error}</div>}

      {!loading && !error && (
        <div className="table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Date & Time Window</th>
                <th>Slot Type</th>
                <th>Status</th>
                <th>Capacity</th>
                <th>Price (LKR)</th>
                <th>Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlots.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2rem' }}>
                    No guide availability slots found.
                  </td>
                </tr>
              ) : (
                filteredSlots.map((slot) => (
                  <tr key={slot.id}>
                    <td>
                      <div>
                        {new Date(slot.startTimeUtc).toLocaleDateString()}
                      </div>
                      <small style={{ opacity: 0.7 }}>
                        {new Date(slot.startTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {' '}
                        {new Date(slot.endTimeUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </td>
                    <td><span className="badge-outline">{slot.slotType}</span></td>
                    <td>
                      <span className={`status-badge status-${slot.status.toLowerCase()}`}>
                        {slot.status}
                      </span>
                    </td>
                    <td>{slot.bookedCapacity} / {slot.maxCapacity}</td>
                    <td>LKR {slot.priceAmount.toLocaleString()}</td>
                    <td>{slot.notes || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" onClick={() => openEditModal(slot)} title="Edit Slot">
                          ✏️ Edit
                        </button>
                        <button className="btn-icon btn-delete" onClick={() => setDeletingSlot(slot)} title="Delete Slot">
                          🗑️ Delete
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

      {/* Edit Modal */}
      {editingSlot && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3>Edit Guide Availability Slot</h3>
            <div className="form-group">
              <label>Slot Type</label>
              <select value={editSlotType} onChange={(e) => setEditSlotType(e.target.value)}>
                <option value="FULL_DAY">Full Day</option>
                <option value="HALF_DAY_MORNING">Morning (Half Day)</option>
                <option value="HALF_DAY_AFTERNOON">Afternoon (Half Day)</option>
                <option value="HOURLY">Hourly</option>
              </select>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="RESERVED">RESERVED</option>
                <option value="BOOKED">BOOKED</option>
                <option value="BLOCKED">BLOCKED</option>
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Price Amount (LKR)</label>
                <input type="number" value={editPrice} onChange={(e) => setEditPrice(Number(e.target.value))} />
              </div>
              <div className="form-group">
                <label>Max Group Capacity</label>
                <input type="number" value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} />
              </div>
            </div>
            <div className="form-group">
              <label>Notes / Inclusions</label>
              <input type="text" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setEditingSlot(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSlot && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <h3 style={{ color: '#ff4d4f' }}>Confirm Delete Slot</h3>
            <p>
              Are you sure you want to delete this slot for{' '}
              <strong>{new Date(deletingSlot.startTimeUtc).toLocaleDateString()}</strong>?
            </p>
            {deletingSlot.bookedCapacity > 0 && (
              <p className="warning-text">
                ⚠️ Warning: This slot has active bookings ({deletingSlot.bookedCapacity} booked). Deletion will be rejected.
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setDeletingSlot(null)}>Cancel</button>
              <button className="btn-danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete Slot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
