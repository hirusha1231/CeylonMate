import { useAuth } from '../auth/AuthProvider';
import { CapacityDeskPage } from './CapacityDeskPage';
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

  if (kind === 'agents') {
    return <ApprovalQueuePage />;
  }

  if (kind === 'capacity') {
    return <CapacityDeskPage />;
  }

  return (
    <main className="p-6 text-slate-100">
      <p className="eyebrow text-[#C5A880] text-xs font-mono font-semibold uppercase">{user?.role.replaceAll('_', ' ')}</p>
      <h1 className="text-3xl font-serif font-bold text-white mt-1">{copy[kind].title}</h1>
      <p className="lead text-stone-400 text-sm mt-2">{copy[kind].description}</p>
    </main>
  );
}
