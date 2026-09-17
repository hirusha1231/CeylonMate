import { useAuth } from '../auth/AuthProvider';

type StaffPageKind = 'overview' | 'capacity' | 'agents' | 'admin';

const copy: Record<StaffPageKind, { title: string; description: string }> = {
  overview: {
    title: 'Staff overview',
    description: 'Your shared workspace is ready. Staff modules will appear here as they are delivered.',
  },
  capacity: {
    title: 'Capacity desk',
    description: 'Capacity tools have not been added to this shell yet.',
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
  const page = copy[kind];
  return <main>
    <p className="eyebrow">{user?.role.replaceAll('_', ' ')}</p>
    <h1>{page.title}</h1>
    <section className="empty-state" aria-label="No content yet">
      <h2>Nothing here yet</h2>
      <p>{page.description}</p>
    </section>
  </main>;
}
