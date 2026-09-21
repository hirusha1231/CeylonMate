import React, { useState } from 'react';

export const TransportAttractionCapacityPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'transport' | 'attractions'>('transport');

  const [transportSlots, setTransportSlots] = useState([
    {
      id: 't-1',
      optionTitle: 'Toyota KDH Luxury Van (Colombo -> Kandy)',
      vehicleType: 'VAN',
      startTimeUtc: new Date().toISOString(),
      endTimeUtc: new Date(Date.now() + 86400000).toISOString(),
      status: 'AVAILABLE',
      totalSeats: 12,
      availableSeats: 12,
      pricePerSeat: 3500,
    },
    {
      id: 't-2',
      optionTitle: 'Honda Grace Sedan (Kandy -> Sigiriya)',
      vehicleType: 'SEDAN',
      startTimeUtc: new Date().toISOString(),
      endTimeUtc: new Date(Date.now() + 86400000).toISOString(),
      status: 'AVAILABLE',
      totalSeats: 4,
      availableSeats: 4,
      pricePerSeat: 5000,
    },
  ]);

  const [attractionSlots, setAttractionSlots] = useState([
    {
      id: 'a-1',
      attractionTitle: 'Sigiriya Rock Fortress Entry Ticket Slot',
      startTimeUtc: new Date().toISOString(),
      endTimeUtc: new Date(Date.now() + 86400000).toISOString(),
      status: 'AVAILABLE',
      maxCapacity: 100,
      bookedCapacity: 15,
      priceAmount: 11500,
    },
    {
      id: 'a-2',
      attractionTitle: 'Temple of the Tooth Relic Guided Slot',
      startTimeUtc: new Date().toISOString(),
      endTimeUtc: new Date(Date.now() + 86400000).toISOString(),
      status: 'AVAILABLE',
      maxCapacity: 50,
      bookedCapacity: 0,
      priceAmount: 2000,
    },
  ]);

  const toggleTransportStatus = (id: string) => {
    setTransportSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE' } : s
      )
    );
  };

  const toggleAttractionStatus = (id: string) => {
    setAttractionSlots((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'AVAILABLE' ? 'BLOCKED' : 'AVAILABLE' } : s
      )
    );
  };

  return (
    <div className="page-container">
      <div className="header-bar">
        <div>
          <h2>Transport & Attraction Capacity Engine</h2>
          <p className="subtitle">Manage vehicle seat inventories and attraction entrance quotas</p>
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

      {activeTab === 'transport' && (
        <div className="table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Vehicle & Route</th>
                <th>Type</th>
                <th>Status</th>
                <th>Seats Available</th>
                <th>Price / Seat</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {transportSlots.map((slot) => (
                <tr key={slot.id}>
                  <td><strong>{slot.optionTitle}</strong></td>
                  <td><span className="badge-outline">{slot.vehicleType}</span></td>
                  <td>
                    <span className={`status-badge status-${slot.status.toLowerCase()}`}>
                      {slot.status}
                    </span>
                  </td>
                  <td>{slot.availableSeats} / {slot.totalSeats} seats</td>
                  <td>LKR {slot.pricePerSeat.toLocaleString()}</td>
                  <td>
                    <button
                      className={`btn-action ${slot.status === 'AVAILABLE' ? 'btn-block' : 'btn-unblock'}`}
                      onClick={() => toggleTransportStatus(slot.id)}
                    >
                      {slot.status === 'AVAILABLE' ? '⛔ Block' : '✅ Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'attractions' && (
        <div className="table-wrapper">
          <table className="glass-table">
            <thead>
              <tr>
                <th>Attraction Name</th>
                <th>Time Window</th>
                <th>Status</th>
                <th>Quota Booked</th>
                <th>Ticket Price</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {attractionSlots.map((slot) => (
                <tr key={slot.id}>
                  <td><strong>{slot.attractionTitle}</strong></td>
                  <td>{new Date(slot.startTimeUtc).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${slot.status.toLowerCase()}`}>
                      {slot.status}
                    </span>
                  </td>
                  <td>{slot.bookedCapacity} / {slot.maxCapacity} visitor tickets</td>
                  <td>LKR {slot.priceAmount.toLocaleString()}</td>
                  <td>
                    <button
                      className={`btn-action ${slot.status === 'AVAILABLE' ? 'btn-block' : 'btn-unblock'}`}
                      onClick={() => toggleAttractionStatus(slot.id)}
                    >
                      {slot.status === 'AVAILABLE' ? '⛔ Block' : '✅ Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
