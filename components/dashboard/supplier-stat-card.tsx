type SupplierStatCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

export function SupplierStatCard({
  label,
  value,
  helper,
}: SupplierStatCardProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}