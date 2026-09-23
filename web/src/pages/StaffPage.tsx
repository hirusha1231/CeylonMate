import { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { GuideAvailabilityPage } from './GuideAvailabilityPage';
import { TransportAttractionCapacityPage } from './TransportAttractionCapacityPage';
import { ApprovalQueuePage } from './ApprovalQueuePage';

type StaffPageKind = 'overview' | 'capacity' | 'agents' | 'admin';

const copy: Record<Exclude<StaffPageKind, 'capacity'>, { title: string; description: string }> = {
  overview: {
    title: 'Staff overview',
    description: 'Your shared workspace is ready. Staff modules will appear here as they are delivered.',
  },
  agents: {
    title: 'Agent desk',
    description: 'Review pending itinerary proposals, quotation summaries, and human-in-the-loop approvals.',
  },
  admin: {
    title: 'Administration',
    description: 'Administration tools have not been added to this shell yet.',
  },
};

export function StaffPage({ kind }: { kind: StaffPageKind }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'guides' | 'capacity'>('guides');

  if (kind === 'agents') {
    return <ApprovalQueuePage />;
  }

  if (kind === 'capacity') {
    return (
      <main>
        <p className="eyebrow">{user?.role.replaceAll('_', ' ')}</p>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={activeTab === 'guides' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('guides')}
          >
            Guide Availability
          </button>
          <button
            type="button"
            className={activeTab === 'capacity' ? 'primary-button' : 'secondary-button'}
            onClick={() => setActiveTab('capacity')}
          >
            Transport & Attraction Capacity
          </button>
        </div>
        {activeTab === 'guides' ? <GuideAvailabilityPage /> : <TransportAttractionCapacityPage />}
      </main>
    );
  }

  return (
    <main>
      <p className="eyebrow">{user?.role.replaceAll('_', ' ')}</p>
      <h1>{copy[kind].title}</h1>
      <p className="lead">{copy[kind].description}</p>
    </main>
  );
}
