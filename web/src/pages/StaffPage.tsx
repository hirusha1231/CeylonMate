import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GuideAvailabilityPage } from './GuideAvailabilityPage';
import { TransportAttractionCapacityPage } from './TransportAttractionCapacityPage';

type StaffPageKind = 'overview' | 'capacity' | 'agents' | 'admin';

const copy: Record<Exclude<StaffPageKind, 'capacity'>, { title: string; description: string }> = {
  overview: {
    title: 'Staff overview',
    description: 'Your shared workspace is ready. Staff modules will appear here as they are delivered.',
  },
  agents: {
    title: 'Agent desk',
    description: 'Travel agent tools have not been added to this shell yet.',
  },
  admin: {
    title: 'Administration',
    description: 'Administration tools have not been added to this shell yet.',
  },
};

export function StaffPage({ kind }: { kind: StaffPageKind }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'guides' | 'capacity'>('guides');

  if (kind === 'capacity') {
    return (
      <main>
        <p className="eyebrow">{user?.role.replaceAll('_', ' ')}</p>
        <h1>Capacity desk</h1>
        <div className="tab-switcher" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'guides' ? 'active' : ''}`}
            onClick={() => setActiveTab('guides')}
          >
            👨‍✈️ Guide Availability
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'capacity' ? 'active' : ''}`}
            onClick={() => setActiveTab('capacity')}
          >
            🚘 Transport & Attractions
          </button>
        </div>
        {activeTab === 'guides' ? <GuideAvailabilityPage /> : <TransportAttractionCapacityPage />}
      </main>
    );
  }

  const page = copy[kind];
  return (
    <main>
      <p className="eyebrow">{user?.role.replaceAll('_', ' ')}</p>
      <h1>{page.title}</h1>
      <section className="empty-state" aria-label="No content yet">
        <h2>Nothing here yet</h2>
        <p>{page.description}</p>
      </section>
    </main>
  );
}

