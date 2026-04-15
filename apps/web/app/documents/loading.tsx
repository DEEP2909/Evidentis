import { PageSkeleton, TableSkeleton } from "@/components/shared/Skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-navy-950 px-4 py-6 lg:px-8">
      <div className="space-y-6">
        <PageSkeleton />
        <div className="glass">
          <TableSkeleton rows={6} />
        </div>
      </div>
    </div>
  );
}
