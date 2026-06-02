"use client";

import { useState, useRef, useEffect } from "react";

export default function SupplierReportButton() {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  // Default: đầu tháng hiện tại → hôm nay
  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setFrom(`${y}-${m}-01`);
    setTo(`${y}-${m}-${d}`);
  }, []);

  // Đóng modal khi click ngoài
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
        setError("");
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleDownload() {
    if (!from || !to) { setError("Vui lòng chọn đầy đủ ngày."); return; }
    if (from > to) { setError("Ngày bắt đầu phải trước ngày kết thúc."); return; }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/supplier/report?from=${from}&to=${to}`);
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setError(json.error || "Có lỗi xảy ra, vui lòng thử lại.");
        setLoading(false);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Lấy filename từ Content-Disposition header nếu có
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = disposition.match(/filename="?([^"]+)"?/);
      a.download = match?.[1] || `mvip-report-${from}-${to}.xlsx`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setOpen(false);
    } catch {
      setError("Không thể tải file. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setError(""); }}
        className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"
      >
        <span>📊</span> Báo cáo
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div
            ref={modalRef}
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#11100c] shadow-2xl shadow-black/60"
          >
            {/* Header */}
            <div className="border-b border-white/8 px-6 py-5">
              <p className="text-xs font-black uppercase tracking-widest text-amber-400">
                Supplier Report
              </p>
              <h2 className="mt-1 text-lg font-black text-white">Tải báo cáo Excel</h2>
              <p className="mt-1 text-sm text-white/45">
                Tất cả booking (mọi trạng thái) trong khoảng thời gian đã chọn.
              </p>
            </div>

            {/* Body */}
            <div className="space-y-4 px-6 py-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-white/40 mb-2">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white outline-none transition focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/10 [color-scheme:dark]"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 border-t border-white/8 px-6 py-4">
              <button
                onClick={() => { setOpen(false); setError(""); }}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-bold text-white/50 transition hover:bg-white/5 hover:text-white"
              >
                Huỷ
              </button>
              <button
                onClick={handleDownload}
                disabled={loading}
                className="flex-1 rounded-xl bg-amber-300 py-3 text-sm font-black text-slate-950 transition hover:bg-amber-200 disabled:opacity-50"
              >
                {loading ? "Đang xuất…" : "⬇ Tải Excel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
