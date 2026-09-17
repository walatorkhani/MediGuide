export default function FacilityCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 ">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-lg skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 skeleton rounded w-2/3" />
          <div className="h-3 skeleton rounded w-1/3" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 skeleton rounded w-full" />
        <div className="h-3 skeleton rounded w-4/5" />
      </div>
      <div className="mt-4 h-9 skeleton rounded-lg" />
    </div>
  );
}
