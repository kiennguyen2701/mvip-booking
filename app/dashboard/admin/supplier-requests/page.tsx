import { adminClient } from '@/lib/supabase/admin';
import { approveRestaurant, rejectRestaurant } from './actions';

export default async function SupplierRequestsPage() {
  const { data: restaurants } = await adminClient
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false });

  const pending = restaurants?.filter(r => r.status === 'pending_review') || [];
  const approved = restaurants?.filter(r => r.status === 'approved') || [];
  const rejected = restaurants?.filter(r => r.status === 'rejected') || [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Supplier Requests</h1>

      {/* STATS */}
      <div className="grid grid-cols-3 gap-4">
        <Stat title="Pending" value={pending.length} />
        <Stat title="Approved" value={approved.length} />
        <Stat title="Rejected" value={rejected.length} />
      </div>

      {/* LIST */}
      <div className="space-y-4">
        {pending.map((r) => (
          <div
            key={r.id}
            className="border rounded-xl p-4 flex justify-between items-center"
          >
            <div>
              <p className="font-bold">{r.name}</p>
              <p className="text-sm text-gray-500">{r.city}</p>
            </div>

            <div className="flex gap-2">
              <form action={approveRestaurant.bind(null, r.id)}>
                <button className="bg-green-500 text-white px-4 py-2 rounded">
                  Approve
                </button>
              </form>

              <form action={rejectRestaurant.bind(null, r.id)}>
                <button className="bg-red-500 text-white px-4 py-2 rounded">
                  Reject
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded-xl p-4">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}