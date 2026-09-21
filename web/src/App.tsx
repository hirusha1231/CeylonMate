import React, { useState } from 'react';
import { GuideAvailabilityPage } from './pages/GuideAvailabilityPage';
import { TransportAttractionCapacityPage } from './pages/TransportAttractionCapacityPage';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'guides' | 'capacity'>('guides');

  return (
    <div className="app-shell">
      <nav className="navbar">
        <div className="nav-brand">
          <span className="brand-logo">🌴</span>
          <span className="brand-title">CeylonMate</span>
          <span className="sub-badge">Member 3 Domain</span>
        </div>
        <div className="nav-links">
          <button
            className={`nav-btn ${currentTab === 'guides' ? 'active' : ''}`}
            onClick={() => setCurrentTab('guides')}
          >
            👨‍✈️ Guide Availability
          </button>
          <button
            className={`nav-btn ${currentTab === 'capacity' ? 'active' : ''}`}
            onClick={() => setCurrentTab('capacity')}
          >
            🚘 Transport & Attractions
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentTab === 'guides' ? <GuideAvailabilityPage /> : <TransportAttractionCapacityPage />}
      </main>

      <footer className="footer">
        <p>CeylonMate © 2026 — Highly Concurrent Capacity & Availability Subsystem (Member 3)</p>
      </footer>
    </div>
  );
};

export default App;
