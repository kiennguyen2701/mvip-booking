export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080704] text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <p className="text-sm font-black tracking-tight text-white">
            Mvip Booking
          </p>
          <p className="mt-1 max-w-xl text-slate-500">
            Premium supplier, agent and booking management platform.
          </p>
        </div>

        <p className="text-slate-500">
          © 2026 Mvip Booking. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
