import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';

export default async function BookingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!booking) return notFound();

  return (
    <main className="min-h-screen bg-[#080704] px-4 py-6 text-white md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Card */}
        <div className="w-full max-w-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#2a1c0a] to-[#0d0904] p-5 shadow-2xl shadow-black/40 md:p-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-300 text-2xl font-black text-black">
              ✓
            </div>
          </div>

          {/* Title */}
          <div className="mt-5 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-amber-300">
              Booking Confirmation
            </p>

            <h1 className="mt-2 text-2xl font-black md:text-3xl">
              Booking Created
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Your reservation has been successfully submitted.
            </p>
          </div>

          {/* Info */}
          <div className="mt-6 space-y-3">
            <Row label="Booking Code" value={booking.booking_code} />
            <Row label="Customer Name" value={booking.customer_name} />
            <Row label="Phone" value={booking.phone} />
            <Row label="WhatsApp" value={booking.whatsapp || '-'} />
            <Row label="Restaurant" value={booking.service_name} />
            <Row label="Guests" value={String(booking.number_of_guests)} />
            <Row label="Date" value={booking.booking_date} />
            <Row label="Time" value={booking.booking_time} />
          </div>

          {/* Price */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase text-slate-400">
              Total Bill Estimate
            </p>

            <p className="mt-2 text-xl font-black text-amber-300">
              {formatCurrency(booking.total_bill)}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Includes 5% customer discount
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ============================= */
/* COMPONENT ROW */
/* ============================= */

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-full flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <span className="break-words text-sm font-black text-white md:text-right">
        {value || '-'}
      </span>
    </div>
  );
}

/* ============================= */
/* UTIL */
/* ============================= */

function formatCurrency(amount: number) {
  if (!amount) return '0 VND';
  return new Intl.NumberFormat('vi-VN').format(amount) + ' VND';
}